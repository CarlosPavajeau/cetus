package com.cantte.cetus.domain.model;

/**
 * Postal address following DIAN codes.
 *
 * @param municipalityCode DIVIPOLA municipality code (e.g. 11001 for Bogotá)
 * @param departmentCode   DIVIPOLA department code (e.g. 11)
 * @param countryCode      ISO 3166-1 alpha-2 (CO)
 */
public record Address(
        String municipalityCode,
        String cityName,
        String departmentCode,
        String departmentName,
        String postalCode,
        String line,
        String countryCode,
        String countryName) {}
