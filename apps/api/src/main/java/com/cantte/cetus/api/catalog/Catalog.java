package com.cantte.cetus.api.catalog;

import com.cantte.cetus.api.catalog.CatalogViews.CustomerPage;
import com.cantte.cetus.api.catalog.CatalogViews.CustomerView;
import com.cantte.cetus.api.catalog.CatalogViews.ProductPage;
import com.cantte.cetus.api.catalog.CatalogViews.ProductView;
import com.cantte.cetus.api.invoices.InvoiceRequest;
import com.cantte.cetus.api.invoices.InvoiceService;
import com.cantte.cetus.domain.DomainException;
import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.domain.model.LineInput;
import com.cantte.cetus.domain.model.Party;
import com.cantte.cetus.persistence.entity.CustomerEntity;
import com.cantte.cetus.persistence.entity.ProductEntity;
import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.NotFoundException;
import java.util.List;
import java.util.UUID;
import org.hibernate.exception.ConstraintViolationException;

/**
 * The customers and products an account keeps per environment, shared by /v1 and the console. Unique by
 * identification and by code: saving a second one with the same answers 422.
 */
@ApplicationScoped
public class Catalog {

    public static final int MAX_PAGE_SIZE = 100;

    @Transactional(Transactional.TxType.MANDATORY)
    public CustomerPage customers(UUID accountId, Environment environment, String q, UUID before, int limit) {
        int size = Math.clamp(limit, 1, MAX_PAGE_SIZE);
        // One more than asked tells whether there is a next page.
        List<CustomerEntity> rows = CustomerEntity.page(accountId, environment, q, before, size + 1);
        List<CustomerEntity> page = rows.subList(0, Math.min(size, rows.size()));
        UUID next = rows.size() > size ? page.getLast().id : null;
        return new CustomerPage(page.stream().map(CustomerView::from).toList(), next);
    }

    @Transactional(Transactional.TxType.MANDATORY)
    public CustomerView customer(UUID accountId, Environment environment, UUID id) {
        return CustomerView.from(findCustomer(accountId, environment, id));
    }

    @Transactional(Transactional.TxType.MANDATORY)
    public CustomerView createCustomer(UUID accountId, Environment environment, InvoiceRequest.Customer request) {
        Party party = InvoiceService.toParty(request);
        requireUniqueCustomer(accountId, environment, party, null);
        CustomerEntity customer = new CustomerEntity();
        customer.id = Ids.newId();
        customer.accountId = accountId;
        customer.environment = environment;
        customer.assign(party);
        flush(customer, "customer_exists", "A customer with this identification already exists");
        CustomerEntity.getEntityManager().refresh(customer);
        return CustomerView.from(customer);
    }

    @Transactional(Transactional.TxType.MANDATORY)
    public CustomerView updateCustomer(
            UUID accountId, Environment environment, UUID id, InvoiceRequest.Customer request) {
        CustomerEntity customer = findCustomer(accountId, environment, id);
        Party party = InvoiceService.toParty(request);
        requireUniqueCustomer(accountId, environment, party, id);
        customer.assign(party);
        flush(customer, "customer_exists", "A customer with this identification already exists");
        return CustomerView.from(customer);
    }

    @Transactional(Transactional.TxType.MANDATORY)
    public void deleteCustomer(UUID accountId, Environment environment, UUID id) {
        findCustomer(accountId, environment, id).delete();
    }

    @Transactional(Transactional.TxType.MANDATORY)
    public ProductPage products(UUID accountId, Environment environment, String q, UUID before, int limit) {
        int size = Math.clamp(limit, 1, MAX_PAGE_SIZE);
        List<ProductEntity> rows = ProductEntity.page(accountId, environment, q, before, size + 1);
        List<ProductEntity> page = rows.subList(0, Math.min(size, rows.size()));
        UUID next = rows.size() > size ? page.getLast().id : null;
        return new ProductPage(page.stream().map(ProductView::from).toList(), next);
    }

    @Transactional(Transactional.TxType.MANDATORY)
    public ProductView product(UUID accountId, Environment environment, UUID id) {
        return ProductView.from(findProduct(accountId, environment, id));
    }

    @Transactional(Transactional.TxType.MANDATORY)
    public ProductView createProduct(UUID accountId, Environment environment, ProductRequest request) {
        String code = request.code().strip();
        requireUniqueProduct(accountId, environment, code, null);
        ProductEntity product = new ProductEntity();
        product.id = Ids.newId();
        product.accountId = accountId;
        product.environment = environment;
        apply(product, code, request);
        flush(product, "product_exists", "A product with this code already exists");
        ProductEntity.getEntityManager().refresh(product);
        return ProductView.from(product);
    }

    @Transactional(Transactional.TxType.MANDATORY)
    public ProductView updateProduct(UUID accountId, Environment environment, UUID id, ProductRequest request) {
        ProductEntity product = findProduct(accountId, environment, id);
        String code = request.code().strip();
        requireUniqueProduct(accountId, environment, code, id);
        apply(product, code, request);
        flush(product, "product_exists", "A product with this code already exists");
        return ProductView.from(product);
    }

    @Transactional(Transactional.TxType.MANDATORY)
    public void deleteProduct(UUID accountId, Environment environment, UUID id) {
        findProduct(accountId, environment, id).delete();
    }

    /** The checks above miss a twin saved at the same time; the unique key catches it. */
    private static void flush(PanacheEntityBase entity, String code, String message) {
        try {
            entity.persistAndFlush();
        } catch (ConstraintViolationException e) {
            throw new DomainException(code, message);
        }
    }

    private static void apply(ProductEntity product, String code, ProductRequest request) {
        product.code = code;
        product.description = request.description().strip();
        product.unitCode = request.unitCode() != null ? request.unitCode() : "94";
        product.unitPrice = request.unitPrice();
        product.taxes = request.taxes() == null
                ? List.of()
                : request.taxes().stream()
                        .map(tax -> new LineInput.LineTax(tax.type(), tax.percent()))
                        .toList();
    }

    private static CustomerEntity findCustomer(UUID accountId, Environment environment, UUID id) {
        return CustomerEntity.findFor(accountId, environment, id)
                .orElseThrow(() -> new NotFoundException("Customer not found"));
    }

    private static ProductEntity findProduct(UUID accountId, Environment environment, UUID id) {
        return ProductEntity.findFor(accountId, environment, id)
                .orElseThrow(() -> new NotFoundException("Product not found"));
    }

    private static void requireUniqueCustomer(UUID accountId, Environment environment, Party party, UUID self) {
        CustomerEntity.findByIdentification(
                        accountId, environment, party.identificationType(), party.identificationNumber())
                .filter(existing -> !existing.id.equals(self))
                .ifPresent(existing -> {
                    throw new DomainException(
                            "customer_exists", "A customer with this identification already exists: " + existing.id);
                });
    }

    private static void requireUniqueProduct(UUID accountId, Environment environment, String code, UUID self) {
        ProductEntity.findByCode(accountId, environment, code)
                .filter(existing -> !existing.id.equals(self))
                .ifPresent(existing -> {
                    throw new DomainException(
                            "product_exists", "A product with this code already exists: " + existing.id);
                });
    }
}
