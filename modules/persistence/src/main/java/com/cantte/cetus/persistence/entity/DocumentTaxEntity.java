package com.cantte.cetus.persistence.entity;

import com.cantte.cetus.domain.model.TaxType;
import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.util.UUID;

/** Tax of a line (line set) or a document-level subtotal (line null). */
@Entity
@Table(name = "document_taxes")
public class DocumentTaxEntity extends PanacheEntityBase {

    @Id
    public UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_id")
    public DocumentEntity document;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "line_id")
    public DocumentLineEntity line;

    @Enumerated(EnumType.STRING)
    @Column(name = "tax_type")
    public TaxType taxType;

    @Column(name = "taxable_amount")
    public BigDecimal taxableAmount;

    public BigDecimal percent;

    @Column(name = "tax_amount")
    public BigDecimal taxAmount;
}
