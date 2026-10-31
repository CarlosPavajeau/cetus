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
    ISSUERS_OVER_LIMIT(Set.of(Category.BILLING));

    private final Set<Category> categories;

    NotificationKind(Set<Category> categories) {
        this.categories = categories;
    }

    public Set<Category> categories() {
        return categories;
    }
}
