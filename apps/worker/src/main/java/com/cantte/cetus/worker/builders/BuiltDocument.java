package com.cantte.cetus.worker.builders;

import org.w3c.dom.Document;

/**
 * @param unsigned   UBL DOM, ready to receive the signature
 * @param uniqueCode CUFE for invoices, CUDE for notes
 */
public record BuiltDocument(Document unsigned, String uniqueCode) {}
