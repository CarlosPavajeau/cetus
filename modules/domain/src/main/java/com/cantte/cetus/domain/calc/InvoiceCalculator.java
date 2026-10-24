package com.cantte.cetus.domain.calc;

import com.cantte.cetus.domain.DomainException;
import com.cantte.cetus.domain.model.LineInput;
import com.cantte.cetus.domain.model.TaxType;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/**
 * Computes line amounts, tax totals and the legal monetary totals.
 *
 * <p>Rules: every line amount and line tax is rounded to two decimals (HALF_UP) and totals are
 * the sum of the rounded values. Review these rules against the tolerance rules of the current
 * technical annex before going to production.
 */
public final class InvoiceCalculator {

    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);
    /** The largest amount the database stores (NUMERIC(20,2)). The payable amount is the largest total. */
    private static final BigDecimal MAX_AMOUNT = new BigDecimal("999999999999999999.99");

    public CalculationResult calculate(List<LineInput> inputs) {
        if (inputs == null || inputs.isEmpty()) {
            throw new DomainException("lines_required", "The document must have at least one line");
        }

        List<CalculatedLine> lines = new ArrayList<>();
        BigDecimal lineExtensionTotal = BigDecimal.ZERO;
        BigDecimal taxableTotal = BigDecimal.ZERO;
        Map<TaxType, Map<BigDecimal, TaxAmount>> grouped = new EnumMap<>(TaxType.class);

        for (int i = 0; i < inputs.size(); i++) {
            LineInput input = inputs.get(i);
            int lineNumber = i + 1;
            validate(input, lineNumber);

            BigDecimal lineExtension = Amounts.round(input.quantity().multiply(input.unitPrice()));
            List<TaxAmount> lineTaxes = new ArrayList<>();
            for (LineInput.LineTax tax : input.taxes()) {
                BigDecimal amount =
                        Amounts.round(lineExtension.multiply(tax.percent()).divide(HUNDRED));
                TaxAmount lineTax = new TaxAmount(tax.type(), percent(tax.percent()), lineExtension, amount);
                lineTaxes.add(lineTax);
                grouped.computeIfAbsent(tax.type(), t -> new TreeMap<>())
                        .merge(lineTax.percent(), lineTax, InvoiceCalculator::sum);
            }

            lineExtensionTotal = lineExtensionTotal.add(lineExtension);
            if (!lineTaxes.isEmpty()) {
                taxableTotal = taxableTotal.add(lineExtension);
            }
            lines.add(new CalculatedLine(
                    lineNumber,
                    input.itemCode(),
                    input.description(),
                    input.quantity(),
                    input.unitCode(),
                    input.unitPrice(),
                    lineExtension,
                    List.copyOf(lineTaxes)));
        }

        List<TaxTotal> taxTotals = grouped.entrySet().stream()
                .sorted(Map.Entry.comparingByKey(Comparator.comparing(TaxType::dianCode)))
                .map(entry -> {
                    List<TaxAmount> subtotals = List.copyOf(entry.getValue().values());
                    BigDecimal amount =
                            subtotals.stream().map(TaxAmount::amount).reduce(BigDecimal.ZERO, BigDecimal::add);
                    return new TaxTotal(entry.getKey(), Amounts.round(amount), subtotals);
                })
                .toList();

        BigDecimal taxes = taxTotals.stream().map(TaxTotal::amount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal zero = Amounts.round(BigDecimal.ZERO);
        BigDecimal taxInclusive = Amounts.round(lineExtensionTotal.add(taxes));

        MonetaryTotals totals = new MonetaryTotals(
                Amounts.round(lineExtensionTotal),
                Amounts.round(taxableTotal),
                taxInclusive,
                zero,
                zero,
                zero,
                taxInclusive);

        if (totals.payableAmount().compareTo(MAX_AMOUNT) > 0) {
            throw new DomainException(
                    "amount_too_large", "The document total cannot exceed " + MAX_AMOUNT.toPlainString());
        }
        return new CalculationResult(List.copyOf(lines), taxTotals, totals);
    }

    private static void validate(LineInput input, int lineNumber) {
        if (input.description() == null || input.description().isBlank()) {
            throw new DomainException("line_description_required", "Line " + lineNumber + " needs a description");
        }
        if (input.quantity() == null || input.quantity().signum() <= 0) {
            throw new DomainException(
                    "line_quantity_invalid", "Line " + lineNumber + " quantity must be greater than zero");
        }
        if (input.unitPrice() == null || input.unitPrice().signum() < 0) {
            throw new DomainException("line_price_invalid", "Line " + lineNumber + " unit price cannot be negative");
        }
        for (LineInput.LineTax tax : input.taxes()) {
            if (tax.type() == null
                    || tax.percent() == null
                    || tax.percent().signum() < 0
                    || tax.percent().compareTo(HUNDRED) > 0) {
                throw new DomainException("line_tax_invalid", "Line " + lineNumber + " has an invalid tax");
            }
        }
    }

    private static BigDecimal percent(BigDecimal value) {
        return value.setScale(2, java.math.RoundingMode.HALF_UP);
    }

    private static TaxAmount sum(TaxAmount a, TaxAmount b) {
        return new TaxAmount(
                a.type(),
                a.percent(),
                a.taxableAmount().add(b.taxableAmount()),
                a.amount().add(b.amount()));
    }
}
