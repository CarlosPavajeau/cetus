package com.cantte.cetus.jobs;

import io.opentelemetry.api.trace.propagation.W3CTraceContextPropagator;
import io.opentelemetry.context.Context;
import io.opentelemetry.context.propagation.TextMapGetter;
import java.util.HashMap;
import java.util.Map;

/** Carries a trace through the jobs table as a W3C traceparent, so a job continues the trace that enqueued it. */
public final class JobTraces {

    private static final String TRACEPARENT = "traceparent";

    private static final TextMapGetter<Map<String, String>> GETTER = new TextMapGetter<>() {
        @Override
        public Iterable<String> keys(Map<String, String> carrier) {
            return carrier.keySet();
        }

        @Override
        public String get(Map<String, String> carrier, String key) {
            return carrier == null ? null : carrier.get(key);
        }
    };

    private JobTraces() {}

    /** The traceparent of the context's span; null without a valid one. */
    public static String traceparent(Context context) {
        Map<String, String> carrier = new HashMap<>();
        W3CTraceContextPropagator.getInstance().inject(context, carrier, Map::put);
        return carrier.get(TRACEPARENT);
    }

    /** A root context holding the remote span of the traceparent; just the root without one. */
    public static Context parent(String traceparent) {
        if (traceparent == null) {
            return Context.root();
        }
        return W3CTraceContextPropagator.getInstance()
                .extract(Context.root(), Map.of(TRACEPARENT, traceparent), GETTER);
    }
}
