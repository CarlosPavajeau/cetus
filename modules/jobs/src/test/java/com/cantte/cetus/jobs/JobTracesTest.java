package com.cantte.cetus.jobs;

import static org.assertj.core.api.Assertions.assertThat;

import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.SpanContext;
import io.opentelemetry.api.trace.SpanId;
import io.opentelemetry.api.trace.TraceFlags;
import io.opentelemetry.api.trace.TraceId;
import io.opentelemetry.api.trace.TraceState;
import io.opentelemetry.context.Context;
import java.util.concurrent.ThreadLocalRandom;
import org.junit.jupiter.api.Test;

class JobTracesTest {

    @Test
    void theJobContinuesTheTraceThatEnqueuedIt() {
        ThreadLocalRandom random = ThreadLocalRandom.current();
        SpanContext enqueuing = SpanContext.create(
                TraceId.fromLongs(random.nextLong(), random.nextLong() | 1),
                SpanId.fromLong(random.nextLong() | 1),
                TraceFlags.getSampled(),
                TraceState.getDefault());

        String traceparent = JobTraces.traceparent(Context.root().with(Span.wrap(enqueuing)));
        SpanContext parent = Span.fromContext(JobTraces.parent(traceparent)).getSpanContext();

        assertThat(parent.getTraceId()).isEqualTo(enqueuing.getTraceId());
        assertThat(parent.getSpanId()).isEqualTo(enqueuing.getSpanId());
        assertThat(parent.isSampled()).isTrue();
        assertThat(parent.isRemote()).isTrue();
    }

    @Test
    void withoutASpanTheJobStartsItsOwnTrace() {
        assertThat(JobTraces.traceparent(Context.root())).isNull();
        assertThat(JobTraces.parent(null)).isSameAs(Context.root());
    }
}
