package com.cantte.cetus.api.telemetry;

import com.cantte.cetus.domain.model.DocumentType;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import jakarta.annotation.Priority;
import jakarta.inject.Inject;
import jakarta.ws.rs.Priorities;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.container.ContainerResponseContext;
import jakarta.ws.rs.container.ContainerResponseFilter;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.Provider;
import java.time.Duration;
import java.util.Map;

/**
 * How long the API takes to accept a document, for the creation SLO (p95 under 500 ms). http.server.requests
 * cannot carry it: the OpenTelemetry bridge fixes a metric's buckets with the first route it sees, and buckets on
 * every route would multiply its series.
 */
@Provider
@Priority(Priorities.AUTHENTICATION - 2)
public class DocumentCreationTimer implements ContainerRequestFilter, ContainerResponseFilter {

    private static final String STARTED_NANOS = DocumentCreationTimer.class.getName() + ".startedNanos";
    private static final Map<String, DocumentType> CREATION = Map.of(
            "/v1/invoices", DocumentType.INVOICE,
            "/v1/credit-notes", DocumentType.CREDIT_NOTE,
            "/v1/debit-notes", DocumentType.DEBIT_NOTE);
    private static final Duration[] BUCKETS = {
        Duration.ofMillis(100),
        Duration.ofMillis(250),
        Duration.ofMillis(500),
        Duration.ofSeconds(1),
        Duration.ofMillis(2500),
        Duration.ofSeconds(5)
    };

    @Inject
    MeterRegistry meters;

    @Override
    public void filter(ContainerRequestContext request) {
        if ("POST".equals(request.getMethod())
                && CREATION.containsKey(request.getUriInfo().getPath())) {
            request.setProperty(STARTED_NANOS, System.nanoTime());
        }
    }

    /** Only accepted documents: a rejected request says nothing about how long creating one takes. */
    @Override
    public void filter(ContainerRequestContext request, ContainerResponseContext response) {
        if (!(request.getProperty(STARTED_NANOS) instanceof Long started)
                || response.getStatusInfo().getFamily() != Response.Status.Family.SUCCESSFUL) {
            return;
        }
        Timer.builder("cetus.documents.creation.duration")
                .tag(
                        "document.type",
                        CREATION.get(request.getUriInfo().getPath()).name())
                .serviceLevelObjectives(BUCKETS)
                .register(meters)
                .record(Duration.ofNanos(System.nanoTime() - started));
    }
}
