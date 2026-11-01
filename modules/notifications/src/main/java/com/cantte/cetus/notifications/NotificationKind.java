package com.cantte.cetus.notifications;

import com.cantte.cetus.persistence.entity.AccountContactEntity.Category;
import java.util.Set;

/** What a notice reports, and which contacts receive it. */
public enum NotificationKind {
    /** The link that verifies a contact's new address; it goes to that address, not to a category. */
    CONTACT_VERIFICATION(Set.of()),
    WEBHOOK_FAILING(Set.of(Category.TECHNICAL)),
    WEBHOOK_DISABLED(Set.of(Category.TECHNICAL)),
    CERTIFICATE_EXPIRING(Set.of(Category.FISCAL)),
    RANGE_RUNNING_OUT(Set.of(Category.FISCAL)),
    RESOLUTION_EXPIRING(Set.of(Category.FISCAL)),
    REJECTIONS_SPIKE(Set.of(Category.FISCAL, Category.TECHNICAL)),
    ACCOUNT_SUSPENDED(Set.of(Category.BILLING)),
    /**
     * The month's billable documents reached 80 % or 100 % of the plan's quota. No longer requested, since credits
     * replaced the monthly quota; kept so the notices already queued still go out.
     */
    PLAN_USAGE(Set.of(Category.BILLING)),
    /** The account used 80 % or 95 % of the credits of its lots in force. */
    CREDITS_USAGE(Set.of(Category.BILLING)),
    /** The account ran out of credits and issues within its package's grace margin. */
    CREDITS_GRACE(Set.of(Category.BILLING)),
    /** The account has more production issuers than its products include, after a package expired. */
    ISSUERS_OVER_LIMIT(Set.of(Category.BILLING)),
    /** A subscription period closed: the order that renews it, with the closed period's overage, waits to be paid. */
    SUBSCRIPTION_RENEWAL(Set.of(Category.BILLING)),
    /** The renewal is still unpaid days after the period started; the subscription is canceled after the grace. */
    SUBSCRIPTION_PAST_DUE(Set.of(Category.BILLING)),
    /** The subscription ended, unpaid or as its owner chose; the lots already granted keep their validity. */
    SUBSCRIPTION_CANCELED(Set.of(Category.BILLING)),
    /** The subscription's period ran up 50 % or 100 % of its overage limit. */
    SUBSCRIPTION_OVERAGE(Set.of(Category.BILLING)),
    /** A subscription period closed and its renewal, with the closed period's overage, is charged to the saved card. */
    SUBSCRIPTION_CHARGE_SCHEDULED(Set.of(Category.BILLING)),
    /** The saved card was declined for the renewal; it is tried again, or the renewal waits to be paid otherwise. */
    SUBSCRIPTION_CHARGE_FAILED(Set.of(Category.BILLING)),
    /** The card that pays the renewals expires this month or the next, or already did. */
    PAYMENT_METHOD_EXPIRING(Set.of(Category.BILLING)),
    /** Money of a paid order went back to the customer; the order's unused documents were revoked. */
    ORDER_REFUNDED(Set.of(Category.BILLING)),
    /** The account owes what it consumed and did not pay; new purchases wait until it is paid. */
    ACCOUNT_DEBT(Set.of(Category.BILLING));

    private final Set<Category> categories;

    NotificationKind(Set<Category> categories) {
        this.categories = categories;
    }

    public Set<Category> categories() {
        return categories;
    }
}
