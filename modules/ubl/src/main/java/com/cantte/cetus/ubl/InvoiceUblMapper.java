package com.cantte.cetus.ubl;

import com.cantte.cetus.domain.calc.CalculatedLine;
import com.cantte.cetus.domain.calc.CalculationResult;
import com.cantte.cetus.domain.dian.DianTime;
import com.cantte.cetus.domain.model.ElectronicInvoice;
import com.cantte.cetus.ubl.model.Cac;
import com.cantte.cetus.ubl.model.DianExtensions;
import com.cantte.cetus.ubl.model.Ext;
import com.cantte.cetus.ubl.model.IdentifierType;
import com.cantte.cetus.ubl.model.QuantityType;
import com.cantte.cetus.ubl.model.UblInvoice;

/**
 * Translates the domain invoice into the UBL model. Together with {@link CreditNoteUblMapper}, the
 * only code that knows both worlds; the rest of the code never touches the JAXB classes.
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
        ubl.uuid =
                IdentifierType.of(invoice.cufe()).scheme(invoice.environment().dianCode(), "CUFE-SHA384");
        ubl.issueDate = DianTime.date(invoice.issueDate());
        ubl.issueTime = DianTime.time(invoice.issueTime());
        ubl.dueDate = invoice.dueDate() == null ? null : DianTime.date(invoice.dueDate());
        ubl.invoiceTypeCode = "01";
        ubl.notes.addAll(invoice.notes());
        ubl.documentCurrencyCode = currency;
        ubl.lineCountNumeric = calc.lines().size();

        ubl.supplier =
                UblParts.supplier(invoice.supplier(), invoice.authorization().prefix());
        ubl.customer = UblParts.customer(invoice.customer());
        ubl.paymentMeans.add(UblParts.paymentMeans(invoice.payment()));
        calc.taxTotals().forEach(total -> ubl.taxTotals.add(UblParts.taxTotal(total, currency)));
        ubl.legalMonetaryTotal = UblParts.monetaryTotal(calc.totals(), currency);
        calc.lines().forEach(line -> ubl.invoiceLines.add(line(line, currency)));
        return ubl;
    }

    private DianExtensions dianExtensions(ElectronicInvoice invoice) {
        DianExtensions ext = UblParts.dianExtensions(invoice.software(), invoice.qrCode());

        ext.invoiceControl = new DianExtensions.InvoiceControl();
        ext.invoiceControl.invoiceAuthorization = invoice.authorization().resolutionNumber();
        ext.invoiceControl.authorizationPeriod = new Cac.Period();
        ext.invoiceControl.authorizationPeriod.startDate =
                DianTime.date(invoice.authorization().startDate());
        ext.invoiceControl.authorizationPeriod.endDate =
                DianTime.date(invoice.authorization().endDate());
        ext.invoiceControl.authorizedInvoices = new DianExtensions.AuthorizedInvoices();
        ext.invoiceControl.authorizedInvoices.prefix = invoice.authorization().prefix();
        ext.invoiceControl.authorizedInvoices.from = invoice.authorization().from();
        ext.invoiceControl.authorizedInvoices.to = invoice.authorization().to();
        return ext;
    }

    private Cac.InvoiceLine line(CalculatedLine source, String currency) {
        Cac.InvoiceLine line = UblParts.line(new Cac.InvoiceLine(), source, currency);
        line.invoicedQuantity = QuantityType.of(source.quantity(), UblParts.unit(source));
        return line;
    }
}
