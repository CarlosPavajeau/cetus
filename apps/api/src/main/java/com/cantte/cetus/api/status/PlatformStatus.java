package com.cantte.cetus.api.status;

import com.cantte.cetus.api.status.StatusViews.ComponentStatus;
import com.cantte.cetus.api.status.StatusViews.ComponentView;
import com.cantte.cetus.api.status.StatusViews.IncidentView;
import com.cantte.cetus.api.status.StatusViews.PlatformStatusView;
import com.cantte.cetus.cache.Cache;
import com.cantte.cetus.cache.Caches;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.persistence.entity.StatusIncidentEntity;
import com.cantte.cetus.persistence.entity.StatusIncidentEntity.StatusComponent;
import jakarta.annotation.PostConstruct;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/**
 * The platform's health as customers see it: the DIAN fails when its calls go unanswered, processing lags when
 * jobs wait, and the Cetus team's open incidents raise their component. The thresholds match the Grafana alerts
 * "DIAN con fallas" and "Cola atascada" (infra/grafana/alerts.json).
 */
@ApplicationScoped
public class PlatformStatus {

    static final Duration DIAN_WINDOW = Duration.ofMinutes(10);
    static final int DIAN_CALLS_MIN = 5;
    static final double DIAN_FAILURE_SHARE = 0.2;
    static final Duration QUEUE_WAIT_MAX = Duration.ofMinutes(5);
    static final Duration RESOLVED_SHOWN = Duration.ofDays(7);

    private static final String KEY = "status";

    @Inject
    Caches caches;

    @Inject
    EntityManager em;

    private Cache<String, PlatformStatusView> cache;

    @PostConstruct
    void init() {
        cache = caches.local("platform-status", 1, Duration.ofSeconds(30));
    }

    public PlatformStatusView current() {
        return cache.get(KEY, this::load);
    }

    /** After an incident changes; other replicas see it when their entry expires. */
    public void invalidate() {
        cache.invalidate(KEY);
    }

    private PlatformStatusView load() {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        Map<StatusComponent, ComponentStatus> statuses = new EnumMap<>(StatusComponent.class);
        Arrays.stream(StatusComponent.values()).forEach(c -> statuses.put(c, ComponentStatus.OPERATIONAL));
        if (queueLagging()) {
            statuses.put(StatusComponent.PROCESSING, ComponentStatus.DEGRADED);
        }
        dianFailing().forEach(environment -> statuses.put(dianComponent(environment), ComponentStatus.DEGRADED));
        List<StatusIncidentEntity> incidents = StatusIncidentEntity.recent(now.minus(RESOLVED_SHOWN));
        incidents.stream()
                .filter(incident -> incident.resolvedAt == null)
                .forEach(incident -> statuses.merge(
                        incident.component, ComponentStatus.of(incident.impact), ComponentStatus::worst));
        List<ComponentView> components = statuses.entrySet().stream()
                .map(entry -> new ComponentView(entry.getKey(), entry.getValue()))
                .toList();
        ComponentStatus overall =
                statuses.values().stream().reduce(ComponentStatus.OPERATIONAL, ComponentStatus::worst);
        return new PlatformStatusView(
                overall, components, incidents.stream().map(IncidentView::from).toList(), now);
    }

    private boolean queueLagging() {
        Object oldest = em.createNativeQuery("""
                        SELECT min(run_at) < now() - make_interval(secs => :wait)
                        FROM billing.jobs WHERE status = 'PENDING' AND run_at <= now()""")
                .setParameter("wait", QUEUE_WAIT_MAX.toSeconds())
                .getSingleResult();
        return Boolean.TRUE.equals(oldest);
    }

    /** Only the sends count: a status check that fails is retried with the send, and SANDBOX never calls out. */
    @SuppressWarnings("unchecked")
    private List<Environment> dianFailing() {
        List<Object[]> rows = em.createNativeQuery("""
                        SELECT d.environment, count(*), count(s.error_kind)
                        FROM billing.dian_submissions s
                        JOIN billing.documents d ON d.id = s.document_id
                        WHERE s.created_at >= now() - make_interval(secs => :window)
                          AND s.operation IN ('SendBillSync', 'SendTestSetAsync')
                          AND d.environment IN ('LIVE', 'TEST')
                        GROUP BY d.environment""")
                .setParameter("window", DIAN_WINDOW.toSeconds())
                .getResultList();
        return rows.stream()
                .filter(row -> {
                    long calls = ((Number) row[1]).longValue();
                    long failures = ((Number) row[2]).longValue();
                    return calls >= DIAN_CALLS_MIN && failures > calls * DIAN_FAILURE_SHARE;
                })
                .map(row -> Environment.valueOf((String) row[0]))
                .toList();
    }

    private static StatusComponent dianComponent(Environment environment) {
        return switch (environment) {
            case LIVE -> StatusComponent.DIAN_LIVE;
            case TEST -> StatusComponent.DIAN_TEST;
            case SANDBOX -> throw new IllegalStateException("SANDBOX never calls the DIAN");
        };
    }
}
