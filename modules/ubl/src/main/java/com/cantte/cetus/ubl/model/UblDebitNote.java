package com.cantte.cetus.ubl.model;

import jakarta.xml.bind.annotation.XmlElement;
import jakarta.xml.bind.annotation.XmlRootElement;
import jakarta.xml.bind.annotation.XmlType;

import java.util.ArrayList;
import java.util.List;

/**
 * Root element of a debit note (DebitNote-2). Unlike the credit note, the schema has no type code, and its
 * totals are a RequestedMonetaryTotal.
 */
@XmlRootElement(name = "DebitNote", namespace = Ns.DEBIT_NOTE)
@XmlType(name = "DebitNote", propOrder = {"ublExtensions", "ublVersionId", "customizationId", "profileId",
        "profileExecutionId", "id", "uuid", "issueDate", "issueTime", "notes",
        "documentCurrencyCode", "lineCountNumeric", "discrepancyResponse", "billingReference", "supplier",
        "customer", "paymentMeans", "taxTotals", "requestedMonetaryTotal", "debitNoteLines"})
public class UblDebitNote {

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
    @XmlElement(name = "Note", namespace = Ns.CBC)
    public List<String> notes = new ArrayList<>();
    @XmlElement(name = "DocumentCurrencyCode", namespace = Ns.CBC)
    public String documentCurrencyCode;
    @XmlElement(name = "LineCountNumeric", namespace = Ns.CBC)
    public Integer lineCountNumeric;
    @XmlElement(name = "DiscrepancyResponse", namespace = Ns.CAC)
    public Cac.DiscrepancyResponse discrepancyResponse;
    @XmlElement(name = "BillingReference", namespace = Ns.CAC)
    public Cac.BillingReference billingReference;
    @XmlElement(name = "AccountingSupplierParty", namespace = Ns.CAC)
    public Cac.PartyRole supplier;
    @XmlElement(name = "AccountingCustomerParty", namespace = Ns.CAC)
    public Cac.PartyRole customer;
    @XmlElement(name = "PaymentMeans", namespace = Ns.CAC)
    public List<Cac.PaymentMeans> paymentMeans = new ArrayList<>();
    @XmlElement(name = "TaxTotal", namespace = Ns.CAC)
    public List<Cac.TaxTotal> taxTotals = new ArrayList<>();
    @XmlElement(name = "RequestedMonetaryTotal", namespace = Ns.CAC)
    public Cac.MonetaryTotal requestedMonetaryTotal;
    @XmlElement(name = "DebitNoteLine", namespace = Ns.CAC)
    public List<Cac.DebitNoteLine> debitNoteLines = new ArrayList<>();
}
