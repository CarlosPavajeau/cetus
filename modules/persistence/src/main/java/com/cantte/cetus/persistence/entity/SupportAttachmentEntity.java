package com.cantte.cetus.persistence.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.LockModeType;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

/** A file attached to a support ticket, stored in S3 under support/; see V28. */
@Entity
@Table(name = "support_attachments")
public class SupportAttachmentEntity extends PanacheEntityBase {

    @Id
    public UUID id;

    @Column(name = "account_id")
    public UUID accountId;

    /** Null while the ticket it was uploaded for is still being written. */
    @Column(name = "ticket_id")
    public UUID ticketId;

    @Column(name = "file_name")
    public String fileName;

    @Column(name = "content_type")
    public String contentType;

    public int size;

    @Column(name = "storage_key")
    public String storageKey;

    @Column(name = "created_at", insertable = false, updatable = false)
    public OffsetDateTime createdAt;

    /** The account's attachments among {@code ids} that no ticket took yet, locked so only one ticket takes them. */
    public static List<SupportAttachmentEntity> lockUnlinked(UUID accountId, Collection<UUID> ids) {
        return find("accountId = ?1 and ticketId is null and id in ?2", accountId, ids)
                .withLock(LockModeType.PESSIMISTIC_WRITE)
                .list();
    }

    public static List<SupportAttachmentEntity> listByTicket(UUID ticketId) {
        return list("ticketId = ?1 order by id", ticketId);
    }

    public static List<SupportAttachmentEntity> listByTickets(Collection<UUID> ticketIds) {
        return ticketIds.isEmpty() ? List.of() : list("ticketId in ?1 order by id", ticketIds);
    }

    public static long countByAccountSince(UUID accountId, OffsetDateTime since) {
        return count("accountId = ?1 and createdAt >= ?2", accountId, since);
    }
}
