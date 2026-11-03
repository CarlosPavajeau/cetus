package com.cantte.cetus.api.leads;

import com.cantte.cetus.api.audit.RequestOriginResolver;
import com.cantte.cetus.api.error.ProblemDetail;
import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.jobs.JobQueue;
import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.persistence.entity.LeadEntity;
import com.cantte.cetus.persistence.entity.LeadEntity.Kind;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.WebApplicationException;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Locale;
import java.util.Map;

/**
 * Emails left on the public pages, with no account behind them. Anyone can send one, so each IP and each address
 * has a quota; the worker then tells the Cetus team and, depending on the form, answers the person.
 */
@ApplicationScoped
public class Leads {

    static final Duration IP_WINDOW = Duration.ofHours(1);
    static final int PER_IP = 10;
    static final Duration EMAIL_WINDOW = Duration.ofDays(1);
    static final int PER_EMAIL = 3;

    private static final TypeReference<Map<String, Object>> MAP = new TypeReference<>() {};

    @Inject
    JobQueue jobs;

    @Inject
    RequestOriginResolver origin;

    @Inject
    ObjectMapper mapper;

    @Transactional(Transactional.TxType.MANDATORY)
    public LeadEntity create(Kind kind, String email, String policyVersion, Object details) {
        OffsetDateTime now = OffsetDateTime.now();
        String ip = origin.resolve().ipAddress();
        String address = email.strip();
        lockQuota("leads:ip:" + ip);
        checkNotTooMany(LeadEntity.countByIpSince(ip, now.minus(IP_WINDOW)), PER_IP);
        lockQuota("leads:email:" + address.toLowerCase(Locale.ROOT));
        checkNotTooMany(LeadEntity.countByEmailSince(kind, address, now.minus(EMAIL_WINDOW)), PER_EMAIL);

        LeadEntity lead = new LeadEntity();
        lead.id = Ids.newId();
        lead.kind = kind;
        lead.email = address;
        lead.details = mapper.convertValue(details, MAP);
        lead.policyVersion = policyVersion;
        lead.ip = ip;
        lead.persist();
        jobs.enqueue(JobTypes.SEND_LEAD, lead.id);
        return lead;
    }

    /** IP first, then address, in every request, so two requests never wait on each other's locks. */
    private static void lockQuota(String key) {
        LeadEntity.getEntityManager()
                .createNativeQuery("SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(:key, 0))")
                .setParameter("key", key)
                .getSingleResult();
    }

    private static void checkNotTooMany(long count, int limit) {
        if (count >= limit) {
            throw new TooMany();
        }
    }

    public static class TooMany extends WebApplicationException {

        TooMany() {
            super(ProblemDetail.builder(429, "leads_too_many", "Too many requests from this address or IP")
                    .header("Retry-After", Duration.ofMinutes(30).toSeconds())
                    .build());
        }
    }
}
