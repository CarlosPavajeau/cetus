package com.cantte.cetus.api.catalog;

import com.cantte.cetus.domain.model.Address;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.domain.model.IdentificationType;
import com.cantte.cetus.domain.model.PersonType;
import com.cantte.cetus.domain.model.TaxType;
import com.cantte.cetus.persistence.entity.CustomerEntity;
import com.cantte.cetus.persistence.entity.ProductEntity;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/** The catalogs as the API and the console return them. */
public final class CatalogViews {

    private CatalogViews() {}

    public record CustomerView(
            UUID id,
            Environment environment,
            PersonType personType,
            IdentificationType identificationType,
            String identificationNumber,

            @Schema(nullable = true, description = "Only for a NIT")
            String checkDigit,

            String legalName,
            @Schema(nullable = true) String tradeName,
            List<String> taxLevelCodes,
            @Schema(enumeration = {"IVA", "NOT_APPLICABLE"}) String taxScheme,
            @Schema(nullable = true) Address address,
            @Schema(nullable = true) String email,
            @Schema(nullable = true) String phone,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt) {

        public static CustomerView from(CustomerEntity customer) {
            var party = customer.party;
            return new CustomerView(
                    customer.id,
                    customer.environment,
                    party.personType(),
                    party.identificationType(),
                    party.identificationNumber(),
                    party.checkDigit(),
                    party.legalName(),
                    party.tradeName(),
                    party.taxLevelCodes(),
                    "01".equals(party.taxSchemeId()) ? "IVA" : "NOT_APPLICABLE",
                    party.address(),
                    party.email(),
                    party.phone(),
                    customer.createdAt,
                    customer.updatedAt);
        }
    }

    public record CustomerPage(
            @Schema(description = "Newest first") List<CustomerView> items,

            @Schema(nullable = true, description = "Pass as before to get the next page")
            UUID nextCursor) {}

    public record ProductTax(TaxType type, BigDecimal percent) {}

    public record ProductView(
            UUID id,
            Environment environment,
            String code,
            String description,
            String unitCode,
            BigDecimal unitPrice,

            @Schema(description = "Empty for an item excluded from taxes")
            List<ProductTax> taxes,

            OffsetDateTime createdAt,
            OffsetDateTime updatedAt) {

        public static ProductView from(ProductEntity product) {
            return new ProductView(
                    product.id,
                    product.environment,
                    product.code,
                    product.description,
                    product.unitCode,
                    product.unitPrice,
                    product.taxes.stream()
                            .map(tax -> new ProductTax(tax.type(), tax.percent()))
                            .toList(),
                    product.createdAt,
                    product.updatedAt);
        }
    }

    public record ProductPage(
            @Schema(description = "Newest first") List<ProductView> items,

            @Schema(nullable = true, description = "Pass as before to get the next page")
            UUID nextCursor) {}
}
