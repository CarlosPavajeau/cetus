package com.cantte.cetus.dian;

import java.util.List;

/** SOAP fault returned by the DIAN (security header, malformed request, unknown operation...). */
public class DianFaultException extends RuntimeException {

    private final String code;
    private final List<String> subcodes;
    private final String reason;
    private final String rawXml;

    /** A response without a SOAP fault that could not be understood either (no code). */
    public DianFaultException(String message, String rawXml) {
        this(null, List.of(), message, rawXml);
    }

    public DianFaultException(String code, List<String> subcodes, String reason, String rawXml) {
        super(describe(code, subcodes, reason));
        this.code = code;
        this.subcodes = List.copyOf(subcodes);
        this.reason = reason;
        this.rawXml = rawXml;
    }

    /** SOAP fault code as sent, e.g. {@code s:Client}; null when the response was not a SOAP fault. */
    public String code() {
        return code;
    }

    public List<String> subcodes() {
        return subcodes;
    }

    public String reason() {
        return reason;
    }

    public String rawXml() {
        return rawXml;
    }

    /**
     * A client/sender fault means the DIAN rejected the request itself (WS-Security, untrusted
     * certificate, malformed envelope): sending the same request again yields the same fault.
     * WCF reports the security check failures as {@code s:Client} with no reason.
     */
    public boolean isClientFault() {
        String local = localName(code);
        return "Client".equals(local) || "Sender".equals(local);
    }

    public boolean retryable() {
        return !isClientFault();
    }

    private static String describe(String code, List<String> subcodes, String reason) {
        if (code == null) {
            return reason;
        }
        StringBuilder message = new StringBuilder("SOAP fault ").append(code);
        for (String subcode : subcodes) {
            message.append('/').append(subcode);
        }
        message.append(": ").append(reason);
        if ("Client".equals(localName(code)) || "Sender".equals(localName(code))) {
            message.append(" (request rejected by the DIAN; check the certificate is issued by an"
                    + " ONAC-accredited CA and the WS-Security header)");
        }
        return message.toString();
    }

    private static String localName(String qname) {
        if (qname == null) {
            return null;
        }
        int colon = qname.indexOf(':');
        return colon < 0 ? qname : qname.substring(colon + 1);
    }
}
