package com.cantte.cetus.api.documents;

import java.util.List;
import java.util.UUID;

/** What credit and debit note requests share: the invoice they correct and why. */
public interface CorrectionRequest {

    UUID invoiceId();

    Enum<?> concept();

    String description();

    String externalReference();

    List<String> notes();
}
