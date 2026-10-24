package com.cantte.cetus.persistence;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import java.util.UUID;

/** Atomic per-issuer/year counter for DIAN file names. */
@ApplicationScoped
public class FileSequence {

    @Inject
    EntityManager em;

    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public long next(UUID issuerId, int year) {
        Object value = em.createNativeQuery("""
                        INSERT INTO billing.issuer_file_counters (issuer_id, year, last_value)
                        VALUES (:issuer, :year, 1)
                        ON CONFLICT (issuer_id, year)
                        DO UPDATE SET last_value = billing.issuer_file_counters.last_value + 1
                        RETURNING last_value
                        """)
                .setParameter("issuer", issuerId)
                .setParameter("year", year)
                .getSingleResult();
        return ((Number) value).longValue();
    }
}
