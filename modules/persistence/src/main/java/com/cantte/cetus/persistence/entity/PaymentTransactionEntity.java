package com.cantte.cetus.persistence.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** A payment attempt of an order as the gateway reports it; see V35. */
@Entity
@Table(name = "payment_transactions")
public class PaymentTransactionEntity extends PanacheEntityBase {

    public enum Provider {
        WOMPI
    }

    public enum Status {
        PENDING,
        APPROVED,
        DECLINED,
        VOIDED,
        ERROR
    }

    @Id
    public UUID id;

    @Column(name = "order_id")
    public UUID orderId;

    @Enumerated(EnumType.STRING)
    public Provider provider;

    @Column(name = "provider_transaction_id")
    public String providerTransactionId;

    @Enumerated(EnumType.STRING)
    public Status status;

    @Column(name = "amount_cents")
    public long amountCents;

    public String currency;

    @Column(name = "payment_method_type")
    public String paymentMethodType;

    @Column(name = "status_message")
    public String statusMessage;

    @JdbcTypeCode(SqlTypes.JSON)
    public String raw;

    @Column(name = "provider_created_at")
    public OffsetDateTime providerCreatedAt;

    @Column(name = "finalized_at")
    public OffsetDateTime finalizedAt;

    @Column(name = "created_at", insertable = false, updatable = false)
    public OffsetDateTime createdAt;

    @Column(name = "updated_at")
    public OffsetDateTime updatedAt = OffsetDateTime.now();

    @PreUpdate
    void touch() {
        updatedAt = OffsetDateTime.now();
    }

    public static Optional<PaymentTransactionEntity> findByProviderId(Provider provider, String providerTransactionId) {
        return find("provider = ?1 and providerTransactionId = ?2", provider, providerTransactionId)
                .firstResultOptional();
    }

    public static List<PaymentTransactionEntity> listByOrder(UUID orderId) {
        return list("orderId = ?1 order by providerCreatedAt", orderId);
    }
}
