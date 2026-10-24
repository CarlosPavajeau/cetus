package com.cantte.cetus.ubl.model;

import jakarta.xml.bind.annotation.XmlElement;
import jakarta.xml.bind.annotation.XmlRootElement;
import jakarta.xml.bind.annotation.XmlType;
import java.util.ArrayList;
import java.util.List;

/** Root element of a credit note (CreditNote-2). Unlike the invoice, the schema has no root DueDate. */
@XmlRootElement(name = "CreditNote", namespace = Ns.CREDIT_NOTE)
@XmlType(
        name = "CreditNote",
        propOrder = {
            "ublExtensions",
            "ublVersionId",
            "customizationId",
            "profileId",
            "profileExecutionId",
            "id",
            "uuid",
            "issueDate",
            "issueTime",
            "creditNoteTypeCode",
            "notes",
            "documentCurrencyCode",
            "lineCountNumeric",
            "discrepancyResponse",
            "billingReference",
            "supplier",
            "customer",
            "paymentMeans",
            "taxTotals",
            "legalMonetaryTotal",
            "creditNoteLines"
        })
public class UblCreditNote extends UblNote {

    @XmlElement(name = "CreditNoteTypeCode", namespace = Ns.CBC)
    public String creditNoteTypeCode;

    @XmlElement(name = "LegalMonetaryTotal", namespace = Ns.CAC)
    public Cac.MonetaryTotal legalMonetaryTotal;

    @XmlElement(name = "CreditNoteLine", namespace = Ns.CAC)
    public List<Cac.CreditNoteLine> creditNoteLines = new ArrayList<>();
}
