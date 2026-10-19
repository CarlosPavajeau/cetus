package com.cantte.cetus.persistence.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** One call to the DIAN for a document, successful or not. */
@Entity
@Table(name = "dian_submissions")
public class DianSubmissionEntity extends PanacheEntityBase {

    @Id
    public UUID id;
    @Column(name = "document_id")
    public UUID documentId;
    public String operation;
    @Column(name = "track_id")
    public String trackId;
    @Column(name = "timed_out")
    public boolean timedOut;
    @Column(name = "is_valid")
    public Boolean valid;
    @Column(name = "status_code")
    public String statusCode;
    @Column(name = "status_message")
    public String statusMessage;
    @JdbcTypeCode(SqlTypes.JSON)
    public List<String> errors = new ArrayList<>();
    @Column(name = "duration_ms")
    public Integer durationMs;

    /**
     * True when the last send may have reached the DIAN without us receiving the answer: a timeout,
     * an I/O error, an HTTP error or a SOAP fault. The DIAN may still have registered the document.
     */
    public static boolean lastSendUnanswered(UUID documentId) {
        Optional<DianSubmissionEntity> last = find("documentId = ?1 and operation in ('SendBillSync', 'SendTestSetAsync') "
                + "order by createdAt desc", documentId).firstResultOptional();
        return last.map(s -> s.valid == null && s.trackId == null).orElse(false);
    }

    @Column(name = "created_at", insertable = false, updatable = false)
    public java.time.OffsetDateTime createdAt;
}
