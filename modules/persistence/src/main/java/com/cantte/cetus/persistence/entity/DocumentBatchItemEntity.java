package com.cantte.cetus.persistence.entity;

import com.cantte.cetus.domain.model.LineInput;
import com.cantte.cetus.domain.model.Party;
import com.cantte.cetus.domain.model.PaymentInfo;
import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** One invoice of a batch, at its position; see V60. */
@Entity
@Table(name = "document_batch_items")
@IdClass(DocumentBatchItemEntity.Key.class)
public class DocumentBatchItemEntity extends PanacheEntityBase {

    @Id
    @Column(name = "batch_id")
    public UUID batchId;

    @Id
    public int position;

    public String reference;

    /** The invoice as the API resolved it; null once it has its document or the expansion stopped. */
    @JdbcTypeCode(SqlTypes.JSON)
    public Payload payload;

    /**
     * An invoice with the catalogs already applied: what the document copies.
     *
     * @param request the item as received, which the document keeps as its request
     */
    public record Payload(
            Party customer,
            PaymentInfo payment,
            LocalDate dueDate,
            String currency,
            List<LineInput> lines,
            List<String> notes,
            String request) {}

    public static class Key implements Serializable {

        public UUID batchId;
        public int position;

        @Override
        public boolean equals(Object other) {
            return other instanceof Key key && position == key.position && Objects.equals(batchId, key.batchId);
        }

        @Override
        public int hashCode() {
            return Objects.hash(batchId, position);
        }
    }

    /** The batch's items still waiting for their document, in order of position, at most {@code limit}. */
    public static List<DocumentBatchItemEntity> listPending(UUID batchId, int limit) {
        return find("batchId = ?1 and payload is not null order by position", batchId)
                .page(0, limit)
                .list();
    }

    /** Clears the payload of the items left without a document, once the expansion stops. */
    public static int clearPending(UUID batchId) {
        return update("payload = null where batchId = ?1 and payload is not null", batchId);
    }

    public static List<DocumentBatchItemEntity> listByBatch(UUID batchId) {
        return list("batchId = ?1 order by position", batchId);
    }
}
