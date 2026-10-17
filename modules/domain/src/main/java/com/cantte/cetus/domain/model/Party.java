package com.cantte.cetus.domain.model;

import java.util.List;

/**
 * Supplier or customer as it appears on the document. Stored as an immutable snapshot.
 *
 * @param checkDigit    verification digit, only for NIT
 * @param taxLevelCodes fiscal responsibilities (e.g. O-13, O-15, R-99-PN)
 * @param taxSchemeId   01 (IVA) or ZZ (not applicable)
 */
public record Party(
        PersonType personType,
        IdentificationType identificationType,
        String identificationNumber,
        String checkDigit,
        String legalName,
        String tradeName,
        List<String> taxLevelCodes,
        String taxSchemeId,
        String taxSchemeName,
        Address address,
        String email,
        String phone) {

    public Party {
        taxLevelCodes = taxLevelCodes == null ? List.of() : List.copyOf(taxLevelCodes);
    }
}
