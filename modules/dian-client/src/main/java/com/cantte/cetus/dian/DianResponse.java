package com.cantte.cetus.dian;

import java.util.List;

/**
 * Result of SendBillSync / GetStatus / GetStatusZip.
 *
 * @param applicationResponse base64 ApplicationResponse XML returned by the DIAN (XmlBase64Bytes)
 * @param documentKey         CUFE/CUDE as registered by the DIAN
 * @param rawXml              full SOAP response, stored as an artifact for auditing
 */
public record DianResponse(
        boolean valid,
        String statusCode,
        String statusDescription,
        String statusMessage,
        List<String> errors,
        String applicationResponse,
        String documentKey,
        String rawXml) {
}
