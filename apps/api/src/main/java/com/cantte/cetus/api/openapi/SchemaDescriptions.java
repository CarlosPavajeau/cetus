package com.cantte.cetus.api.openapi;

import com.cantte.cetus.domain.model.CorrectionConcept;
import com.cantte.cetus.domain.model.CreditNoteConcept;
import com.cantte.cetus.domain.model.DebitNoteConcept;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import org.eclipse.microprofile.openapi.models.media.Schema;

/**
 * Descriptions for the schemas whose Java types cannot carry {@code @Schema}: the domain module depends on no
 * framework, and an enum's values need one line each. Every value must be described, so a new one fails the build
 * until it is documented.
 */
final class SchemaDescriptions {

    private record EnumDescription(String summary, Map<String, String> values) {}

    private static final Map<String, EnumDescription> ENUMS = Map.ofEntries(
            Map.entry(
                    "Environment",
                    new EnumDescription(
                            "Ambiente, definido por la llave.",
                            ordered(
                                    "LIVE", "Producción: documentos con validez fiscal.",
                                    "TEST", "Pruebas de habilitación ante la DIAN.",
                                    "SANDBOX", "Simulación de Cetus: nada llega a la DIAN."))),
            Map.entry(
                    "DocumentStatus",
                    new EnumDescription(
                            "Estado del documento ante la DIAN.",
                            ordered(
                                    "RECEIVED", "Recibido y numerado; en cola.",
                                    "PROCESSING", "Cetus lo está generando, firmando o enviando.",
                                    "SUBMITTED", "Enviado; Cetus espera la respuesta de la DIAN.",
                                    "ACCEPTED", "La DIAN lo aceptó. Es definitivo.",
                                    "REJECTED",
                                            "La DIAN lo rechazó. Es definitivo: `dian.errors` dice por qué; corrige y "
                                                    + "emite un documento nuevo.",
                                    "FAILED",
                                            "Un intento falló. Si Cetus todavía reintenta, vuelve a `PROCESSING`; el "
                                                    + "webhook `*.failed` avisa cuando ya no hay más reintentos."))),
            Map.entry(
                    "PersonType",
                    new EnumDescription(
                            "Tipo de persona.",
                            ordered("LEGAL_ENTITY", "Persona jurídica.", "NATURAL_PERSON", "Persona natural."))),
            Map.entry(
                    "IdentificationType",
                    new EnumDescription(
                            "Tipo de documento de identificación; entre paréntesis, su código DIAN.",
                            ordered(
                                    "CIVIL_REGISTRY", "Registro civil (11).",
                                    "IDENTITY_CARD", "Tarjeta de identidad (12).",
                                    "CITIZEN_ID", "Cédula de ciudadanía (13).",
                                    "FOREIGNER_CARD", "Tarjeta de extranjería (21).",
                                    "FOREIGNER_ID", "Cédula de extranjería (22).",
                                    "NIT", "NIT (31).",
                                    "PASSPORT", "Pasaporte (41).",
                                    "FOREIGN_DOCUMENT", "Documento de identificación extranjero (42).",
                                    "PEP", "Permiso especial de permanencia (47).",
                                    "FOREIGN_NIT", "NIT de otro país (50).",
                                    "NUIP", "NUIP (91)."))),
            Map.entry(
                    "TaxType",
                    new EnumDescription(
                            "Impuesto.",
                            ordered(
                                    "IVA", "Impuesto al valor agregado.",
                                    "ICA", "Impuesto de industria y comercio.",
                                    "INC", "Impuesto nacional al consumo."))),
            Map.entry(
                    "PaymentMethod",
                    new EnumDescription(
                            "Forma de pago.", ordered("CASH", "Contado.", "CREDIT", "Crédito: exige `dueDate`."))),
            Map.entry(
                    "CustomerTaxScheme",
                    new EnumDescription(
                            "Régimen de IVA del adquiriente.",
                            ordered("IVA", "Responsable de IVA.", "NOT_APPLICABLE", "No responsable de IVA."))),
            Map.entry("CreditNoteConcept", concepts("nota crédito", "13.2.4", CreditNoteConcept.values())),
            Map.entry("DebitNoteConcept", concepts("nota débito", "13.2.5", DebitNoteConcept.values())),
            Map.entry(
                    "IssuerStatus",
                    new EnumDescription(
                            "Estado de configuración del emisor ante la DIAN.",
                            ordered(
                                    "ONBOARDING", "En configuración: todavía no emite.",
                                    "TESTING", "En el set de pruebas de habilitación: emite solo con llaves `test`.",
                                    "ENABLED", "Habilitado: emite en su ambiente.",
                                    "DISABLED", "Deshabilitado: no emite."))),
            Map.entry(
                    "DeliveryStatus",
                    new EnumDescription(
                            "Estado de la entrega. `SKIPPED`, `BOUNCED`, `COMPLAINED` y `FAILED` significan que no "
                                    + "llegó: entrega el documento por tu cuenta.",
                            ordered(
                                    "PENDING", "En cola.",
                                    "SENT", "El proveedor de correo la recibió.",
                                    "DELIVERED", "Llegó al buzón del destinatario.",
                                    "BOUNCED", "Rebotó.",
                                    "COMPLAINED", "El destinatario la marcó como correo no deseado.",
                                    "SKIPPED", "No se envió: no había a quién enviarla.",
                                    "FAILED", "El proveedor de correo la rechazó."))),
            Map.entry("Channel", new EnumDescription("Canal de entrega.", ordered("EMAIL", "Correo electrónico."))));

    /** Members of the domain's Address, which responses return as is. */
    private static final Map<String, Map<String, String>> PROPERTIES = Map.of(
            "Address",
            Map.of(
                    "municipalityCode", "Código DIVIPOLA del municipio.",
                    "cityName", "Nombre del municipio.",
                    "departmentCode", "Código DIVIPOLA del departamento.",
                    "departmentName", "Nombre del departamento.",
                    "postalCode", "Código postal.",
                    "line", "Dirección.",
                    "countryCode", "País ISO 3166-1 alfa-2.",
                    "countryName", "Nombre del país."));

    private SchemaDescriptions() {}

    static void apply(Map<String, Schema> schemas) {
        ENUMS.forEach((name, description) -> describeEnum(name, schemas.get(name), description));
        PROPERTIES.forEach((name, members) -> {
            Map<String, Schema> properties =
                    Objects.requireNonNull(schemas.get(name), name).getProperties();
            if (!properties.keySet().equals(members.keySet())) {
                throw new IllegalStateException(name + " has " + properties.keySet() + "; describe each member");
            }
            members.forEach((member, text) -> properties.get(member).setDescription(text));
        });
    }

    private static void describeEnum(String name, Schema schema, EnumDescription description) {
        Objects.requireNonNull(schema, name);
        List<String> values =
                schema.getEnumeration().stream().map(String::valueOf).toList();
        if (!values.equals(List.copyOf(description.values().keySet()))) {
            throw new IllegalStateException(
                    name + " has " + values + "; describe each value in " + SchemaDescriptions.class.getSimpleName());
        }
        schema.setDescription(description.summary() + "\n\n"
                + description.values().entrySet().stream()
                        .map(value -> "- `" + value.getKey() + "`: " + value.getValue())
                        .collect(Collectors.joining("\n")));
    }

    private static <E extends Enum<E> & CorrectionConcept> EnumDescription concepts(
            String document, String table, E[] values) {
        Map<String, String> described = new LinkedHashMap<>();
        Arrays.stream(values)
                .forEach(concept ->
                        described.put(concept.name(), concept.dianName() + " (" + concept.dianCode() + ")."));
        return new EnumDescription("Concepto de la " + document + " (tabla " + table + " del anexo).", described);
    }

    private static Map<String, String> ordered(String... pairs) {
        Map<String, String> values = new LinkedHashMap<>();
        for (int i = 0; i < pairs.length; i += 2) {
            values.put(pairs[i], pairs[i + 1]);
        }
        return values;
    }
}
