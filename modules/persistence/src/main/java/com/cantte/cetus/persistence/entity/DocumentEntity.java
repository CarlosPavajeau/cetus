package com.cantte.cetus.persistence.entity;

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
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PreUpdate;
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

    public static Optional<DocumentEntity> findForAccount(UUID accountId, UUID documentId, Environment environment) {
        return find("id = ?1 and accountId = ?2 and environment = ?3", documentId, accountId, environment)
                .firstResultOptional();
    }
}
