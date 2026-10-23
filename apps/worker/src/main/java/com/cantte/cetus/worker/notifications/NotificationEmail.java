package com.cantte.cetus.worker.notifications;

import com.cantte.cetus.notifications.NotificationKind;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

/**
 * Subject and body of a notice to an account's contacts. Each kind says what happened, what to do and
 * where in the console; the values come from the notice's data and are escaped in the HTML.
 */
public record NotificationEmail(String subject, String html, String text) {

    /** What happened, what to do about it, and the console page (path) where it is done. */
    private record Body(String subject, String what, String todo, String action, String path) {
    }

    /**
     * @param consoleUrl base URL of the console, without a trailing slash
     * @param link       for {@link NotificationKind#CONTACT_VERIFICATION}, the token of the link; null otherwise
     */
    public static NotificationEmail of(NotificationKind kind, String accountName, Map<String, String> data,
                                       String consoleUrl, String link) {
        Body body = body(kind, accountName, data, link);
        String url = consoleUrl + body.path();
        String text = """
                %s

                %s

                %s: %s

                Recibes este correo porque eres un contacto de %s en Cetus. Puedes cambiar los contactos en \
                Configuración > Contactos.
                """.formatted(body.what(), body.todo(), body.action(), url, accountName);
        String html = """
                <p>%s</p>
                <p>%s</p>
                <p><a href="%s">%s</a></p>
                <p style="color:#5f6368;font-size:12px">Recibes este correo porque eres un contacto de %s en Cetus. \
                Puedes cambiar los contactos en Configuración &gt; Contactos.</p>
                """.formatted(escape(body.what()), escape(body.todo()), escape(url), escape(body.action()),
                escape(accountName));
        return new NotificationEmail("[Cetus] " + body.subject(), html, text);
    }

    private static Body body(NotificationKind kind, String account, Map<String, String> data, String link) {
        return switch (kind) {
            case CONTACT_VERIFICATION -> new Body(
                    "Confirma tu correo para los avisos de " + account,
                    "Alguien de %s pidió que %s reciba los avisos %s de Cetus.".formatted(account, data.get("email"),
                            categories(data.get("categories"))),
                    "Si fuiste tú o te lo pidieron, confirma el correo con el enlace; vence en 48 horas. Si no esperabas "
                            + "este mensaje, ignóralo: no recibirás avisos.",
                    "Confirmar el correo", "/contact-verification/" + link);
            case WEBHOOK_FAILING -> new Body(
                    "Tu webhook está fallando",
                    "El webhook %s (%s) de %s lleva %s intentos fallidos seguidos desde el %s.".formatted(
                            data.get("url"), environment(data.get("environment")), account, data.get("failures"),
                            data.get("failingSince")),
                    "Si sigue fallando, lo desactivaremos y dejarás de recibir eventos. Revisa que responda 2xx "
                            + "y mira el detalle de cada intento en la consola.",
                    "Ver el webhook", "/developers/webhooks/" + data.get("endpointId"));
            case WEBHOOK_DISABLED -> new Body(
                    "Desactivamos tu webhook",
                    "Desactivamos el webhook %s (%s) de %s porque falló de forma continua desde el %s.".formatted(
                            data.get("url"), environment(data.get("environment")), account, data.get("failingSince")),
                    "Los eventos nuevos no se envían mientras esté desactivado. Cuando lo corrijas, reactívalo desde "
                            + "la consola; ahí puedes reenviar los eventos del periodo de falla.",
                    "Reactivar el webhook", "/developers/webhooks/" + data.get("endpointId"));
            case CERTIFICATE_EXPIRING -> new Body(
                    "El certificado de %s vence en %s".formatted(data.get("issuer"), days(data.get("days"))),
                    "El certificado de firma de %s (NIT %s) vence el %s.".formatted(data.get("issuer"), data.get("nit"),
                            data.get("validTo")),
                    "Sin un certificado vigente no se pueden firmar documentos y la facturación se detiene. Renueva el "
                            + "certificado con tu entidad de certificación y cárgalo en la consola antes de esa fecha.",
                    "Cargar el certificado", "/issuers/" + data.get("issuerId"));
            case RANGE_RUNNING_OUT -> new Body(
                    "El rango %s de %s va en %s%%".formatted(prefix(data.get("prefix")), data.get("issuer"),
                            data.get("threshold")),
                    "El rango de numeración %s de %s (NIT %s) ya usó el %s%%: le quedan %s de %s números.".formatted(
                            prefix(data.get("prefix")), data.get("issuer"), data.get("nit"), data.get("threshold"),
                            data.get("remaining"), data.get("total")),
                    "Cuando se agote no se podrán emitir más documentos con él. Solicita una nueva resolución de "
                            + "numeración en el portal de la DIAN y agrégala en la consola.",
                    "Ver el emisor", "/issuers/" + data.get("issuerId"));
            case RESOLUTION_EXPIRING -> new Body(
                    "La resolución del rango %s de %s vence en %s".formatted(prefix(data.get("prefix")),
                            data.get("issuer"), days(data.get("days"))),
                    "La resolución %s del rango %s de %s (NIT %s) está vigente hasta el %s.".formatted(
                            data.get("resolution"), prefix(data.get("prefix")), data.get("issuer"), data.get("nit"),
                            data.get("validTo")),
                    "Después de esa fecha no se podrán emitir documentos con ese rango. Solicita una nueva resolución "
                            + "en el portal de la DIAN y agrégala en la consola.",
                    "Ver el emisor", "/issuers/" + data.get("issuerId"));
            case REJECTIONS_SPIKE -> new Body(
                    "Aumentaron los rechazos de la DIAN",
                    "El %s la DIAN rechazó %s de los %s documentos de %s (%s%%).".formatted(data.get("date"),
                            data.get("rejected"), data.get("total"), account, data.get("rate")),
                    "Los documentos rechazados no tienen validez fiscal. Revisa las reglas de rechazo de cada documento "
                            + "y corrige los datos o la integración antes de emitirlos de nuevo.",
                    "Ver los documentos", "/documents");
            case ACCOUNT_SUSPENDED -> new Body(
                    "Suspendimos la cuenta de " + account,
                    "Suspendimos la cuenta de %s en Cetus. Motivo: %s".formatted(account, data.get("reason")),
                    "Mientras esté suspendida, las llaves de API no funcionan y la consola es de solo lectura. Los "
                            + "documentos que ya estaban en cola se terminan de procesar. Comunícate con el equipo de Cetus "
                            + "para reactivarla.",
                    "Abrir la consola", "/");
        };
    }

    /** "TECHNICAL,FISCAL" → "técnicos (…) y fiscales (…)". */
    private static String categories(String categories) {
        List<String> names = Arrays.stream(categories.split(",")).map(NotificationEmail::category).toList();
        return names.size() == 1 ? names.get(0)
                : String.join(", ", names.subList(0, names.size() - 1)) + " y " + names.get(names.size() - 1);
    }

    private static String category(String category) {
        return switch (category) {
            case "TECHNICAL" -> "técnicos (webhooks y errores de integración)";
            case "FISCAL" -> "fiscales (certificado, numeración y rechazos de la DIAN)";
            case "BILLING" -> "de facturación (plan y pagos)";
            default -> category;
        };
    }

    private static String environment(String environment) {
        return "LIVE".equals(environment) ? "producción" : "pruebas";
    }

    private static String days(String days) {
        return "1".equals(days) ? "1 día" : days + " días";
    }

    private static String prefix(String prefix) {
        return prefix == null || prefix.isEmpty() ? "sin prefijo" : prefix;
    }

    private static String escape(String value) {
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }
}
