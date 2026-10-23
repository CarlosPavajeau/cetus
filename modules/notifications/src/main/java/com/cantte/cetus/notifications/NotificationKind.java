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
    ACCOUNT_SUSPENDED(Set.of(Category.BILLING));

    private final Set<Category> categories;

    NotificationKind(Set<Category> categories) {
        this.categories = categories;
    }

    public Set<Category> categories() {
        return categories;
    }
}
