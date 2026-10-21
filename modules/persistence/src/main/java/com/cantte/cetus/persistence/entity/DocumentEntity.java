package com.cantte.cetus.persistence.entity;

import com.cantte.cetus.domain.model.CorrectionConcept;
import com.cantte.cetus.domain.model.DocumentStatus;
import com.cantte.cetus.domain.model.DocumentType;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.domain.model.Party;
import com.cantte.cetus.domain.model.PaymentInfo;
import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.LockModeType;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Query;
import jakarta.persistence.Table;
import org.hibernate.annotations.Generated;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.generator.EventType;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Entity
@Table(name = "documents")
public class DocumentEntity extends PanacheEntityBase {

    @Id
    public UUID id;
    @Column(name = "account_id")
    public UUID accountId;
    @Column(name = "issuer_id")
    public UUID issuerId;
    @Enumerated(EnumType.STRING)
    public Environment environment;
    @Enumerated(EnumType.STRING)
    @Column(name = "document_type")
    public DocumentType documentType;
    @Column(name = "operation_type")
    public String operationType = "10";
    @Column(name = "numbering_range_id")
    public UUID numberingRangeId;
    public String prefix;
    public long number;
    @Column(name = "issue_date")
    public LocalDate issueDate;
    @Column(name = "issue_time")
    public LocalTime issueTime;
    @Column(name = "due_date")
    public LocalDate dueDate;
    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(length = 3)
    public String currency = "COP";
    @JdbcTypeCode(SqlTypes.JSON)
    public Party customer;
    @JdbcTypeCode(SqlTypes.JSON)
    public PaymentInfo payment;
    @Column(name = "line_extension_amount")
    public BigDecimal lineExtensionAmount;
    @Column(name = "tax_exclusive_amount")
    public BigDecimal taxExclusiveAmount;
    @Column(name = "tax_inclusive_amount")
    public BigDecimal taxInclusiveAmount;
    @Column(name = "allowance_total_amount")
    public BigDecimal allowanceTotalAmount = BigDecimal.ZERO;
    @Column(name = "charge_total_amount")
    public BigDecimal chargeTotalAmount = BigDecimal.ZERO;
    @Column(name = "prepaid_amount")
    public BigDecimal prepaidAmount = BigDecimal.ZERO;
    @Column(name = "payable_amount")
    public BigDecimal payableAmount;
    /** The invoice a note corrects. */
    @Column(name = "referenced_document_id")
    public UUID referencedDocumentId;
    /** Name of the note's {@link CorrectionConcept}; read it with {@link #concept()}. */
    @Column(name = "correction_concept")
    public String correctionConcept;
    @Column(name = "correction_description")
    public String correctionDescription;
    /** CUFE for invoices, CUDE for notes. */
    public String cufe;
    @Column(name = "dian_track_id")
    public String dianTrackId;
    @Enumerated(EnumType.STRING)
    public DocumentStatus status = DocumentStatus.RECEIVED;
    @Column(name = "dian_status_code")
    public String dianStatusCode;
    @Column(name = "dian_status_message")
    public String dianStatusMessage;
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "dian_errors")
    public List<String> dianErrors = new ArrayList<>();
    @Column(name = "validated_at")
    public OffsetDateTime validatedAt;
    @JdbcTypeCode(SqlTypes.JSON)
    public List<String> notes = new ArrayList<>();
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "request_payload")
    public String requestPayload;
    @Column(name = "external_reference")
    public String externalReference;
    /** Set by the database; read back after the insert, so it is available once the entity is flushed. */
    @Generated(event = EventType.INSERT)
    @Column(name = "created_at", insertable = false, updatable = false)
    public OffsetDateTime createdAt;
    @Column(name = "updated_at")
    public OffsetDateTime updatedAt = OffsetDateTime.now();

    @OneToMany(mappedBy = "document", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("lineNumber")
    public List<DocumentLineEntity> lines = new ArrayList<>();

    @OneToMany(mappedBy = "document", cascade = CascadeType.ALL, orphanRemoval = true)
    public List<DocumentTaxEntity> taxes = new ArrayList<>();

    @PreUpdate
    void touch() {
        updatedAt = OffsetDateTime.now();
    }

    public String fullNumber() {
        return prefix + number;
    }

    /** The issuer's test documents created since {@code since}, counted by type and status. */
    public static List<StatusCount> countTestDocuments(UUID issuerId, OffsetDateTime since) {
        return getEntityManager().createQuery("""
                        select new com.cantte.cetus.persistence.entity.DocumentEntity$StatusCount(
                            d.documentType, d.status, count(d))
                        from DocumentEntity d
                        where d.issuerId = :issuerId and d.environment = :environment and d.createdAt >= :since
                        group by d.documentType, d.status""", StatusCount.class)
                .setParameter("issuerId", issuerId)
                .setParameter("environment", Environment.TEST)
                .setParameter("since", since)
                .getResultList();
    }

    public record StatusCount(DocumentType documentType, DocumentStatus status, long count) {
    }

    public static Optional<DocumentEntity> findForAccount(UUID accountId, UUID documentId, Environment environment) {
        return find("id = ?1 and accountId = ?2 and environment = ?3", documentId, accountId, environment)
                .firstResultOptional();
    }

    /** The document, locked until the transaction ends. Serializes the notes created against an invoice. */
    public static Optional<DocumentEntity> lockForAccount(UUID accountId, UUID documentId, Environment environment) {
        return find("id = ?1 and accountId = ?2 and environment = ?3", documentId, accountId, environment)
                .withLock(LockModeType.PESSIMISTIC_WRITE)
                .firstResultOptional();
    }

    /** The correction concept of a note, or null for an invoice. */
    public CorrectionConcept concept() {
        return CorrectionConcept.of(documentType, correctionConcept);
    }

    /** Notes of the type that reference the invoice, oldest first. */
    public static List<DocumentEntity> notesFor(UUID invoiceId, DocumentType type) {
        return list("referencedDocumentId = ?1 and documentType = ?2 order by createdAt, number", invoiceId, type);
    }

    /**
     * What credit notes can still take from the invoice: its payable amount plus its accepted debit notes,
     * minus the credit notes that count against it.
     */
    public static BigDecimal creditableBalance(DocumentEntity invoice) {
        return invoice.payableAmount.add(acceptedDebitTotal(invoice.id)).subtract(committedCreditTotal(invoice.id));
    }

    /**
     * Total of the credit notes that count against the invoice: accepted ones and those still in
     * flight. Rejected or failed notes never reached the DIAN as valid documents, so they free their amount.
     */
    public static BigDecimal committedCreditTotal(UUID invoiceId) {
        BigDecimal total = getEntityManager().createQuery("""
                        select coalesce(sum(d.payableAmount), 0)
                        from DocumentEntity d
                        where d.referencedDocumentId = :invoiceId and d.documentType = :type
                          and d.status not in (:rejected, :failed)""", BigDecimal.class)
                .setParameter("invoiceId", invoiceId)
                .setParameter("type", DocumentType.CREDIT_NOTE)
                .setParameter("rejected", DocumentStatus.REJECTED)
                .setParameter("failed", DocumentStatus.FAILED)
                .getSingleResult();
        return total == null ? BigDecimal.ZERO : total;
    }

    /**
     * Total of the debit notes accepted against the invoice. Only accepted ones count, since a debit note
     * still in flight may be rejected and would then never have raised the invoice.
     */
    public static BigDecimal acceptedDebitTotal(UUID invoiceId) {
        BigDecimal total = getEntityManager().createQuery("""
                        select coalesce(sum(d.payableAmount), 0)
                        from DocumentEntity d
                        where d.referencedDocumentId = :invoiceId and d.documentType = :type
                          and d.status = :accepted""", BigDecimal.class)
                .setParameter("invoiceId", invoiceId)
                .setParameter("type", DocumentType.DEBIT_NOTE)
                .setParameter("accepted", DocumentStatus.ACCEPTED)
                .getSingleResult();
        return total == null ? BigDecimal.ZERO : total;
    }

    /**
     * What the text search matches: the number, the external reference and the customer's identification and
     * name, joined by newlines (a search cannot contain one, so no match spans two fields). Identical to the
     * expression of idx_documents_search (V14), so the trigram index serves it.
     */
    static final String SEARCH_TEXT = "(d.prefix || d.number::text || E'\\n' || coalesce(d.external_reference, '')"
            + " || E'\\n' || coalesce(d.customer ->> 'identificationNumber', '')"
            + " || E'\\n' || coalesce(d.customer ->> 'legalName', ''))";

    /** Optional criteria of {@link #pageForAccount}; null fields do not filter. */
    public record Search(Environment environment, DocumentType type, DocumentStatus status, UUID issuerId,
                         LocalDate issuedFrom, LocalDate issuedTo, String text) {
    }

    /**
     * The account's documents, newest first, paginated by id (UUID v7, so creation order): pass the last id
     * of the previous page as {@code beforeId}. {@code text} matches the number, the external reference and
     * the customer's identification or name.
     */
    @SuppressWarnings("unchecked")
    public static List<DocumentEntity> pageForAccount(UUID accountId, Search search, UUID beforeId, int limit) {
        StringBuilder sql = new StringBuilder("SELECT d.* FROM billing.documents d WHERE d.account_id = :account");
        if (search.environment() != null) {
            sql.append(" AND d.environment = :environment");
        }
        if (search.type() != null) {
            sql.append(" AND d.document_type = :type");
        }
        if (search.status() != null) {
            sql.append(" AND d.status = :status");
        }
        if (search.issuerId() != null) {
            sql.append(" AND d.issuer_id = :issuer");
        }
        if (search.issuedFrom() != null) {
            sql.append(" AND d.issue_date >= :from");
        }
        if (search.issuedTo() != null) {
            sql.append(" AND d.issue_date <= :to");
        }
        String text = search.text() == null ? "" : search.text().strip();
        if (!text.isEmpty()) {
            sql.append(" AND ").append(SEARCH_TEXT).append(" ILIKE :text");
        }
        if (beforeId != null) {
            sql.append(" AND d.id < :before");
        }
        sql.append(" ORDER BY d.id DESC LIMIT :limit");

        Query query = getEntityManager().createNativeQuery(sql.toString(), DocumentEntity.class)
                .setParameter("account", accountId)
                .setParameter("limit", limit);
        if (search.environment() != null) {
            query.setParameter("environment", search.environment().name());
        }
        if (search.type() != null) {
            query.setParameter("type", search.type().name());
        }
        if (search.status() != null) {
            query.setParameter("status", search.status().name());
        }
        if (search.issuerId() != null) {
            query.setParameter("issuer", search.issuerId());
        }
        if (search.issuedFrom() != null) {
            query.setParameter("from", search.issuedFrom());
        }
        if (search.issuedTo() != null) {
            query.setParameter("to", search.issuedTo());
        }
        if (!text.isEmpty()) {
            query.setParameter("text", "%" + text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%");
        }
        if (beforeId != null) {
            query.setParameter("before", beforeId);
        }
        return query.getResultList();
    }
}
