package com.cantte.cetus.ubl;

import com.cantte.cetus.domain.calc.CalculatedLine;
import com.cantte.cetus.domain.calc.CalculationResult;
import com.cantte.cetus.domain.calc.MonetaryTotals;
import com.cantte.cetus.domain.calc.TaxAmount;
import com.cantte.cetus.domain.calc.TaxTotal;
import com.cantte.cetus.domain.dian.DianTime;
import com.cantte.cetus.domain.model.Address;
import com.cantte.cetus.domain.model.ElectronicInvoice;
import com.cantte.cetus.domain.model.IdentificationType;
import com.cantte.cetus.domain.model.Party;
import com.cantte.cetus.ubl.model.AmountType;
import com.cantte.cetus.ubl.model.Cac;
import com.cantte.cetus.ubl.model.CodeType;
import com.cantte.cetus.ubl.model.DianExtensions;
import com.cantte.cetus.ubl.model.Ext;
import com.cantte.cetus.ubl.model.IdentifierType;
import com.cantte.cetus.ubl.model.QuantityType;
import com.cantte.cetus.ubl.model.TextType;
import com.cantte.cetus.ubl.model.UblInvoice;

/**
 * Translates the domain invoice into the UBL model. This is the only class that knows both
 * worlds; the rest of the code never touches the JAXB classes.
 */
public final class InvoiceUblMapper {

    public UblInvoice map(ElectronicInvoice invoice) {
        String currency = invoice.currency();
        CalculationResult calc = invoice.calculation();

        UblInvoice ubl = new UblInvoice();
        ubl.ublExtensions = new Ext.UblExtensions();
        ubl.ublExtensions.extensions.add(Ext.UblExtension.of(dianExtensions(invoice)));

        ubl.ublVersionId = DianCodes.UBL_VERSION;
        ubl.customizationId = invoice.operationType();
        ubl.profileId = DianCodes.INVOICE_PROFILE;
        ubl.profileExecutionId = invoice.environment().dianCode();
        ubl.id = invoice.fullNumber();
        ubl.uuid = IdentifierType.of(invoice.cufe()).scheme(invoice.environment().dianCode(), "CUFE-SHA384");
        ubl.issueDate = DianTime.date(invoice.issueDate());
        ubl.issueTime = DianTime.time(invoice.issueTime());
        ubl.dueDate = invoice.dueDate() == null ? null : DianTime.date(invoice.dueDate());
        ubl.invoiceTypeCode = "01";
        ubl.notes.addAll(invoice.notes());
        ubl.documentCurrencyCode = currency;
        ubl.lineCountNumeric = calc.lines().size();

        ubl.supplier = supplier(invoice.supplier(), invoice.authorization().prefix());
        ubl.customer = customer(invoice.customer());
        ubl.paymentMeans.add(paymentMeans(invoice));
        calc.taxTotals().forEach(total -> ubl.taxTotals.add(taxTotal(total, currency)));
        ubl.legalMonetaryTotal = monetaryTotal(calc.totals(), currency);
        calc.lines().forEach(line -> ubl.invoiceLines.add(line(line, currency)));
        return ubl;
    }

    private DianExtensions dianExtensions(ElectronicInvoice invoice) {
        DianExtensions ext = new DianExtensions();

        ext.invoiceControl = new DianExtensions.InvoiceControl();
        ext.invoiceControl.invoiceAuthorization = invoice.authorization().resolutionNumber();
        ext.invoiceControl.authorizationPeriod = new Cac.Period();
        ext.invoiceControl.authorizationPeriod.startDate = DianTime.date(invoice.authorization().startDate());
        ext.invoiceControl.authorizationPeriod.endDate = DianTime.date(invoice.authorization().endDate());
        ext.invoiceControl.authorizedInvoices = new DianExtensions.AuthorizedInvoices();
        ext.invoiceControl.authorizedInvoices.prefix = invoice.authorization().prefix();
        ext.invoiceControl.authorizedInvoices.from = invoice.authorization().from();
        ext.invoiceControl.authorizedInvoices.to = invoice.authorization().to();

        ext.invoiceSource = new DianExtensions.InvoiceSource();
        CodeType country = CodeType.of("CO");
        country.listAgencyID = "6";
        country.listAgencyName = "United Nations Economic Commission for Europe";
        country.listSchemeURI = "urn:oasis:names:specification:ubl:codelist:gc:CountryIdentificationCode-2.1";
        ext.invoiceSource.identificationCode = country;

        ext.softwareProvider = new DianExtensions.SoftwareProvider();
        ext.softwareProvider.providerId = IdentifierType.of(invoice.software().providerNit())
                .agency(DianCodes.AGENCY_ID, DianCodes.AGENCY_NAME)
                .scheme(invoice.software().providerCheckDigit(), IdentificationType.NIT.dianCode());
        ext.softwareProvider.softwareId = IdentifierType.of(invoice.software().softwareId())
                .agency(DianCodes.AGENCY_ID, DianCodes.AGENCY_NAME);

        ext.softwareSecurityCode = IdentifierType.of(invoice.software().securityCode())
                .agency(DianCodes.AGENCY_ID, DianCodes.AGENCY_NAME);

        ext.authorizationProvider = new DianExtensions.AuthorizationProvider();
        ext.authorizationProvider.authorizationProviderId = IdentifierType.of(DianCodes.DIAN_NIT)
                .agency(DianCodes.AGENCY_ID, DianCodes.AGENCY_NAME)
                .scheme(DianCodes.DIAN_CHECK_DIGIT, IdentificationType.NIT.dianCode());

        ext.qrCode = invoice.qrCode();
        return ext;
    }

    private Cac.PartyRole supplier(Party party, String prefix) {
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

    private Cac.PartyRole customer(Party party) {
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

    private Cac.PartyName partyName(Party party) {
        Cac.PartyName name = new Cac.PartyName();
        name.name = party.tradeName() != null ? party.tradeName() : party.legalName();
        return name;
    }

    private Cac.PartyTaxScheme partyTaxScheme(Party party) {
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

    private Cac.PartyLegalEntity legalEntity(Party party) {
        Cac.PartyLegalEntity entity = new Cac.PartyLegalEntity();
        entity.registrationName = party.legalName();
        entity.companyId = companyId(party);
        return entity;
    }

    private IdentifierType companyId(Party party) {
        IdentifierType id = IdentifierType.of(party.identificationNumber())
                .agency(DianCodes.AGENCY_ID, DianCodes.AGENCY_NAME);
        id.schemeName = party.identificationType().dianCode();
        if (party.identificationType() == IdentificationType.NIT) {
            id.schemeID = party.checkDigit();
        }
        return id;
    }

    private Cac.Contact contact(Party party) {
        if (party.email() == null && party.phone() == null) {
            return null;
        }
        Cac.Contact contact = new Cac.Contact();
        contact.telephone = party.phone();
        contact.electronicMail = party.email();
        return contact;
    }

    private Cac.Address address(Address source) {
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

    private Cac.PaymentMeans paymentMeans(ElectronicInvoice invoice) {
        Cac.PaymentMeans means = new Cac.PaymentMeans();
        means.id = invoice.payment().methodId();
        means.paymentMeansCode = invoice.payment().meansCode();
        means.paymentDueDate = invoice.payment().dueDate() == null ? null : DianTime.date(invoice.payment().dueDate());
        return means;
    }

    private Cac.TaxTotal taxTotal(TaxTotal total, String currency) {
        Cac.TaxTotal taxTotal = new Cac.TaxTotal();
        taxTotal.taxAmount = AmountType.of(total.amount(), currency);
        total.subtotals().forEach(subtotal -> taxTotal.taxSubtotals.add(taxSubtotal(subtotal, currency)));
        return taxTotal;
    }

    private Cac.TaxTotal lineTaxTotal(TaxAmount tax, String currency) {
        Cac.TaxTotal taxTotal = new Cac.TaxTotal();
        taxTotal.taxAmount = AmountType.of(tax.amount(), currency);
        taxTotal.taxSubtotals.add(taxSubtotal(tax, currency));
        return taxTotal;
    }

    private Cac.TaxSubtotal taxSubtotal(TaxAmount tax, String currency) {
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

    private Cac.MonetaryTotal monetaryTotal(MonetaryTotals totals, String currency) {
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

    private Cac.InvoiceLine line(CalculatedLine source, String currency) {
        Cac.InvoiceLine line = new Cac.InvoiceLine();
        String unit = source.unitCode() != null ? source.unitCode() : DianCodes.DEFAULT_UNIT;
        line.id = String.valueOf(source.number());
        line.invoicedQuantity = QuantityType.of(source.quantity(), unit);
        line.lineExtensionAmount = AmountType.of(source.lineExtensionAmount(), currency);
        source.taxes().forEach(tax -> line.taxTotals.add(lineTaxTotal(tax, currency)));

        line.item = new Cac.Item();
        line.item.description = source.description();
        if (source.itemCode() != null) {
            line.item.sellersItemIdentification = itemId(source.itemCode(), null, null);
            // 999 = Cetus internal standard (seller's own code). Change if you adopt UNSPSC/GTIN.
            line.item.standardItemIdentification = itemId(source.itemCode(), "999", "Estándar de adopción del contribuyente");
        }

        line.price = new Cac.Price();
        line.price.priceAmount = AmountType.of(source.unitPrice(), currency);
        // The price refers to the whole invoiced quantity, as in the DIAN examples.
        line.price.baseQuantity = QuantityType.of(source.quantity(), unit);
        return line;
    }

    private Cac.ItemIdentification itemId(String code, String schemeId, String schemeName) {
        Cac.ItemIdentification identification = new Cac.ItemIdentification();
        identification.id = IdentifierType.of(code);
        identification.id.schemeID = schemeId;
        identification.id.schemeName = schemeName;
        return identification;
    }
}
