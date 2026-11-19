package com.cantte.cetus.api.batches;

import com.cantte.cetus.api.error.ErrorMappers;
import com.cantte.cetus.api.invoices.InvoiceRequest;
import com.cantte.cetus.api.invoices.InvoiceService;
import com.cantte.cetus.domain.DomainException;
import com.cantte.cetus.domain.calc.InvoiceCalculator;
import com.cantte.cetus.domain.model.Address;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.domain.model.LineInput;
import com.cantte.cetus.domain.model.Party;
import com.cantte.cetus.domain.model.PaymentInfo;
import com.cantte.cetus.persistence.entity.CustomerEntity;
import com.cantte.cetus.persistence.entity.DocumentBatchItemEntity.Payload;
import com.cantte.cetus.persistence.entity.ProductEntity;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

/**
 * Turns the items of a batch into the invoices their documents will copy: the catalogs fill in what an item leaves
 * out, and every item goes through the checks of a single invoice. Errors are collected for every item, not only the
 * first, so a file can be fixed in one go.
 */
@ApplicationScoped
public class BatchItems {

    private final InvoiceCalculator calculator = new InvoiceCalculator();

    @Inject
    Validator validator;

    @Inject
    ObjectMapper mapper;

    /** The payloads in the items' order, or the errors when one item has any. */
    public record Resolved(List<Payload> payloads, List<BatchError> errors) {}

    public Resolved resolve(UUID accountId, Environment environment, UUID issuerId, List<BatchRequest.Item> items) {
        Map<String, Party> customers = customers(accountId, environment, items);
        Map<String, ProductEntity> products = products(accountId, environment, items);
        Set<String> references = new HashSet<>();
        List<Payload> payloads = new ArrayList<>();
        List<BatchError> errors = new ArrayList<>();
        for (int index = 0; index < items.size(); index++) {
            BatchRequest.Item item = items.get(index);
            List<BatchError> found = violations(index, item.reference(), validator.validate(item));
            if (item.reference() != null && !references.add(item.reference())) {
                found.add(new BatchError(
                        index,
                        item.reference(),
                        "reference",
                        "reference_duplicated",
                        "Another invoice of the batch has this reference"));
            }
            if (!found.isEmpty()) {
                errors.addAll(found);
                continue;
            }
            InvoiceRequest invoice = invoice(issuerId, item, customers, products);
            found = violations(index, item.reference(), validator.validate(invoice));
            if (!found.isEmpty()) {
                errors.addAll(found);
                continue;
            }
            try {
                payloads.add(payload(invoice));
            } catch (DomainException e) {
                errors.add(new BatchError(index, item.reference(), null, e.code(), e.getMessage()));
            }
        }
        return new Resolved(errors.isEmpty() ? payloads : List.of(), errors);
    }

    private Payload payload(InvoiceRequest invoice) {
        Party customer = InvoiceService.toParty(invoice.customer());
        PaymentInfo payment = InvoiceService.toPayment(invoice.payment());
        List<LineInput> lines = InvoiceService.toLines(invoice.lines());
        calculator.calculate(lines);
        try {
            return new Payload(
                    customer,
                    payment,
                    invoice.payment().dueDate(),
                    invoice.currency() != null ? invoice.currency() : "COP",
                    lines,
                    invoice.notes() == null ? List.of() : List.copyOf(invoice.notes()),
                    mapper.writeValueAsString(invoice));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Cannot serialize the invoice of a batch", e);
        }
    }

    private static <T> List<BatchError> violations(int index, String reference, Set<ConstraintViolation<T>> found) {
        return found.stream()
                .map(v -> new BatchError(
                        index, reference, ErrorMappers.field(v.getPropertyPath()), "invalid_field", v.getMessage()))
                .sorted(Comparator.comparing(BatchError::field).thenComparing(BatchError::message))
                .collect(Collectors.toCollection(ArrayList::new));
    }

    /** The invoice of the item, with the catalogs' values where the item has none. */
    private static InvoiceRequest invoice(
            UUID issuerId, BatchRequest.Item item, Map<String, Party> customers, Map<String, ProductEntity> products) {
        BatchRequest.Customer customer = item.customer();
        Party saved = customers.get(customerKey(customer));
        List<InvoiceRequest.Line> lines = IntStream.range(0, item.lines().size())
                .mapToObj(position ->
                        line(item.reference(), position, item.lines().get(position), products))
                .toList();
        return new InvoiceRequest(
                issuerId,
                item.reference(),
                item.currency(),
                customer(customer, saved),
                item.payment(),
                lines,
                item.notes());
    }

    private static InvoiceRequest.Customer customer(BatchRequest.Customer given, Party saved) {
        if (saved == null) {
            return new InvoiceRequest.Customer(
                    given.personType(),
                    given.identificationType(),
                    given.identificationNumber(),
                    blankToNull(given.checkDigit()),
                    blankToNull(given.legalName()),
                    blankToNull(given.tradeName()),
                    given.taxLevelCodes(),
                    given.taxScheme(),
                    given.address(),
                    blankToNull(given.email()),
                    blankToNull(given.phone()));
        }
        return new InvoiceRequest.Customer(
                given.personType() != null ? given.personType() : saved.personType(),
                given.identificationType(),
                given.identificationNumber(),
                or(given.checkDigit(), saved.checkDigit()),
                or(given.legalName(), saved.legalName()),
                or(given.tradeName(), saved.tradeName()),
                given.taxLevelCodes() != null && !given.taxLevelCodes().isEmpty()
                        ? given.taxLevelCodes()
                        : saved.taxLevelCodes(),
                given.taxScheme() != null
                        ? given.taxScheme()
                        : "01".equals(saved.taxSchemeId())
                                ? InvoiceRequest.CustomerTaxScheme.IVA
                                : InvoiceRequest.CustomerTaxScheme.NOT_APPLICABLE,
                given.address() != null ? given.address() : address(saved.address()),
                or(given.email(), saved.email()),
                or(given.phone(), saved.phone()));
    }

    private static InvoiceRequest.AddressInput address(Address address) {
        if (address == null) {
            return null;
        }
        return new InvoiceRequest.AddressInput(
                address.municipalityCode(),
                address.cityName(),
                address.departmentCode(),
                address.departmentName(),
                address.postalCode(),
                address.line(),
                address.countryCode(),
                address.countryName());
    }

    /** A line without a product code takes the reference and its position as the item code. */
    private static InvoiceRequest.Line line(
            String reference, int position, BatchRequest.Line given, Map<String, ProductEntity> products) {
        String code = blankToNull(given.productCode());
        ProductEntity product = code == null ? null : products.get(code);
        String itemCode = code != null ? code : reference + "-" + (position + 1);
        if (product == null) {
            return new InvoiceRequest.Line(
                    itemCode,
                    blankToNull(given.description()),
                    given.quantity(),
                    blankToNull(given.unitCode()),
                    given.unitPrice(),
                    given.taxes());
        }
        BigDecimal unitPrice = given.unitPrice() != null ? given.unitPrice() : product.unitPrice;
        List<InvoiceRequest.LineTax> taxes = given.taxes() != null
                ? given.taxes()
                : product.taxes.stream()
                        .map(tax -> new InvoiceRequest.LineTax(tax.type(), tax.percent()))
                        .toList();
        return new InvoiceRequest.Line(
                itemCode,
                or(given.description(), product.description),
                given.quantity(),
                or(given.unitCode(), product.unitCode),
                unitPrice,
                taxes);
    }

    /** The catalog's customers the items name, in one query. */
    private static Map<String, Party> customers(
            UUID accountId, Environment environment, List<BatchRequest.Item> items) {
        List<String> numbers = items.stream()
                .map(BatchRequest.Item::customer)
                .filter(customer -> customer != null && customer.identificationNumber() != null)
                .map(BatchRequest.Customer::identificationNumber)
                .distinct()
                .toList();
        if (numbers.isEmpty()) {
            return Map.of();
        }
        return CustomerEntity.<CustomerEntity>list(
                        "accountId = ?1 and environment = ?2 and identificationNumber in ?3",
                        accountId,
                        environment,
                        numbers)
                .stream()
                .collect(Collectors.toMap(
                        saved -> saved.identificationType + ":" + saved.identificationNumber,
                        saved -> saved.party,
                        (first, second) -> first));
    }

    private static String customerKey(BatchRequest.Customer customer) {
        return customer.identificationType() + ":" + customer.identificationNumber();
    }

    /** The catalog's products the items' lines name, in one query. */
    private static Map<String, ProductEntity> products(
            UUID accountId, Environment environment, List<BatchRequest.Item> items) {
        List<String> codes = items.stream()
                .filter(item -> item.lines() != null)
                .flatMap(item -> item.lines().stream())
                .filter(line -> line != null && blankToNull(line.productCode()) != null)
                .map(BatchRequest.Line::productCode)
                .distinct()
                .toList();
        if (codes.isEmpty()) {
            return Map.of();
        }
        return ProductEntity.<ProductEntity>list(
                        "accountId = ?1 and environment = ?2 and code in ?3", accountId, environment, codes)
                .stream()
                .collect(Collectors.toMap(product -> product.code, Function.identity()));
    }

    private static String or(String given, String saved) {
        String value = blankToNull(given);
        return value != null ? value : saved;
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
