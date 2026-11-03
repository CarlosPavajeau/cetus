package com.cantte.cetus.worker.notifications;

import com.cantte.cetus.domain.dian.InvoicingObligation;
import com.cantte.cetus.domain.dian.InvoicingObligation.Answer;
import com.cantte.cetus.domain.dian.InvoicingObligation.Answers;
import com.cantte.cetus.domain.dian.InvoicingObligation.Verdict;
import com.cantte.cetus.domain.model.PersonType;
import com.cantte.cetus.persistence.entity.LeadEntity.Integration;
import com.cantte.cetus.worker.support.LeadRecorder.CalculatorLead;
import com.cantte.cetus.worker.support.LeadRecorder.IntegrationLead;
import com.cantte.cetus.worker.support.LeadRecorder.Lead;
import com.cantte.cetus.worker.support.LeadRecorder.PartnerLead;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * The emails of a lead: to the Cetus team, with what the person filled in, and the calculator's result to the
 * person. The visitor's email carries no free text from the form, so the form cannot be used to send someone
 * else arbitrary content. Values are escaped in the HTML.
 */
public record LeadEmail(String subject, String html, String text) {

    /** The path of the calculator in the console. */
    public static final String CALCULATOR_PATH = "/estoy-obligado-a-facturar";

    private record Field(String label, String value) {}

    public static LeadEmail toTeam(Lead lead) {
        List<Field> fields = new ArrayList<>();
        fields.add(new Field("Correo", lead.email()));
        String form = switch (lead) {
            case CalculatorLead calculator -> {
                fields.add(new Field("Resultado", verdict(InvoicingObligation.assess(calculator.answers()))));
                fields.addAll(answers(calculator.answers()));
                yield "Calculadora";
            }
            case PartnerLead partner -> {
                fields.add(new Field("Nombre", partner.details().name()));
                fields.add(new Field("Empresa", orDash(partner.details().company())));
                fields.add(new Field("Teléfono", orDash(partner.details().phone())));
                fields.add(new Field(
                        "Empresas que maneja", String.valueOf(partner.details().companies())));
                fields.add(new Field("Mensaje", orDash(partner.details().message())));
                yield "Socios";
            }
            case IntegrationLead integration -> {
                fields.add(new Field(
                        "Integración", integration(integration.details().integration())));
                yield "Avísame";
            }
        };
        String text = "Llegó un prospecto desde el formulario «%s». Responde a este correo para escribirle.%n%n%s%n"
                .formatted(
                        form,
                        fields.stream()
                                .map(field -> field.label() + ": " + field.value())
                                .collect(Collectors.joining("\n")));
        String html = """
                <p>Llegó un prospecto desde el formulario «%s». Responde a este correo para escribirle.</p>
                <table>%s</table>
                """.formatted(
                form,
                fields.stream()
                        .map(field -> "<tr><th align=\"left\">%s</th><td style=\"white-space:pre-wrap\">%s</td></tr>"
                                .formatted(field.label(), escape(field.value())))
                        .collect(Collectors.joining()));
        return new LeadEmail("[Prospecto · %s] %s".formatted(form, oneLine(lead.email())), html, text);
    }

    /** @param consoleUrl base URL of the console, without a trailing slash */
    public static LeadEmail result(CalculatorLead lead, String consoleUrl) {
        Verdict verdict = InvoicingObligation.assess(lead.answers());
        String calculatorUrl = consoleUrl + CALCULATOR_PATH;
        String signUpUrl = consoleUrl + "/sign-up?audience=negocio&ref=calculadora";
        List<Field> answers = answers(lead.answers());
        String text = """
                %s

                Tus respuestas:
                %s

                Es una guía orientativa con las reglas generales de la DIAN; confírmalo con tu contador.

                Cuando necesites facturar, en Cetus empiezas gratis: %s
                Vuelve a la calculadora: %s

                Recibes este correo porque lo pediste en la calculadora de Cetus. No te escribiremos de nuevo por ella.
                """.formatted(
                        explanation(verdict),
                        answers.stream()
                                .map(field -> "- " + field.label() + ": " + field.value())
                                .collect(Collectors.joining("\n")),
                        signUpUrl,
                        calculatorUrl);
        String html = """
                <p><strong>%s</strong></p>
                <p>Tus respuestas:</p>
                <ul>%s</ul>
                <p>Es una guía orientativa con las reglas generales de la DIAN; confírmalo con tu contador.</p>
                <p>Cuando necesites facturar, en Cetus <a href="%s">empiezas gratis</a>. \
                <a href="%s">Vuelve a la calculadora</a>.</p>
                <p style="color:#666;font-size:12px">Recibes este correo porque lo pediste en la calculadora de Cetus. \
                No te escribiremos de nuevo por ella.</p>
                """.formatted(
                        escape(explanation(verdict)),
                        answers.stream()
                                .map(field -> "<li>%s: %s</li>".formatted(field.label(), field.value()))
                                .collect(Collectors.joining()),
                        escape(signUpUrl),
                        escape(calculatorUrl));
        return new LeadEmail("[Cetus] " + verdict(verdict), html, text);
    }

    /** The name of the provider's list for an upcoming integration. */
    public static String waitlist(Integration integration) {
        return "Avísame · " + integration(integration);
    }

    static String explanation(Verdict verdict) {
        return switch (verdict) {
            case OBLIGATED -> "Según tus respuestas, debes expedir factura electrónica.";
            case NOT_OBLIGATED ->
                "Según tus respuestas, no estás obligado a expedir factura electrónica. Puedes hacerlo de forma"
                        + " voluntaria.";
            case REVIEW ->
                "Con tus respuestas no podemos saberlo: respondiste «No sé» a alguna pregunta. Revísalo con tu"
                        + " contador.";
        };
    }

    private static String verdict(Verdict verdict) {
        return switch (verdict) {
            case OBLIGATED -> "Estás obligado a facturar electrónicamente";
            case NOT_OBLIGATED -> "No estás obligado a facturar electrónicamente";
            case REVIEW -> "Revisa con tu contador si debes facturar electrónicamente";
        };
    }

    private static List<Field> answers(Answers answers) {
        List<Field> fields = new ArrayList<>();
        fields.add(new Field(
                "Tipo de persona",
                answers.personType() == PersonType.LEGAL_ENTITY ? "Persona jurídica" : "Persona natural"));
        if (answers.personType() == PersonType.NATURAL_PERSON) {
            fields.add(new Field("Inscrita en el régimen SIMPLE", answer(answers.simpleRegime())));
            fields.add(new Field(
                    "Ingresos brutos de 3.500 UVT o más, el año pasado o este", answer(answers.incomeOverCap())));
            fields.add(new Field("Más de un establecimiento", answer(answers.severalEstablishments())));
            fields.add(new Field(
                    "Franquicias, usuario aduanero, o contratos o consignaciones de 3.500 UVT o más",
                    answer(answers.otherConditions())));
        }
        return fields;
    }

    private static String answer(Answer answer) {
        return switch (answer) {
            case YES -> "Sí";
            case NO -> "No";
            case UNKNOWN -> "No sé";
        };
    }

    private static String integration(Integration integration) {
        return switch (integration) {
            case WOOCOMMERCE -> "WooCommerce";
            case SHOPIFY -> "Shopify";
            case AUTOMATIONS -> "n8n, Make y Zapier";
            case PAYMENTS -> "Wompi y Bold";
        };
    }

    private static String orDash(String value) {
        return value == null ? "—" : value;
    }

    private static String oneLine(String value) {
        return value.replaceAll("[\\r\\n]+", " ");
    }

    private static String escape(String value) {
        return value.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }
}
