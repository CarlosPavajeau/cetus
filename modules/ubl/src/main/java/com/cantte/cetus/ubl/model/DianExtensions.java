package com.cantte.cetus.ubl.model;

import jakarta.xml.bind.annotation.XmlElement;
import jakarta.xml.bind.annotation.XmlRootElement;
import jakarta.xml.bind.annotation.XmlType;

/** sts:DianExtensions — numbering authorization, software provider and QR. */
@XmlRootElement(name = "DianExtensions", namespace = Ns.STS)
@XmlType(name = "DianExtensions", propOrder = {"invoiceControl", "invoiceSource", "softwareProvider",
        "softwareSecurityCode", "authorizationProvider", "qrCode"})
public class DianExtensions {

    @XmlElement(name = "InvoiceControl", namespace = Ns.STS)
    public InvoiceControl invoiceControl;
    @XmlElement(name = "InvoiceSource", namespace = Ns.STS)
    public InvoiceSource invoiceSource;
    @XmlElement(name = "SoftwareProvider", namespace = Ns.STS)
    public SoftwareProvider softwareProvider;
    @XmlElement(name = "SoftwareSecurityCode", namespace = Ns.STS)
    public IdentifierType softwareSecurityCode;
    @XmlElement(name = "AuthorizationProvider", namespace = Ns.STS)
    public AuthorizationProvider authorizationProvider;
    @XmlElement(name = "QRCode", namespace = Ns.STS)
    public String qrCode;

    @XmlType(name = "InvoiceControl", propOrder = {"invoiceAuthorization", "authorizationPeriod", "authorizedInvoices"})
    public static class InvoiceControl {
        @XmlElement(name = "InvoiceAuthorization", namespace = Ns.STS)
        public String invoiceAuthorization;
        @XmlElement(name = "AuthorizationPeriod", namespace = Ns.STS)
        public Cac.Period authorizationPeriod;
        @XmlElement(name = "AuthorizedInvoices", namespace = Ns.STS)
        public AuthorizedInvoices authorizedInvoices;
    }

    @XmlType(name = "AuthorizedInvoices", propOrder = {"prefix", "from", "to"})
    public static class AuthorizedInvoices {
        @XmlElement(name = "Prefix", namespace = Ns.STS)
        public String prefix;
        @XmlElement(name = "From", namespace = Ns.STS)
        public Long from;
        @XmlElement(name = "To", namespace = Ns.STS)
        public Long to;
    }

    @XmlType(name = "InvoiceSource", propOrder = {"identificationCode"})
    public static class InvoiceSource {
        @XmlElement(name = "IdentificationCode", namespace = Ns.CBC)
        public CodeType identificationCode;
    }

    @XmlType(name = "SoftwareProvider", propOrder = {"providerId", "softwareId"})
    public static class SoftwareProvider {
        @XmlElement(name = "ProviderID", namespace = Ns.STS)
        public IdentifierType providerId;
        @XmlElement(name = "SoftwareID", namespace = Ns.STS)
        public IdentifierType softwareId;
    }

    @XmlType(name = "AuthorizationProvider", propOrder = {"authorizationProviderId"})
    public static class AuthorizationProvider {
        @XmlElement(name = "AuthorizationProviderID", namespace = Ns.STS)
        public IdentifierType authorizationProviderId;
    }
}
