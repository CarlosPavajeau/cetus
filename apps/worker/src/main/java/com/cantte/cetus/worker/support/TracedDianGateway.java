package com.cantte.cetus.worker.support;

import com.cantte.cetus.dian.DianFaultException;
import com.cantte.cetus.dian.DianGateway;
import com.cantte.cetus.dian.DianOperation;
import com.cantte.cetus.dian.DianResponse;
import com.cantte.cetus.dian.DianTransportException;
import com.cantte.cetus.dian.NumberingRangeResponse;
import com.cantte.cetus.dian.UploadResponse;
import com.cantte.cetus.signing.KeyMaterial;
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.SpanKind;
import io.opentelemetry.api.trace.StatusCode;
import io.opentelemetry.api.trace.Tracer;
import io.opentelemetry.context.Scope;
import java.util.List;
import java.util.function.BiConsumer;
import java.util.function.Supplier;

/**
 * A {@code dian.call} span around each operation, marked as an error when the DIAN fails or does not
 * validate. {@link com.cantte.cetus.dian.DianSoapClient} uses the JDK's HttpClient, which nothing
 * instruments, and dian-client stays free of telemetry.
 */
final class TracedDianGateway implements DianGateway {

    private final DianGateway delegate;
    private final Tracer tracer;

    TracedDianGateway(DianGateway delegate, Tracer tracer) {
        this.delegate = delegate;
        this.tracer = tracer;
    }

    DianGateway delegate() {
        return delegate;
    }

    @Override
    public DianResponse sendBillSync(String zipFileName, byte[] zip, KeyMaterial keys) {
        return call(
                DianOperation.SEND_BILL_SYNC,
                () -> delegate.sendBillSync(zipFileName, zip, keys),
                TracedDianGateway::describe);
    }

    @Override
    public UploadResponse sendTestSetAsync(String zipFileName, byte[] zip, String testSetId, KeyMaterial keys) {
        return call(
                DianOperation.SEND_TEST_SET_ASYNC,
                () -> delegate.sendTestSetAsync(zipFileName, zip, testSetId, keys),
                (span, upload) -> {
                    if (upload.zipKey() == null) {
                        span.setStatus(StatusCode.ERROR, "No ZipKey");
                    } else {
                        span.setAttribute("dian.track_id", upload.zipKey());
                    }
                });
    }

    @Override
    public DianResponse getStatus(String trackId, KeyMaterial keys) {
        return call(
                DianOperation.GET_STATUS,
                () -> delegate.getStatus(trackId, keys),
                (span, response) -> describe(span.setAttribute("dian.track_id", trackId), response));
    }

    @Override
    public List<DianResponse> getStatusZip(String zipKey, KeyMaterial keys) {
        return call(DianOperation.GET_STATUS_ZIP, () -> delegate.getStatusZip(zipKey, keys), (span, responses) -> {
            span.setAttribute("dian.track_id", zipKey);
            boolean valid = !responses.isEmpty() && responses.stream().allMatch(DianResponse::valid);
            span.setAttribute("dian.valid", valid);
            if (!valid) {
                span.setStatus(StatusCode.ERROR, "Not valid");
            }
        });
    }

    @Override
    public NumberingRangeResponse getNumberingRange(
            String accountCode, String accountCodeT, String softwareCode, KeyMaterial keys) {
        return call(
                DianOperation.GET_NUMBERING_RANGE,
                () -> delegate.getNumberingRange(accountCode, accountCodeT, softwareCode, keys),
                (span, response) -> {
                    span.setAttribute("dian.status_code", String.valueOf(response.operationCode()));
                    if (!response.succeeded()) {
                        span.setStatus(StatusCode.ERROR, "Not succeeded");
                    }
                });
    }

    private <T> T call(DianOperation operation, Supplier<T> request, BiConsumer<Span, T> describe) {
        Span span = tracer.spanBuilder("dian.call")
                .setSpanKind(SpanKind.CLIENT)
                .setAttribute("dian.operation", operation.operationName())
                .startSpan();
        try (Scope ignored = span.makeCurrent()) {
            T result = request.get();
            describe.accept(span, result);
            return result;
        } catch (DianTransportException e) {
            span.setAttribute("dian.timed_out", e.isTimeout());
            span.setStatus(StatusCode.ERROR, e.isTimeout() ? "Timeout" : "Transport");
            throw e;
        } catch (DianFaultException e) {
            span.setStatus(StatusCode.ERROR, e.getMessage());
            throw e;
        } catch (RuntimeException e) {
            span.setStatus(StatusCode.ERROR, e.getClass().getSimpleName());
            throw e;
        } finally {
            span.end();
        }
    }

    private static void describe(Span span, DianResponse response) {
        span.setAttribute("dian.valid", response.valid());
        if (response.statusCode() != null) {
            span.setAttribute("dian.status_code", response.statusCode());
        }
        if (!response.valid()) {
            span.setStatus(StatusCode.ERROR, "Not valid");
        }
    }
}
