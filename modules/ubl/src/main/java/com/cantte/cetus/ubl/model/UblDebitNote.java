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
@XmlType(
        name = "DebitNote",
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
            "notes",
            "documentCurrencyCode",
            "lineCountNumeric",
            "discrepancyResponse",
            "billingReference",
            "supplier",
            "customer",
            "paymentMeans",
            "taxTotals",
            "requestedMonetaryTotal",
            "debitNoteLines"
        })
public class UblDebitNote extends UblNote {

    @XmlElement(name = "RequestedMonetaryTotal", namespace = Ns.CAC)
    public Cac.MonetaryTotal requestedMonetaryTotal;

    @XmlElement(name = "DebitNoteLine", namespace = Ns.CAC)
    public List<Cac.DebitNoteLine> debitNoteLines = new ArrayList<>();
}
