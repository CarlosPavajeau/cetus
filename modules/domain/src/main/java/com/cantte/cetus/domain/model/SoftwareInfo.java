package com.cantte.cetus.domain.model;

/**
 * Software provider data for the DIAN extensions.
 *
 * @param providerNit  NIT of the software provider (the issuer itself for "software propio")
 * @param securityCode SHA-384(SoftwareID + PIN + document number)
 */
public record SoftwareInfo(String providerNit, String providerCheckDigit, String softwareId, String securityCode) {}
