package com.cantte.cetus.domain.model;

import java.time.LocalDate;

/** The invoice a note corrects (cac:BillingReference/cac:InvoiceDocumentReference). */
public record BillingReference(String number, String cufe, LocalDate issueDate) {}
