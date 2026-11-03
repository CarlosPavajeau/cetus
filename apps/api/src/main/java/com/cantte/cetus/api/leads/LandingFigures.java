package com.cantte.cetus.api.leads;

import com.cantte.cetus.api.billing.VatThresholds;
import com.cantte.cetus.api.leads.LeadViews.LandingView;
import com.cantte.cetus.api.leads.LeadViews.ObligationCapView;
import com.cantte.cetus.cache.Cache;
import com.cantte.cetus.cache.Caches;
import jakarta.annotation.PostConstruct;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneId;

/**
 * The figures behind the landing's trust band: LIVE documents the DIAN accepted, and issuers that had one accepted
 * lately. They count every account, so each replica keeps them for a while instead of scanning on every visit.
 */
@ApplicationScoped
public class LandingFigures {

    static final Duration TTL = Duration.ofMinutes(10);
    static final int ACTIVE_DAYS = 90;

    private static final String KEY = "landing";
    private static final ZoneId BOGOTA = ZoneId.of("America/Bogota");

    @Inject
    Caches caches;

    @Inject
    EntityManager em;

    @Inject
    VatThresholds vatThresholds;

    private Cache<String, LandingView> cache;

    @PostConstruct
    void init() {
        cache = caches.local("landing-figures", 1, TTL);
    }

    public LandingView current() {
        return cache.get(KEY, this::load);
    }

    private LandingView load() {
        Object[] row = (Object[]) em.createNativeQuery("""
                        SELECT count(*),
                               count(DISTINCT issuer_id) FILTER (WHERE issue_date >= :activeSince)
                        FROM billing.documents
                        WHERE environment = 'LIVE' AND status = 'ACCEPTED'
                        """)
                .setParameter("activeSince", LocalDate.now(BOGOTA).minusDays(ACTIVE_DAYS))
                .getSingleResult();
        ObligationCapView cap = vatThresholds
                .current()
                .map(threshold -> new ObligationCapView(threshold.uvtValueCop(), threshold.uvt()))
                .orElse(null);
        return new LandingView(((Number) row[0]).longValue(), ((Number) row[1]).longValue(), cap);
    }
}
