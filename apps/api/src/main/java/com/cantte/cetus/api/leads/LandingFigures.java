package com.cantte.cetus.api.leads;

import com.cantte.cetus.api.billing.VatThresholds;
import com.cantte.cetus.api.leads.LeadViews.CourtesyView;
import com.cantte.cetus.api.leads.LeadViews.LandingView;
import com.cantte.cetus.api.leads.LeadViews.ObligationCapView;
import com.cantte.cetus.cache.Cache;
import com.cantte.cetus.cache.Caches;
import com.cantte.cetus.credits.Courtesy;
import jakarta.annotation.PostConstruct;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneId;

/**
 * The figures behind the landing's trust band: LIVE documents the DIAN accepted, and issuers that had one accepted
 * lately. They count every account, so each replica keeps them for a while instead of scanning on every visit. The
 * courtesy slots left are read on every visit: a visitor must not count on a slot that is gone.
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

    @Inject
    Courtesy courtesy;

    private Cache<String, Counts> cache;

    private record Counts(long acceptedDocuments, long activeIssuers) {}

    @PostConstruct
    void init() {
        cache = caches.local("landing-figures", 1, TTL);
    }

    public LandingView current() {
        Counts counts = cache.get(KEY, this::load);
        ObligationCapView cap = vatThresholds
                .current()
                .map(threshold -> new ObligationCapView(threshold.uvtValueCop(), threshold.uvt()))
                .orElse(null);
        CourtesyView courtesyView = courtesy.offer()
                .map(offer -> new CourtesyView(
                        offer.slots(), offer.slotsRemaining(), offer.documents(), offer.validityDays()))
                .orElse(null);
        return new LandingView(counts.acceptedDocuments(), counts.activeIssuers(), cap, courtesyView);
    }

    private Counts load() {
        Object[] row = (Object[]) em.createNativeQuery("""
                        SELECT count(*),
                               count(DISTINCT issuer_id) FILTER (WHERE issue_date >= :activeSince)
                        FROM billing.documents
                        WHERE environment = 'LIVE' AND status = 'ACCEPTED'
                        """)
                .setParameter("activeSince", LocalDate.now(BOGOTA).minusDays(ACTIVE_DAYS))
                .getSingleResult();
        return new Counts(((Number) row[0]).longValue(), ((Number) row[1]).longValue());
    }
}
