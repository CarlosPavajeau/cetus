package com.cantte.cetus.persistence.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.LockModeType;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** A card an account saved to pay its renewals; see V40. */
@Entity
@Table(name = "payment_methods")
public class PaymentMethodEntity extends PanacheEntityBase {

    public enum Provider {
        WOMPI
    }

    public enum Type {
        CARD
    }

    public enum Status {
        ACTIVE,
        REMOVED
    }

    @Id
    public UUID id;

    @Column(name = "account_id")
    public UUID accountId;

    @Enumerated(EnumType.STRING)
    public Provider provider;

    /** The provider's id of the payment source, what a charge names. */
    @Column(name = "provider_source_id")
    public String providerSourceId;

    @Enumerated(EnumType.STRING)
    public Type type;

    public String brand;

    @Column(name = "last_four")
    public String lastFour;

    @Column(name = "exp_month")
    public int expMonth;

    @Column(name = "exp_year")
    public int expYear;

    /** Who the provider knows the card's owner by: the billing email when the card was saved. */
    @Column(name = "customer_email")
    public String customerEmail;

    @Enumerated(EnumType.STRING)
    public Status status;

    @Column(name = "created_at", updatable = false)
    public OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "removed_at")
    public OffsetDateTime removedAt;

    /** The last month the card can be charged in. */
    public YearMonth expiry() {
        return YearMonth.of(expYear, expMonth);
    }

    /** How a notice or a screen names the card, such as "VISA ••4242". */
    public String label() {
        return brand + " ••" + lastFour;
    }

    public static Optional<PaymentMethodEntity> findActive(UUID accountId) {
        return find("accountId = ?1 and status = ?2", accountId, Status.ACTIVE).firstResultOptional();
    }

    /** {@link #findActive}, locked until the transaction ends. */
    public static Optional<PaymentMethodEntity> lockActive(UUID accountId) {
        return find("accountId = ?1 and status = ?2", accountId, Status.ACTIVE)
                .withLock(LockModeType.PESSIMISTIC_WRITE)
                .firstResultOptional();
    }

    /** The active cards of subscribed accounts that cannot be charged after {@code last}. */
    public static List<PaymentMethodEntity> listExpiringBy(YearMonth last) {
        return list("""
                status = ?1 and (expYear < ?2 or (expYear = ?2 and expMonth <= ?3))
                and accountId in (select s.accountId from SubscriptionEntity s where s.status <> ?4)
                order by id
                """, Status.ACTIVE, last.getYear(), last.getMonthValue(), SubscriptionEntity.Status.CANCELED);
    }
}
