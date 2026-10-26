package com.cantte.cetus.worker.support;

import com.cantte.cetus.dian.DianFaultException;
import com.cantte.cetus.dian.DianGateway;
import com.cantte.cetus.dian.DianOperation;
import com.cantte.cetus.dian.DianResponse;
import com.cantte.cetus.dian.DianTransportException;
import com.cantte.cetus.dian.NumberingRangeResponse;
import com.cantte.cetus.dian.UploadResponse;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.signing.KeyMaterial;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.SpanKind;
import io.opentelemetry.api.trace.StatusCode;
import io.opentelemetry.api.trace.Tracer;
import io.opentelemetry.context.Scope;
import java.time.Duration;
import java.util.List;
import java.util.function.Supplier;

/**
 * A {@code dian.call} span around each operation, marked as an error when the DIAN fails or does not
 * validate, and the latency and errors of each operation as metrics. {@link com.cantte.cetus.dian.DianSoapClient}
 * uses the JDK's HttpClient, which nothing instruments, and dian-client stays free of telemetry.
 */
final class InstrumentedDianGateway implements DianGateway {

    /** What the DIAN usually takes, up to the request timeout; each bucket is one more series. */
    static final Duration[] DURATION_BUCKETS = {
        Duration.ofMillis(500),
        Duration.ofSeconds(1),
        Duration.ofSeconds(2),
        Duration.ofSeconds(5),
        Duration.ofSeconds(10),
        Duration.ofSeconds(30),
        Duration.ofSeconds(60)
    };

    private final DianGateway delegate;
    /** SANDBOX's simulator answers too: kept apart, so it never hides how the real DIAN is doing. */
    private final Environment environment;

    private final Tracer tracer;
    private final MeterRegistry meters;

    InstrumentedDianGateway(DianGateway delegate, Environment environment, Tracer tracer, MeterRegistry meters) {
        this.delegate = delegate;
        this.environment = environment;
        this.tracer = tracer;
        this.meters = meters;
    }

    DianGateway delegate() {
        return delegate;
    }

    @Override
    public DianResponse sendBillSync(String zipFileName, byte[] zip, KeyMaterial keys) {
        return call(
                DianOperation.SEND_BILL_SYNC,
                () -> delegate.sendBillSync(zipFileName, zip, keys),
                InstrumentedDianGateway::validated);
    }

    @Override
    public UploadResponse sendTestSetAsync(String zipFileName, byte[] zip, String testSetId, KeyMaterial keys) {
        return call(
                DianOperation.SEND_TEST_SET_ASYNC,
                () -> delegate.sendTestSetAsync(zipFileName, zip, testSetId, keys),
                (span, upload) -> {
                    if (upload.zipKey() == null) {
                        span.setStatus(StatusCode.ERROR, "No ZipKey");
                        return false;
                    }
                    span.setAttribute("dian.track_id", upload.zipKey());
                    return true;
                });
    }

    @Override
    public DianResponse getStatus(String trackId, KeyMaterial keys) {
        return call(
                DianOperation.GET_STATUS,
                () -> delegate.getStatus(trackId, keys),
                (span, response) -> validated(span.setAttribute("dian.track_id", trackId), response));
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
            return valid;
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
                    return response.succeeded();
                });
    }

    private <T> T call(DianOperation operation, Supplier<T> request, Description<T> describe) {
        Span span = tracer.spanBuilder("dian.call")
                .setSpanKind(SpanKind.CLIENT)
                .setAttribute("dian.operation", operation.operationName())
                .startSpan();
        long start = System.nanoTime();
        String outcome = "error";
        try (Scope ignored = span.makeCurrent()) {
            T result = request.get();
            outcome = describe.validated(span, result) ? "valid" : "invalid";
            return result;
        } catch (DianTransportException e) {
            span.setAttribute("dian.timed_out", e.isTimeout());
            span.setStatus(StatusCode.ERROR, e.isTimeout() ? "Timeout" : "Transport");
            error(operation, e.isTimeout() ? "timeout" : "transport");
            throw e;
        } catch (DianFaultException e) {
            span.setStatus(StatusCode.ERROR, e.getMessage());
            error(operation, "fault");
            throw e;
        } catch (RuntimeException e) {
            span.setStatus(StatusCode.ERROR, e.getClass().getSimpleName());
            error(operation, "other");
            throw e;
        } finally {
            span.end();
            Timer.builder("cetus.dian.request.duration")
                    .tag("dian.operation", operation.operationName())
                    .tag("environment", environment.name())
                    .tag("outcome", outcome)
                    .serviceLevelObjectives(DURATION_BUCKETS)
                    .register(meters)
                    .record(Duration.ofNanos(System.nanoTime() - start));
        }
    }

    private void error(DianOperation operation, String kind) {
        Counter.builder("cetus.dian.request.errors")
                .tag("dian.operation", operation.operationName())
                .tag("environment", environment.name())
                .tag("error.kind", kind)
                .register(meters)
                .increment();
    }

    private static boolean validated(Span span, DianResponse response) {
        span.setAttribute("dian.valid", response.valid());
        if (response.statusCode() != null) {
            span.setAttribute("dian.status_code", response.statusCode());
        }
        if (!response.valid()) {
            span.setStatus(StatusCode.ERROR, "Not valid");
        }
        return response.valid();
    }

    /** Describes the DIAN's answer on the span and tells whether it validated what it was asked. */
    @FunctionalInterface
    private interface Description<T> {
        boolean validated(Span span, T result);
    }
}
