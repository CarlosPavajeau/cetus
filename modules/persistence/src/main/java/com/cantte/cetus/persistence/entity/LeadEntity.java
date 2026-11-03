package com.cantte.cetus.persistence.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** An email left on a public page; see V46. */
@Entity
@Table(name = "leads")
public class LeadEntity extends PanacheEntityBase {

    public enum Kind {
        CALCULATOR,
        PARTNER,
        INTEGRATION
    }

    /** The integrations on the landing's "Próximamente" row. */
    public enum Integration {
        WOOCOMMERCE,
        SHOPIFY,
        AUTOMATIONS,
        PAYMENTS
    }

    /** What the partner form asks besides the email. */
    public record PartnerDetails(String name, String company, String phone, int companies, String message) {}

    public record IntegrationDetails(Integration integration) {}

    @Id
    public UUID id;

    @Enumerated(EnumType.STRING)
    public Kind kind;

    public String email;

    /** {@code InvoicingObligation.Answers}, {@link PartnerDetails} or {@link IntegrationDetails}, by kind. */
    @JdbcTypeCode(SqlTypes.JSON)
    public Map<String, Object> details = new HashMap<>();

    /** The privacy policy version the person authorized. */
    @Column(name = "policy_version")
    public String policyVersion;

    public String ip;

    @Column(name = "created_at", insertable = false, updatable = false)
    public OffsetDateTime createdAt;

    public static long countByIpSince(String ip, OffsetDateTime since) {
        return ip == null
                ? count("ip is null and createdAt >= ?1", since)
                : count("ip = ?1 and createdAt >= ?2", ip, since);
    }

    public static long countByEmailSince(Kind kind, String email, OffsetDateTime since) {
        return count("kind = ?1 and lower(email) = lower(?2) and createdAt >= ?3", kind, email, since);
    }
}
