package com.cantte.cetus.persistence.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/** An opinion or idea shared from the console's help page; see V28. */
@Entity
@Table(name = "feedback")
public class FeedbackEntity extends PanacheEntityBase {

    @Id
    public UUID id;

    @Column(name = "account_id")
    public UUID accountId;

    @Column(name = "user_id")
    public String userId;

    @Column(name = "user_email")
    public String userEmail;

    public String message;

    /** The console page it was sent from. */
    public String page;

    @Column(name = "created_at", insertable = false, updatable = false)
    public OffsetDateTime createdAt;

    /** Newest first, paginated by id (UUID v7). */
    public static List<FeedbackEntity> page(UUID beforeId, int limit) {
        return beforeId == null
                ? find("order by id desc").page(0, limit).list()
                : find("id < ?1 order by id desc", beforeId).page(0, limit).list();
    }

    public static long countByUserSince(String userId, OffsetDateTime since) {
        return count("userId = ?1 and createdAt >= ?2", userId, since);
    }
}
