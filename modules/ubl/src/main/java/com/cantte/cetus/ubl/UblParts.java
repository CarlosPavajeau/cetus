package com.cantte.cetus.ubl;

import com.cantte.cetus.domain.calc.CalculatedLine;
import com.cantte.cetus.domain.calc.MonetaryTotals;
import com.cantte.cetus.domain.calc.TaxAmount;
import com.cantte.cetus.domain.calc.TaxTotal;
import com.cantte.cetus.domain.dian.DianTime;
import com.cantte.cetus.domain.model.Address;
import com.cantte.cetus.domain.model.BillingReference;
import com.cantte.cetus.domain.model.CorrectionConcept;
import com.cantte.cetus.domain.model.IdentificationType;
import com.cantte.cetus.domain.model.Party;
import com.cantte.cetus.domain.model.PaymentInfo;
import com.cantte.cetus.domain.model.SoftwareInfo;
import com.cantte.cetus.ubl.model.AmountType;
import com.cantte.cetus.ubl.model.Cac;
import com.cantte.cetus.ubl.model.CodeType;
import com.cantte.cetus.ubl.model.DianExtensions;
import com.cantte.cetus.ubl.model.IdentifierType;
import com.cantte.cetus.ubl.model.QuantityType;
import com.cantte.cetus.ubl.model.TextType;

/** Mapping shared by every document type: parties, payment, taxes, totals, line parts and DIAN extensions. */
final class UblParts {

    private UblParts() {
    }

    /** DIAN extensions without InvoiceControl, which only invoices carry. */
    static DianExtensions dianExtensions(SoftwareInfo software, String qrCode) {
        DianExtensions ext = new DianExtensions();

        ext.invoiceSource = new DianExtensions.InvoiceSource();
        CodeType country = CodeType.of("CO");
        country.listAgencyID = "6";
        country.listAgencyName = "United Nations Economic Commission for Europe";
        country.listSchemeURI = "urn:oasis:names:specification:ubl:codelist:gc:CountryIdentificationCode-2.1";
        ext.invoiceSource.identificationCode = country;

        ext.softwareProvider = new DianExtensions.SoftwareProvider();
        ext.softwareProvider.providerId = IdentifierType.of(software.providerNit())
                .agency(DianCodes.AGENCY_ID, DianCodes.AGENCY_NAME)
                .scheme(software.providerCheckDigit(), IdentificationType.NIT.dianCode());
        ext.softwareProvider.softwareId = IdentifierType.of(software.softwareId())
                .agency(DianCodes.AGENCY_ID, DianCodes.AGENCY_NAME);

        ext.softwareSecurityCode = IdentifierType.of(software.securityCode())
                .agency(DianCodes.AGENCY_ID, DianCodes.AGENCY_NAME);

        ext.authorizationProvider = new DianExtensions.AuthorizationProvider();
        ext.authorizationProvider.authorizationProviderId = IdentifierType.of(DianCodes.DIAN_NIT)
                .agency(DianCodes.AGENCY_ID, DianCodes.AGENCY_NAME)
                .scheme(DianCodes.DIAN_CHECK_DIGIT, IdentificationType.NIT.dianCode());

        ext.qrCode = qrCode;
        return ext;
    }

    /**
     * Why a note corrects the invoice. The Description is the concept's own name, since the DIAN checks it
     * against the code (CBF04, DBF04); the issuer's reason goes in a cbc:Note.
     */
    static Cac.DiscrepancyResponse discrepancyResponse(BillingReference reference, CorrectionConcept concept) {
        Cac.DiscrepancyResponse response = new Cac.DiscrepancyResponse();
        response.referenceId = reference.number();
        response.responseCode = concept.dianCode();
        response.description = concept.dianName();
        return response;
    }

    /** The invoice a note corrects, identified by its number, CUFE and issue date. */
    static Cac.BillingReference billingReference(BillingReference reference) {
        Cac.BillingReference billing = new Cac.BillingReference();
        billing.invoiceDocumentReference = new Cac.DocumentReference();
        billing.invoiceDocumentReference.id = reference.number();
        billing.invoiceDocumentReference.uuid = IdentifierType.of(reference.cufe()).scheme(null, "CUFE-SHA384");
        billing.invoiceDocumentReference.issueDate = DianTime.date(reference.issueDate());
        return billing;
    }

    static Cac.PartyRole supplier(Party party, String prefix) {
        Cac.PartyRole role = new Cac.PartyRole();
        role.additionalAccountId = IdentifierType.of(party.personType().dianCode()).agency(DianCodes.AGENCY_ID, null);
        role.party = new Cac.Party();
        role.party.partyNames.add(partyName(party));
        role.party.physicalLocation = new Cac.Location();
        role.party.physicalLocation.address = address(party.address());
        role.party.partyTaxSchemes.add(partyTaxScheme(party));
        Cac.PartyLegalEntity legalEntity = legalEntity(party);
        if (prefix != null && !prefix.isBlank()) {
            // FAB10a: CorporateRegistrationScheme/ID is the billing point's prefix and must equal sts:Prefix.
            legalEntity.corporateRegistrationScheme = new Cac.CorporateRegistrationScheme();
            legalEntity.corporateRegistrationScheme.id = prefix;
        }
        role.party.partyLegalEntities.add(legalEntity);
        role.party.contact = contact(party);
        return role;
    }

    static Cac.PartyRole customer(Party party) {
        Cac.PartyRole role = new Cac.PartyRole();
        role.additionalAccountId = IdentifierType.of(party.personType().dianCode()).agency(DianCodes.AGENCY_ID, null);
        role.party = new Cac.Party();
        Cac.PartyIdentification identification = new Cac.PartyIdentification();
        identification.id = companyId(party);
        role.party.partyIdentifications.add(identification);
        role.party.partyNames.add(partyName(party));
        if (party.address() != null) {
            role.party.physicalLocation = new Cac.Location();
            role.party.physicalLocation.address = address(party.address());
        }
        role.party.partyTaxSchemes.add(partyTaxScheme(party));
        role.party.partyLegalEntities.add(legalEntity(party));
        role.party.contact = contact(party);
        return role;
    }

    /** Sender or receiver of an AttachedDocument: only its tax scheme, without the registration address. */
    static Cac.Party taxParty(Party party) {
        Cac.PartyTaxScheme scheme = partyTaxScheme(party);
        scheme.registrationAddress = null;
        Cac.Party taxParty = new Cac.Party();
        taxParty.partyTaxSchemes.add(scheme);
        return taxParty;
    }

    private static Cac.PartyName partyName(Party party) {
        Cac.PartyName name = new Cac.PartyName();
        name.name = party.tradeName() != null ? party.tradeName() : party.legalName();
        return name;
    }

    private static Cac.PartyTaxScheme partyTaxScheme(Party party) {
        Cac.PartyTaxScheme scheme = new Cac.PartyTaxScheme();
        scheme.registrationName = party.legalName();
        scheme.companyId = companyId(party);
        scheme.taxLevelCode = CodeType.of(String.join(";", party.taxLevelCodes()));
        scheme.taxLevelCode.listName = DianCodes.TAX_LEVEL_LIST;
        scheme.registrationAddress = party.address() == null ? null : address(party.address());
        scheme.taxScheme = new Cac.TaxScheme();
        scheme.taxScheme.id = party.taxSchemeId();
        scheme.taxScheme.name = party.taxSchemeName();
        return scheme;
    }

    private static Cac.PartyLegalEntity legalEntity(Party party) {
        Cac.PartyLegalEntity entity = new Cac.PartyLegalEntity();
        entity.registrationName = party.legalName();
        entity.companyId = companyId(party);
        return entity;
    }

    private static IdentifierType companyId(Party party) {
        IdentifierType id = IdentifierType.of(party.identificationNumber())
                .agency(DianCodes.AGENCY_ID, DianCodes.AGENCY_NAME);
        id.schemeName = party.identificationType().dianCode();
        if (party.identificationType() == IdentificationType.NIT) {
            id.schemeID = party.checkDigit();
        }
        return id;
    }

    private static Cac.Contact contact(Party party) {
        if (party.email() == null && party.phone() == null) {
            return null;
        }
        Cac.Contact contact = new Cac.Contact();
        contact.telephone = party.phone();
        contact.electronicMail = party.email();
        return contact;
    }

    private static Cac.Address address(Address source) {
        Cac.Address address = new Cac.Address();
        address.id = source.municipalityCode();
        address.cityName = source.cityName();
        address.postalZone = source.postalCode();
        address.countrySubentity = source.departmentName();
        address.countrySubentityCode = source.departmentCode();
        address.addressLine = new Cac.AddressLine();
        address.addressLine.line = source.line();
        address.country = new Cac.Country();
        address.country.identificationCode = source.countryCode();
        address.country.name = TextType.of(source.countryName(), "es");
        return address;
    }

    static Cac.PaymentMeans paymentMeans(PaymentInfo payment) {
        Cac.PaymentMeans means = new Cac.PaymentMeans();
        means.id = payment.methodId();
        means.paymentMeansCode = payment.meansCode();
        means.paymentDueDate = payment.dueDate() == null ? null : DianTime.date(payment.dueDate());
        return means;
    }

    static Cac.TaxTotal taxTotal(TaxTotal total, String currency) {
        Cac.TaxTotal taxTotal = new Cac.TaxTotal();
        taxTotal.taxAmount = AmountType.of(total.amount(), currency);
        total.subtotals().forEach(subtotal -> taxTotal.taxSubtotals.add(taxSubtotal(subtotal, currency)));
        return taxTotal;
    }

    static Cac.TaxTotal lineTaxTotal(TaxAmount tax, String currency) {
        Cac.TaxTotal taxTotal = new Cac.TaxTotal();
        taxTotal.taxAmount = AmountType.of(tax.amount(), currency);
        taxTotal.taxSubtotals.add(taxSubtotal(tax, currency));
        return taxTotal;
    }

    private static Cac.TaxSubtotal taxSubtotal(TaxAmount tax, String currency) {
        Cac.TaxSubtotal subtotal = new Cac.TaxSubtotal();
        subtotal.taxableAmount = AmountType.of(tax.taxableAmount(), currency);
        subtotal.taxAmount = AmountType.of(tax.amount(), currency);
        subtotal.taxCategory = new Cac.TaxCategory();
        subtotal.taxCategory.percent = tax.percent();
        subtotal.taxCategory.taxScheme = new Cac.TaxScheme();
        subtotal.taxCategory.taxScheme.id = tax.type().dianCode();
        subtotal.taxCategory.taxScheme.name = tax.type().dianName();
        return subtotal;
    }

    static Cac.MonetaryTotal monetaryTotal(MonetaryTotals totals, String currency) {
        Cac.MonetaryTotal total = new Cac.MonetaryTotal();
        total.lineExtensionAmount = AmountType.of(totals.lineExtensionAmount(), currency);
        total.taxExclusiveAmount = AmountType.of(totals.taxExclusiveAmount(), currency);
        total.taxInclusiveAmount = AmountType.of(totals.taxInclusiveAmount(), currency);
        total.allowanceTotalAmount = AmountType.of(totals.allowanceTotalAmount(), currency);
        total.chargeTotalAmount = AmountType.of(totals.chargeTotalAmount(), currency);
        total.prepaidAmount = AmountType.of(totals.prepaidAmount(), currency);
        total.payableAmount = AmountType.of(totals.payableAmount(), currency);
        return total;
    }

    static String unit(CalculatedLine source) {
        return source.unitCode() != null ? source.unitCode() : DianCodes.DEFAULT_UNIT;
    }

    static Cac.Item item(CalculatedLine source) {
        Cac.Item item = new Cac.Item();
        item.description = source.description();
        if (source.itemCode() != null) {
            item.sellersItemIdentification = itemId(source.itemCode(), null, null);
            // 999 = Cetus internal standard (seller's own code). Change if you adopt UNSPSC/GTIN.
            item.standardItemIdentification = itemId(source.itemCode(), "999", "Estándar de adopción del contribuyente");
        }
        return item;
    }

    static Cac.Price price(CalculatedLine source, String currency) {
        Cac.Price price = new Cac.Price();
        price.priceAmount = AmountType.of(source.unitPrice(), currency);
        // The price refers to the whole line quantity, as in the DIAN examples.
        price.baseQuantity = QuantityType.of(source.quantity(), unit(source));
        return price;
    }

    private static Cac.ItemIdentification itemId(String code, String schemeId, String schemeName) {
        Cac.ItemIdentification identification = new Cac.ItemIdentification();
        identification.id = IdentifierType.of(code);
        identification.id.schemeID = schemeId;
        identification.id.schemeName = schemeName;
        return identification;
    }
}
