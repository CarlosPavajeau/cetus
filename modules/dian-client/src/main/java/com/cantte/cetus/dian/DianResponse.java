package com.cantte.cetus.dian;

import java.util.List;
import java.util.regex.Pattern;

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

    private static final Pattern TEST_SET_ACCEPTED =
            Pattern.compile("set de prueba con identificador .* se encuentra aceptado", Pattern.CASE_INSENSITIVE);

    /**
     * Whether the DIAN refused the document because its test set was already accepted, as in
     * "Set de prueba con identificador … se encuentra Aceptado." (status code 2 from GetStatusZip).
     */
    public boolean testSetAlreadyAccepted() {
        return statusDescription != null && TEST_SET_ACCEPTED.matcher(statusDescription).find();
    }
}
