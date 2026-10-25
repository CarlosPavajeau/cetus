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

    @Schema(description = "Un cliente guardado.")
    public record CustomerView(
            @Schema(description = "Identificador del cliente.")
            UUID id,

            @Schema(description = "Ambiente del cliente: el de la llave.")
            Environment environment,

            @Schema(description = "Persona natural o jurídica.")
            PersonType personType,

            @Schema(description = "Tipo de documento de identificación.")
            IdentificationType identificationType,

            @Schema(description = "Número de identificación.", example = "900123456")
            String identificationNumber,

            @Schema(nullable = true, description = "Dígito de verificación; solo para un NIT.", example = "8")
            String checkDigit,

            @Schema(description = "Razón social o nombre completo.")
            String legalName,

            @Schema(nullable = true, description = "Nombre comercial.")
            String tradeName,

            @Schema(description = "Responsabilidades fiscales del RUT.")
            List<String> taxLevelCodes,

            @Schema(
                    enumeration = {"IVA", "NOT_APPLICABLE"},
                    description = "Si es responsable de IVA.")
            String taxScheme,

            @Schema(nullable = true, description = "Dirección.")
            Address address,

            @Schema(nullable = true, description = "Correo de entrega de documentos.")
            String email,

            @Schema(nullable = true, description = "Teléfono.")
            String phone,

            @Schema(description = "Cuándo se creó.") OffsetDateTime createdAt,

            @Schema(description = "Cuándo cambió por última vez.")
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

    @Schema(description = "Una página de clientes.")
    public record CustomerPage(
            @Schema(description = "Del más reciente al más antiguo.")
            List<CustomerView> items,

            @Schema(nullable = true, description = "Envíalo como `before` para la siguiente página; nulo en la última.")
            UUID nextCursor) {}

    @Schema(description = "Un impuesto de un producto.")
    public record ProductTax(
            @Schema(description = "Impuesto.") TaxType type,

            @Schema(description = "Tarifa en porcentaje.", example = "19")
            BigDecimal percent) {}

    @Schema(description = "Un producto o servicio guardado.")
    public record ProductView(
            @Schema(description = "Identificador del producto.")
            UUID id,

            @Schema(description = "Ambiente del producto: el de la llave.")
            Environment environment,

            @Schema(description = "Tu código del producto.", example = "PROD-001")
            String code,

            @Schema(description = "Descripción.") String description,

            @Schema(description = "Código de unidad de medida de la DIAN.", example = "94")
            String unitCode,

            @Schema(description = "Precio unitario antes de impuestos.")
            BigDecimal unitPrice,

            @Schema(description = "Impuestos por defecto; vacío si está excluido de impuestos.")
            List<ProductTax> taxes,

            @Schema(description = "Cuándo se creó.") OffsetDateTime createdAt,

            @Schema(description = "Cuándo cambió por última vez.")
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

    @Schema(description = "Una página de productos.")
    public record ProductPage(
            @Schema(description = "Del más reciente al más antiguo.")
            List<ProductView> items,

            @Schema(nullable = true, description = "Envíalo como `before` para la siguiente página; nulo en la última.")
            UUID nextCursor) {}
}
