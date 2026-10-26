package com.cantte.cetus.worker.support;

import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.StatusCode;
import io.opentelemetry.api.trace.Tracer;
import io.opentelemetry.context.Scope;
import java.util.function.Supplier;

/** Spans around a step of a job. */
public final class Spans {

    private Spans() {}

    /**
     * Runs the work in a span of its own, marked as an error when it throws. Only the exception's type is
     * recorded: messages can carry customer data, and the job's log already has them.
     */
    public static <T> T traced(Tracer tracer, String name, Supplier<T> work) {
        Span span = tracer.spanBuilder(name).startSpan();
        try (Scope ignored = span.makeCurrent()) {
            return work.get();
        } catch (RuntimeException e) {
            span.setStatus(StatusCode.ERROR, e.getClass().getSimpleName());
            throw e;
        } finally {
            span.end();
        }
    }
}
