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
    private record Body(String subject, String what, String todo, String action, String path) {}

    /**
     * @param consoleUrl base URL of the console, without a trailing slash
     * @param link       for {@link NotificationKind#CONTACT_VERIFICATION}, the token of the link; null otherwise
     */
    public static NotificationEmail of(
            NotificationKind kind, String accountName, Map<String, String> data, String consoleUrl, String link) {
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
                """.formatted(
                escape(body.what()), escape(body.todo()), escape(url), escape(body.action()), escape(accountName));
        return new NotificationEmail("[Cetus] " + body.subject(), html, text);
    }

    private static Body body(NotificationKind kind, String account, Map<String, String> data, String link) {
        return switch (kind) {
            case CONTACT_VERIFICATION ->
                new Body(
                        "Confirma tu correo para los avisos de " + account,
                        "Alguien de %s pidió que %s reciba los avisos %s de Cetus."
                                .formatted(account, data.get("email"), categories(data.get("categories"))),
                        "Si fuiste tú o te lo pidieron, confirma el correo con el enlace; vence en 48 horas. Si no esperabas "
                                + "este mensaje, ignóralo: no recibirás avisos.",
                        "Confirmar el correo",
                        "/contact-verification/" + link);
            case WEBHOOK_FAILING ->
                new Body(
                        "Tu webhook está fallando",
                        "El webhook %s (%s) de %s lleva %s intentos fallidos seguidos desde el %s."
                                .formatted(
                                        data.get("url"),
                                        environment(data.get("environment")),
                                        account,
                                        data.get("failures"),
                                        data.get("failingSince")),
                        "Si sigue fallando, lo desactivaremos y dejarás de recibir eventos. Revisa que responda 2xx "
                                + "y mira el detalle de cada intento en la consola.",
                        "Ver el webhook",
                        "/developers/webhooks/" + data.get("endpointId"));
            case WEBHOOK_DISABLED ->
                new Body(
                        "Desactivamos tu webhook",
                        "Desactivamos el webhook %s (%s) de %s porque falló de forma continua desde el %s."
                                .formatted(
                                        data.get("url"),
                                        environment(data.get("environment")),
                                        account,
                                        data.get("failingSince")),
                        "Los eventos nuevos no se envían mientras esté desactivado. Cuando lo corrijas, reactívalo desde "
                                + "la consola; ahí puedes reenviar los eventos del periodo de falla.",
                        "Reactivar el webhook",
                        "/developers/webhooks/" + data.get("endpointId"));
            case CERTIFICATE_EXPIRING ->
                new Body(
                        "El certificado de %s vence en %s".formatted(data.get("issuer"), days(data.get("days"))),
                        "El certificado de firma de %s (NIT %s) vence el %s."
                                .formatted(data.get("issuer"), data.get("nit"), data.get("validTo")),
                        "Sin un certificado vigente no se pueden firmar documentos y la facturación se detiene. Renueva el "
                                + "certificado con tu entidad de certificación y cárgalo en la consola antes de esa fecha.",
                        "Cargar el certificado",
                        "/issuers/" + data.get("issuerId"));
            case RANGE_RUNNING_OUT ->
                new Body(
                        "El rango %s de %s va en %s%%"
                                .formatted(prefix(data.get("prefix")), data.get("issuer"), data.get("threshold")),
                        "El rango de numeración %s de %s (NIT %s) ya usó el %s%%: le quedan %s de %s números."
                                .formatted(
                                        prefix(data.get("prefix")),
                                        data.get("issuer"),
                                        data.get("nit"),
                                        data.get("threshold"),
                                        data.get("remaining"),
                                        data.get("total")),
                        "Cuando se agote no se podrán emitir más documentos con él. Solicita una nueva resolución de "
                                + "numeración en el portal de la DIAN y agrégala en la consola.",
                        "Ver el emisor",
                        "/issuers/" + data.get("issuerId"));
            case RESOLUTION_EXPIRING ->
                new Body(
                        "La resolución del rango %s de %s vence en %s"
                                .formatted(prefix(data.get("prefix")), data.get("issuer"), days(data.get("days"))),
                        "La resolución %sdel rango %s de %s (NIT %s) está vigente hasta el %s."
                                .formatted(
                                        data.getOrDefault("resolution", "").isEmpty()
                                                ? ""
                                                : data.get("resolution") + " ",
                                        prefix(data.get("prefix")),
                                        data.get("issuer"),
                                        data.get("nit"),
                                        data.get("validTo")),
                        "Después de esa fecha no se podrán emitir documentos con ese rango. Solicita una nueva resolución "
                                + "en el portal de la DIAN y agrégala en la consola.",
                        "Ver el emisor",
                        "/issuers/" + data.get("issuerId"));
            case REJECTIONS_SPIKE ->
                new Body(
                        "Aumentaron los rechazos de la DIAN",
                        "El %s la DIAN rechazó %s de los %s documentos de %s (%s%%)."
                                .formatted(
                                        data.get("date"),
                                        data.get("rejected"),
                                        data.get("total"),
                                        account,
                                        data.get("rate")),
                        "Los documentos rechazados no tienen validez fiscal. Revisa las reglas de rechazo de cada documento "
                                + "y corrige los datos o la integración antes de emitirlos de nuevo.",
                        "Ver los documentos",
                        "/documents");
            case ACCOUNT_SUSPENDED ->
                new Body(
                        "Suspendimos la cuenta de " + account,
                        "Suspendimos la cuenta de %s en Cetus. Motivo: %s".formatted(account, data.get("reason")),
                        "Mientras esté suspendida, las llaves de API no funcionan y la consola es de solo lectura. Los "
                                + "documentos que ya estaban en cola se terminan de procesar. Comunícate con el equipo de Cetus "
                                + "para reactivarla.",
                        "Abrir la consola",
                        "/");
            case PLAN_USAGE ->
                new Body(
                        "100".equals(data.get("percent"))
                                ? "Usaste todos los documentos de tu plan " + data.get("plan")
                                : "Usaste el %s%% de tu plan %s".formatted(data.get("percent"), data.get("plan")),
                        "%s lleva %s de los %s documentos que incluye el plan %s en %s."
                                .formatted(
                                        account,
                                        data.get("total"),
                                        data.get("included"),
                                        data.get("plan"),
                                        data.get("period")),
                        data.containsKey("limit")
                                ? ("Al llegar a %s documentos en el mes, la emisión en producción se detiene hasta el"
                                                + " mes siguiente; las notas crédito siempre se pueden emitir. Para"
                                                + " seguir facturando, escríbenos y elige un plan.")
                                        .formatted(data.get("limit"))
                                : "La facturación no se detiene: %s Si esperas más volumen, escríbenos para cambiar de plan."
                                        .formatted(
                                                data.containsKey("priceOverage")
                                                        ? "cada documento adicional se cobra a %s."
                                                                .formatted(data.get("priceOverage"))
                                                        : "los documentos adicionales se cobran según tu contrato."),
                        "Ver la facturación",
                        "/billing");
            case ISSUERS_OVER_LIMIT ->
                new Body(
                        "Tienes más emisores en producción de los que incluye tu plan",
                        "%s tiene %s emisores en producción y su suscripción y paquetes vigentes incluyen %s."
                                .formatted(account, data.get("issuers"), data.get("included")),
                        "Tus emisores siguen activos y facturando, pero no puedes agregar otros hasta comprar un paquete"
                                + " que incluya más emisores.",
                        "Ver los productos",
                        "/billing/products");
            case CREDITS_USAGE ->
                new Body(
                        "Usaste el %s%% de tus créditos".formatted(data.get("percent")),
                        "%s usó el %s%% de los %s créditos de sus paquetes y recargas vigentes: le quedan %s."
                                .formatted(account, data.get("percent"), data.get("granted"), data.get("available")),
                        "Cuando se acaben, podrás emitir unos documentos más dentro del margen de cortesía de tu"
                                + " paquete; después, solo notas crédito. Compra una recarga para seguir facturando sin"
                                + " interrupciones.",
                        "Comprar créditos",
                        "/billing/products");
            case CREDITS_GRACE ->
                new Body(
                        "Se acabaron tus créditos: estás usando el margen de cortesía",
                        "%s no tiene créditos disponibles y ya emitió %s de los %s documentos del margen de cortesía."
                                .formatted(account, data.get("graceUsed"), data.get("graceMargin")),
                        "Al agotar el margen, la emisión en producción se detiene; las notas crédito siempre se pueden"
                                + " emitir. Los documentos del margen se descuentan del siguiente paquete o recarga que"
                                + " compres.",
                        "Comprar créditos",
                        "/billing/products");
            case SUBSCRIPTION_RENEWAL ->
                new Body(
                        "Renueva tu suscripción %s".formatted(data.get("plan")),
                        "Empezó un nuevo periodo de la suscripción %s de %s, hasta el %s. La orden de renovación por %s"
                                        .formatted(data.get("plan"), account, data.get("periodEnd"), data.get("total"))
                                + " incluye la mensualidad y %s documentos de excedente del periodo anterior."
                                        .formatted(data.get("overage")),
                        "Págala antes del %s para recibir los documentos del periodo. Mientras tanto puedes seguir"
                                        .formatted(data.get("dueBy"))
                                + " emitiendo; si no se paga, la suscripción se cancela.",
                        "Pagar la renovación",
                        "/billing/orders/" + data.get("orderId"));
            case SUBSCRIPTION_PAST_DUE ->
                new Body(
                        "Tu suscripción %s tiene un pago pendiente".formatted(data.get("plan")),
                        "La renovación de la suscripción %s de %s por %s sigue sin pagarse."
                                .formatted(data.get("plan"), account, data.get("total")),
                        "Si no se paga antes del %s, la suscripción se cancela y la emisión en producción se detiene"
                                        .formatted(data.get("dueBy"))
                                + " cuando se acaben los documentos ya otorgados.",
                        "Pagar la renovación",
                        "/billing/orders/" + data.get("orderId"));
            case SUBSCRIPTION_CANCELED ->
                new Body(
                        "Tu suscripción %s terminó".formatted(data.get("plan")),
                        "La suscripción %s de %s terminó el %s %s."
                                .formatted(
                                        data.get("plan"),
                                        account,
                                        data.get("canceledAt"),
                                        switch (data.get("reason")) {
                                            case "UNPAID" -> "porque su renovación no se pagó";
                                            case "REFUNDED" -> "porque se reembolsó su pago";
                                            case "CHARGEBACK" -> "porque el banco reversó su pago";
                                            case null, default -> "como se pidió";
                                        }),
                        "Los documentos ya otorgados conservan su vigencia. Para seguir emitiendo en producción después"
                                + " de usarlos, contrata una suscripción o un paquete.",
                        "Ver los productos",
                        "/billing/products");
            case SUBSCRIPTION_OVERAGE ->
                new Body(
                        "Usaste el %s%% de tu límite de excedente".formatted(data.get("percent")),
                        "%s emitió %s documentos de excedente en este periodo de su suscripción %s; su límite es %s."
                                .formatted(account, data.get("used"), data.get("plan"), data.get("limit")),
                        "Cada documento de excedente se cobra al cierre del periodo. Al llegar al límite, la emisión en"
                                + " producción se detiene hasta el siguiente periodo, salvo las notas crédito; el dueño"
                                + " de la cuenta puede ampliarlo en Facturación.",
                        "Ver la suscripción",
                        "/billing");
            case SUBSCRIPTION_CHARGE_SCHEDULED ->
                new Body(
                        "Cobraremos tu renovación de %s".formatted(data.get("plan")),
                        "Empezó un nuevo periodo de la suscripción %s de %s, hasta el %s. Cobraremos %s a tu tarjeta %s"
                                        .formatted(
                                                data.get("plan"),
                                                account,
                                                data.get("periodEnd"),
                                                data.get("total"),
                                                data.get("card"))
                                + ": la mensualidad y %s documentos de excedente del periodo anterior."
                                        .formatted(data.get("overage")),
                        "No tienes que hacer nada. Si el cobro no pasa te avisaremos; también puedes pagar la renovación"
                                + " con otro medio antes del %s.".formatted(data.get("dueBy")),
                        "Ver la renovación",
                        "/billing/orders/" + data.get("orderId"));
            case SUBSCRIPTION_CHARGE_FAILED ->
                new Body(
                        "No pudimos cobrar tu renovación de %s".formatted(data.get("plan")),
                        "Tu tarjeta %s no aceptó el cobro de %s de la renovación de la suscripción %s de %s%s."
                                .formatted(
                                        data.get("card"),
                                        data.get("total"),
                                        data.get("plan"),
                                        account,
                                        data.get("reason").isEmpty() ? "" : " (" + data.get("reason") + ")"),
                        (data.get("retryAt").isEmpty()
                                        ? "No volveremos a intentarlo."
                                        : "Lo intentaremos de nuevo el %s.".formatted(data.get("retryAt")))
                                + " Paga la renovación con otro medio o cambia la tarjeta antes del %s; si no se paga,"
                                        .formatted(data.get("dueBy"))
                                + " la suscripción se cancela.",
                        "Pagar la renovación",
                        "/billing/orders/" + data.get("orderId"));
            case PAYMENT_METHOD_EXPIRING ->
                new Body(
                        "Tu tarjeta %s %s"
                                .formatted(
                                        data.get("card"),
                                        "true".equals(data.get("expired")) ? "venció" : "está por vencer"),
                        "La tarjeta %s con la que %s paga su suscripción %s en %s."
                                .formatted(
                                        data.get("card"),
                                        account,
                                        "true".equals(data.get("expired")) ? "venció" : "vence",
                                        data.get("expiry")),
                        "Cámbiala antes de la próxima renovación para que el cobro automático no falle.",
                        "Cambiar la tarjeta",
                        "/billing");
            case ORDER_REFUNDED ->
                new Body(
                        "Reembolsamos %s de tu orden %s".formatted(data.get("amount"), data.get("reference")),
                        "Devolvimos %s de la orden %s de %s al medio con el que se pagó."
                                .formatted(data.get("amount"), data.get("reference"), account),
                        "Los documentos que la orden incluía y no se habían usado ya no están disponibles. El dinero"
                                + " puede tardar unos días en verse, según tu banco.",
                        "Ver la orden",
                        "/billing/orders/" + data.get("orderId"));
            case ACCOUNT_DEBT ->
                new Body(
                        "Tienes un saldo pendiente de %s".formatted(data.get("total")),
                        "%s tiene un saldo pendiente de %s por %s."
                                .formatted(account, data.get("total"), data.get("concept")),
                        "Págalo para volver a comprar paquetes, recargas o suscripciones; mientras tanto puedes seguir"
                                + " emitiendo con lo que tengas disponible.",
                        "Pagar el saldo",
                        "/billing/orders/" + data.get("orderId"));
        };
    }

    /** "TECHNICAL,FISCAL" → "técnicos (…) y fiscales (…)". */
    private static String categories(String categories) {
        List<String> names = Arrays.stream(categories.split(","))
                .map(NotificationEmail::category)
                .toList();
        return names.size() == 1
                ? names.getFirst()
                : String.join(", ", names.subList(0, names.size() - 1)) + " y " + names.getLast();
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
        return switch (environment) {
            case "LIVE" -> "producción";
            case "SANDBOX" -> "simulación";
            default -> "pruebas";
        };
    }

    private static String days(String days) {
        return "1".equals(days) ? "1 día" : days + " días";
    }

    private static String prefix(String prefix) {
        return prefix == null || prefix.isEmpty() ? "sin prefijo" : prefix;
    }

    private static String escape(String value) {
        return value.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }
}
