package com.cantte.cetus.ubl.model;

import jakarta.xml.bind.annotation.XmlElement;
import jakarta.xml.bind.annotation.XmlType;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/** UBL aggregate components (cac:*) used by the DIAN. */
public final class Cac {

    private Cac() {}

    @XmlType(
            name = "PartyRole",
            propOrder = {"additionalAccountId", "party"})
    public static class PartyRole {
        @XmlElement(name = "AdditionalAccountID", namespace = Ns.CBC)
        public IdentifierType additionalAccountId;

        @XmlElement(name = "Party", namespace = Ns.CAC)
        public Party party;
    }

    @XmlType(
            name = "Party",
            propOrder = {
                "partyIdentifications",
                "partyNames",
                "physicalLocation",
                "partyTaxSchemes",
                "partyLegalEntities",
                "contact"
            })
    public static class Party {
        @XmlElement(name = "PartyIdentification", namespace = Ns.CAC)
        public List<PartyIdentification> partyIdentifications = new ArrayList<>();

        @XmlElement(name = "PartyName", namespace = Ns.CAC)
        public List<PartyName> partyNames = new ArrayList<>();

        @XmlElement(name = "PhysicalLocation", namespace = Ns.CAC)
        public Location physicalLocation;

        @XmlElement(name = "PartyTaxScheme", namespace = Ns.CAC)
        public List<PartyTaxScheme> partyTaxSchemes = new ArrayList<>();

        @XmlElement(name = "PartyLegalEntity", namespace = Ns.CAC)
        public List<PartyLegalEntity> partyLegalEntities = new ArrayList<>();

        @XmlElement(name = "Contact", namespace = Ns.CAC)
        public Contact contact;
    }

    @XmlType(
            name = "PartyIdentification",
            propOrder = {"id"})
    public static class PartyIdentification {
        @XmlElement(name = "ID", namespace = Ns.CBC)
        public IdentifierType id;
    }

    @XmlType(
            name = "PartyName",
            propOrder = {"name"})
    public static class PartyName {
        @XmlElement(name = "Name", namespace = Ns.CBC)
        public String name;
    }

    @XmlType(
            name = "Location",
            propOrder = {"address"})
    public static class Location {
        @XmlElement(name = "Address", namespace = Ns.CAC)
        public Address address;
    }

    @XmlType(
            name = "Address",
            propOrder = {
                "id",
                "cityName",
                "postalZone",
                "countrySubentity",
                "countrySubentityCode",
                "addressLine",
                "country"
            })
    public static class Address {
        @XmlElement(name = "ID", namespace = Ns.CBC)
        public String id;

        @XmlElement(name = "CityName", namespace = Ns.CBC)
        public String cityName;

        @XmlElement(name = "PostalZone", namespace = Ns.CBC)
        public String postalZone;

        @XmlElement(name = "CountrySubentity", namespace = Ns.CBC)
        public String countrySubentity;

        @XmlElement(name = "CountrySubentityCode", namespace = Ns.CBC)
        public String countrySubentityCode;

        @XmlElement(name = "AddressLine", namespace = Ns.CAC)
        public AddressLine addressLine;

        @XmlElement(name = "Country", namespace = Ns.CAC)
        public Country country;
    }

    @XmlType(
            name = "AddressLine",
            propOrder = {"line"})
    public static class AddressLine {
        @XmlElement(name = "Line", namespace = Ns.CBC)
        public String line;
    }

    @XmlType(
            name = "Country",
            propOrder = {"identificationCode", "name"})
    public static class Country {
        @XmlElement(name = "IdentificationCode", namespace = Ns.CBC)
        public String identificationCode;

        @XmlElement(name = "Name", namespace = Ns.CBC)
        public TextType name;
    }

    @XmlType(
            name = "PartyTaxScheme",
            propOrder = {"registrationName", "companyId", "taxLevelCode", "registrationAddress", "taxScheme"})
    public static class PartyTaxScheme {
        @XmlElement(name = "RegistrationName", namespace = Ns.CBC)
        public String registrationName;

        @XmlElement(name = "CompanyID", namespace = Ns.CBC)
        public IdentifierType companyId;

        @XmlElement(name = "TaxLevelCode", namespace = Ns.CBC)
        public CodeType taxLevelCode;

        @XmlElement(name = "RegistrationAddress", namespace = Ns.CAC)
        public Address registrationAddress;

        @XmlElement(name = "TaxScheme", namespace = Ns.CAC)
        public TaxScheme taxScheme;
    }

    @XmlType(
            name = "TaxScheme",
            propOrder = {"id", "name"})
    public static class TaxScheme {
        @XmlElement(name = "ID", namespace = Ns.CBC)
        public String id;

        @XmlElement(name = "Name", namespace = Ns.CBC)
        public String name;
    }

    @XmlType(
            name = "PartyLegalEntity",
            propOrder = {"registrationName", "companyId", "corporateRegistrationScheme"})
    public static class PartyLegalEntity {
        @XmlElement(name = "RegistrationName", namespace = Ns.CBC)
        public String registrationName;

        @XmlElement(name = "CompanyID", namespace = Ns.CBC)
        public IdentifierType companyId;

        @XmlElement(name = "CorporateRegistrationScheme", namespace = Ns.CAC)
        public CorporateRegistrationScheme corporateRegistrationScheme;
    }

    @XmlType(
            name = "CorporateRegistrationScheme",
            propOrder = {"id"})
    public static class CorporateRegistrationScheme {
        @XmlElement(name = "ID", namespace = Ns.CBC)
        public String id;
    }

    @XmlType(
            name = "Contact",
            propOrder = {"telephone", "electronicMail"})
    public static class Contact {
        @XmlElement(name = "Telephone", namespace = Ns.CBC)
        public String telephone;

        @XmlElement(name = "ElectronicMail", namespace = Ns.CBC)
        public String electronicMail;
    }

    @XmlType(
            name = "PaymentMeans",
            propOrder = {"id", "paymentMeansCode", "paymentDueDate"})
    public static class PaymentMeans {
        @XmlElement(name = "ID", namespace = Ns.CBC)
        public String id;

        @XmlElement(name = "PaymentMeansCode", namespace = Ns.CBC)
        public String paymentMeansCode;

        @XmlElement(name = "PaymentDueDate", namespace = Ns.CBC)
        public String paymentDueDate;
    }

    @XmlType(
            name = "TaxTotal",
            propOrder = {"taxAmount", "taxSubtotals"})
    public static class TaxTotal {
        @XmlElement(name = "TaxAmount", namespace = Ns.CBC)
        public AmountType taxAmount;

        @XmlElement(name = "TaxSubtotal", namespace = Ns.CAC)
        public List<TaxSubtotal> taxSubtotals = new ArrayList<>();
    }

    @XmlType(
            name = "TaxSubtotal",
            propOrder = {"taxableAmount", "taxAmount", "taxCategory"})
    public static class TaxSubtotal {
        @XmlElement(name = "TaxableAmount", namespace = Ns.CBC)
        public AmountType taxableAmount;

        @XmlElement(name = "TaxAmount", namespace = Ns.CBC)
        public AmountType taxAmount;

        @XmlElement(name = "TaxCategory", namespace = Ns.CAC)
        public TaxCategory taxCategory;
    }

    @XmlType(
            name = "TaxCategory",
            propOrder = {"percent", "taxScheme"})
    public static class TaxCategory {
        @XmlElement(name = "Percent", namespace = Ns.CBC)
        public BigDecimal percent;

        @XmlElement(name = "TaxScheme", namespace = Ns.CAC)
        public TaxScheme taxScheme;
    }

    @XmlType(
            name = "MonetaryTotal",
            propOrder = {
                "lineExtensionAmount",
                "taxExclusiveAmount",
                "taxInclusiveAmount",
                "allowanceTotalAmount",
                "chargeTotalAmount",
                "prepaidAmount",
                "payableAmount"
            })
    public static class MonetaryTotal {
        @XmlElement(name = "LineExtensionAmount", namespace = Ns.CBC)
        public AmountType lineExtensionAmount;

        @XmlElement(name = "TaxExclusiveAmount", namespace = Ns.CBC)
        public AmountType taxExclusiveAmount;

        @XmlElement(name = "TaxInclusiveAmount", namespace = Ns.CBC)
        public AmountType taxInclusiveAmount;

        @XmlElement(name = "AllowanceTotalAmount", namespace = Ns.CBC)
        public AmountType allowanceTotalAmount;

        @XmlElement(name = "ChargeTotalAmount", namespace = Ns.CBC)
        public AmountType chargeTotalAmount;

        @XmlElement(name = "PrepaidAmount", namespace = Ns.CBC)
        public AmountType prepaidAmount;

        @XmlElement(name = "PayableAmount", namespace = Ns.CBC)
        public AmountType payableAmount;
    }

    @XmlType(
            name = "InvoiceLine",
            propOrder = {"id", "invoicedQuantity", "lineExtensionAmount", "taxTotals", "item", "price"})
    public static class InvoiceLine {
        @XmlElement(name = "ID", namespace = Ns.CBC)
        public String id;

        @XmlElement(name = "InvoicedQuantity", namespace = Ns.CBC)
        public QuantityType invoicedQuantity;

        @XmlElement(name = "LineExtensionAmount", namespace = Ns.CBC)
        public AmountType lineExtensionAmount;

        @XmlElement(name = "TaxTotal", namespace = Ns.CAC)
        public List<TaxTotal> taxTotals = new ArrayList<>();

        @XmlElement(name = "Item", namespace = Ns.CAC)
        public Item item;

        @XmlElement(name = "Price", namespace = Ns.CAC)
        public Price price;
    }

    @XmlType(
            name = "CreditNoteLine",
            propOrder = {"id", "creditedQuantity", "lineExtensionAmount", "taxTotals", "item", "price"})
    public static class CreditNoteLine {
        @XmlElement(name = "ID", namespace = Ns.CBC)
        public String id;

        @XmlElement(name = "CreditedQuantity", namespace = Ns.CBC)
        public QuantityType creditedQuantity;

        @XmlElement(name = "LineExtensionAmount", namespace = Ns.CBC)
        public AmountType lineExtensionAmount;

        @XmlElement(name = "TaxTotal", namespace = Ns.CAC)
        public List<TaxTotal> taxTotals = new ArrayList<>();

        @XmlElement(name = "Item", namespace = Ns.CAC)
        public Item item;

        @XmlElement(name = "Price", namespace = Ns.CAC)
        public Price price;
    }

    @XmlType(
            name = "DebitNoteLine",
            propOrder = {"id", "debitedQuantity", "lineExtensionAmount", "taxTotals", "item", "price"})
    public static class DebitNoteLine {
        @XmlElement(name = "ID", namespace = Ns.CBC)
        public String id;

        @XmlElement(name = "DebitedQuantity", namespace = Ns.CBC)
        public QuantityType debitedQuantity;

        @XmlElement(name = "LineExtensionAmount", namespace = Ns.CBC)
        public AmountType lineExtensionAmount;

        @XmlElement(name = "TaxTotal", namespace = Ns.CAC)
        public List<TaxTotal> taxTotals = new ArrayList<>();

        @XmlElement(name = "Item", namespace = Ns.CAC)
        public Item item;

        @XmlElement(name = "Price", namespace = Ns.CAC)
        public Price price;
    }

    @XmlType(
            name = "DiscrepancyResponse",
            propOrder = {"referenceId", "responseCode", "description"})
    public static class DiscrepancyResponse {
        @XmlElement(name = "ReferenceID", namespace = Ns.CBC)
        public String referenceId;

        @XmlElement(name = "ResponseCode", namespace = Ns.CBC)
        public String responseCode;

        @XmlElement(name = "Description", namespace = Ns.CBC)
        public String description;
    }

    @XmlType(
            name = "BillingReference",
            propOrder = {"invoiceDocumentReference"})
    public static class BillingReference {
        @XmlElement(name = "InvoiceDocumentReference", namespace = Ns.CAC)
        public DocumentReference invoiceDocumentReference;
    }

    /** The last three elements are only used by the AttachedDocument, to embed the DIAN's ApplicationResponse. */
    @XmlType(
            name = "DocumentReference",
            propOrder = {"id", "uuid", "issueDate", "documentType", "attachment", "resultOfVerification"})
    public static class DocumentReference {
        @XmlElement(name = "ID", namespace = Ns.CBC)
        public String id;

        @XmlElement(name = "UUID", namespace = Ns.CBC)
        public IdentifierType uuid;

        @XmlElement(name = "IssueDate", namespace = Ns.CBC)
        public String issueDate;

        @XmlElement(name = "DocumentType", namespace = Ns.CBC)
        public String documentType;

        @XmlElement(name = "Attachment", namespace = Ns.CAC)
        public Attachment attachment;

        @XmlElement(name = "ResultOfVerification", namespace = Ns.CAC)
        public ResultOfVerification resultOfVerification;
    }

    @XmlType(
            name = "Attachment",
            propOrder = {"externalReference"})
    public static class Attachment {
        @XmlElement(name = "ExternalReference", namespace = Ns.CAC)
        public ExternalReference externalReference;
    }

    /** An embedded XML document: Description holds it as text (CDATA once marshalled). */
    @XmlType(
            name = "ExternalReference",
            propOrder = {"mimeCode", "encodingCode", "description"})
    public static class ExternalReference {
        @XmlElement(name = "MimeCode", namespace = Ns.CBC)
        public String mimeCode;

        @XmlElement(name = "EncodingCode", namespace = Ns.CBC)
        public String encodingCode;

        @XmlElement(name = "Description", namespace = Ns.CBC)
        public String description;
    }

    @XmlType(
            name = "LineReference",
            propOrder = {"lineId", "documentReference"})
    public static class LineReference {
        @XmlElement(name = "LineID", namespace = Ns.CBC)
        public String lineId;

        @XmlElement(name = "DocumentReference", namespace = Ns.CAC)
        public DocumentReference documentReference;
    }

    @XmlType(
            name = "ResultOfVerification",
            propOrder = {"validatorId", "validationResultCode", "validationDate", "validationTime"})
    public static class ResultOfVerification {
        @XmlElement(name = "ValidatorID", namespace = Ns.CBC)
        public String validatorId;

        @XmlElement(name = "ValidationResultCode", namespace = Ns.CBC)
        public String validationResultCode;

        @XmlElement(name = "ValidationDate", namespace = Ns.CBC)
        public String validationDate;

        @XmlElement(name = "ValidationTime", namespace = Ns.CBC)
        public String validationTime;
    }

    @XmlType(
            name = "Item",
            propOrder = {"description", "sellersItemIdentification", "standardItemIdentification"})
    public static class Item {
        @XmlElement(name = "Description", namespace = Ns.CBC)
        public String description;

        @XmlElement(name = "SellersItemIdentification", namespace = Ns.CAC)
        public ItemIdentification sellersItemIdentification;

        @XmlElement(name = "StandardItemIdentification", namespace = Ns.CAC)
        public ItemIdentification standardItemIdentification;
    }

    @XmlType(
            name = "ItemIdentification",
            propOrder = {"id"})
    public static class ItemIdentification {
        @XmlElement(name = "ID", namespace = Ns.CBC)
        public IdentifierType id;
    }

    @XmlType(
            name = "Price",
            propOrder = {"priceAmount", "baseQuantity"})
    public static class Price {
        @XmlElement(name = "PriceAmount", namespace = Ns.CBC)
        public AmountType priceAmount;

        @XmlElement(name = "BaseQuantity", namespace = Ns.CBC)
        public QuantityType baseQuantity;
    }

    @XmlType(
            name = "Period",
            propOrder = {"startDate", "endDate"})
    public static class Period {
        @XmlElement(name = "StartDate", namespace = Ns.CBC)
        public String startDate;

        @XmlElement(name = "EndDate", namespace = Ns.CBC)
        public String endDate;
    }
}
