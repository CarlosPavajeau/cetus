package com.cantte.cetus.ubl.model;

import jakarta.xml.bind.annotation.XmlElement;
import jakarta.xml.bind.annotation.XmlRootElement;
import jakarta.xml.bind.annotation.XmlType;

import java.util.ArrayList;
import java.util.List;

/** Root element of a sales invoice (Invoice-2). */
@XmlRootElement(name = "Invoice", namespace = Ns.INVOICE)
@XmlType(name = "Invoice", propOrder = {"ublExtensions", "ublVersionId", "customizationId", "profileId",
        "profileExecutionId", "id", "uuid", "issueDate", "issueTime", "dueDate", "invoiceTypeCode", "notes",
        "documentCurrencyCode", "lineCountNumeric", "supplier", "customer", "paymentMeans", "taxTotals",
        "legalMonetaryTotal", "invoiceLines"})
public class UblInvoice {

    @XmlElement(name = "UBLExtensions", namespace = Ns.EXT)
    public Ext.UblExtensions ublExtensions;
    @XmlElement(name = "UBLVersionID", namespace = Ns.CBC)
    public String ublVersionId;
    @XmlElement(name = "CustomizationID", namespace = Ns.CBC)
    public String customizationId;
    @XmlElement(name = "ProfileID", namespace = Ns.CBC)
    public String profileId;
    @XmlElement(name = "ProfileExecutionID", namespace = Ns.CBC)
    public String profileExecutionId;
    @XmlElement(name = "ID", namespace = Ns.CBC)
    public String id;
    @XmlElement(name = "UUID", namespace = Ns.CBC)
    public IdentifierType uuid;
    @XmlElement(name = "IssueDate", namespace = Ns.CBC)
    public String issueDate;
    @XmlElement(name = "IssueTime", namespace = Ns.CBC)
    public String issueTime;
    @XmlElement(name = "DueDate", namespace = Ns.CBC)
    public String dueDate;
    @XmlElement(name = "InvoiceTypeCode", namespace = Ns.CBC)
    public String invoiceTypeCode;
    @XmlElement(name = "Note", namespace = Ns.CBC)
    public List<String> notes = new ArrayList<>();
    @XmlElement(name = "DocumentCurrencyCode", namespace = Ns.CBC)
    public String documentCurrencyCode;
    @XmlElement(name = "LineCountNumeric", namespace = Ns.CBC)
    public Integer lineCountNumeric;
    @XmlElement(name = "AccountingSupplierParty", namespace = Ns.CAC)
    public Cac.PartyRole supplier;
    @XmlElement(name = "AccountingCustomerParty", namespace = Ns.CAC)
    public Cac.PartyRole customer;
    @XmlElement(name = "PaymentMeans", namespace = Ns.CAC)
    public List<Cac.PaymentMeans> paymentMeans = new ArrayList<>();
    @XmlElement(name = "TaxTotal", namespace = Ns.CAC)
    public List<Cac.TaxTotal> taxTotals = new ArrayList<>();
    @XmlElement(name = "LegalMonetaryTotal", namespace = Ns.CAC)
    public Cac.MonetaryTotal legalMonetaryTotal;
    @XmlElement(name = "InvoiceLine", namespace = Ns.CAC)
    public List<Cac.InvoiceLine> invoiceLines = new ArrayList<>();
}
