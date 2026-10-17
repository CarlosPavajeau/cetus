package com.cantte.cetus.persistence.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "document_lines")
public class DocumentLineEntity extends PanacheEntityBase {

    @Id
    public UUID id;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_id")
    public DocumentEntity document;
    @Column(name = "line_number")
    public int lineNumber;
    @Column(name = "item_code")
    public String itemCode;
    public String description;
    public BigDecimal quantity;
    @Column(name = "unit_code")
    public String unitCode;
    @Column(name = "unit_price")
    public BigDecimal unitPrice;
    @Column(name = "line_extension_amount")
    public BigDecimal lineExtensionAmount;
}
