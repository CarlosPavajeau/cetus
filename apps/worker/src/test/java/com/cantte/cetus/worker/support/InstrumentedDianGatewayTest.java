package com.cantte.cetus.worker.support;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.cantte.cetus.dian.DianFaultException;
import com.cantte.cetus.dian.DianGateway;
import com.cantte.cetus.dian.DianResponse;
import com.cantte.cetus.dian.DianTransportException;
import com.cantte.cetus.dian.NumberingRangeResponse;
import com.cantte.cetus.dian.UploadResponse;
import com.cantte.cetus.signing.KeyMaterial;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import io.opentelemetry.api.common.AttributeKey;
import io.opentelemetry.api.trace.StatusCode;
import io.opentelemetry.sdk.testing.exporter.InMemorySpanExporter;
import io.opentelemetry.sdk.trace.SdkTracerProvider;
import io.opentelemetry.sdk.trace.data.SpanData;
import io.opentelemetry.sdk.trace.export.SimpleSpanProcessor;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

class InstrumentedDianGatewayTest {

    private static final String FAULT_REASON = "Documento con NIT 900123456 no autorizado";

    private final InMemorySpanExporter spans = InMemorySpanExporter.create();
    private final SdkTracerProvider provider = SdkTracerProvider.builder()
            .addSpanProcessor(SimpleSpanProcessor.create(spans))
            .build();
    private final SimpleMeterRegistry meters = new SimpleMeterRegistry();
    private final DianGateway gateway = new InstrumentedDianGateway(new Unreachable(), provider.get("test"), meters);

    @AfterEach
    void close() {
        provider.close();
    }

    @Test
    void aTimeoutMarksTheCallAsAnError() {
        assertThatThrownBy(() -> gateway.sendBillSync("doc.zip", new byte[0], null))
                .isInstanceOf(DianTransportException.class);

        SpanData span = spans.getFinishedSpanItems().getFirst();
        assertThat(span.getName()).isEqualTo("dian.call");
        assertThat(span.getAttributes().get(AttributeKey.stringKey("dian.operation")))
                .isEqualTo("SendBillSync");
        assertThat(span.getAttributes().get(AttributeKey.booleanKey("dian.timed_out")))
                .isTrue();
        assertThat(span.getStatus().getStatusCode()).isEqualTo(StatusCode.ERROR);
        assertThat(meters.get("cetus.dian.request.errors")
                        .tags("dian.operation", "SendBillSync", "error.kind", "timeout")
                        .counter()
                        .count())
                .isEqualTo(1);
        assertThat(meters.get("cetus.dian.request.duration")
                        .tags("dian.operation", "SendBillSync", "outcome", "error")
                        .timer()
                        .count())
                .isEqualTo(1);
    }

    @Test
    void aFaultKeepsItsCodeButNotTheDiansText() {
        assertThatThrownBy(() -> gateway.sendTestSetAsync("doc.zip", new byte[0], "set", null))
                .isInstanceOf(DianFaultException.class);

        SpanData span = spans.getFinishedSpanItems().getFirst();
        assertThat(span.getStatus().getStatusCode()).isEqualTo(StatusCode.ERROR);
        assertThat(span.getStatus().getDescription()).isEqualTo("Fault s:Client");
    }

    @Test
    void aDocumentTheDianDoesNotValidateIsAnError() {
        String trackId = UUID.randomUUID().toString();

        DianResponse response = gateway.getStatus(trackId, null);

        assertThat(response.valid()).isFalse();
        SpanData span = spans.getFinishedSpanItems().getFirst();
        assertThat(span.getAttributes().get(AttributeKey.stringKey("dian.track_id")))
                .isEqualTo(trackId);
        assertThat(span.getAttributes().get(AttributeKey.stringKey("dian.status_code")))
                .isEqualTo("99");
        assertThat(span.getAttributes().get(AttributeKey.booleanKey("dian.valid")))
                .isFalse();
        assertThat(span.getStatus().getStatusCode()).isEqualTo(StatusCode.ERROR);
        assertThat(meters.get("cetus.dian.request.duration")
                        .tags("dian.operation", "GetStatus", "outcome", "invalid")
                        .timer()
                        .count())
                .isEqualTo(1);
        assertThat(meters.find("cetus.dian.request.errors").counters()).isEmpty();
    }

    /** Times out on sync sends, faults on test sets and does not validate anything it is asked about. */
    private static final class Unreachable implements DianGateway {

        @Override
        public DianResponse sendBillSync(String zipFileName, byte[] zip, KeyMaterial keys) {
            throw new DianTransportException("Timed out", true, null);
        }

        @Override
        public UploadResponse sendTestSetAsync(String zipFileName, byte[] zip, String testSetId, KeyMaterial keys) {
            throw new DianFaultException("s:Client", List.of(), FAULT_REASON, "<xml/>");
        }

        @Override
        public DianResponse getStatus(String trackId, KeyMaterial keys) {
            return new DianResponse(false, "99", "Rejected", null, List.of("Rule failed"), null, null, "<xml/>");
        }

        @Override
        public List<DianResponse> getStatusZip(String zipKey, KeyMaterial keys) {
            return List.of(getStatus(zipKey, keys));
        }

        @Override
        public NumberingRangeResponse getNumberingRange(
                String accountCode, String accountCodeT, String softwareCode, KeyMaterial keys) {
            return new NumberingRangeResponse("500", "Not found", List.of(), "<xml/>");
        }
    }
}
