package com.cantte.cetus.worker.notifications;

import com.cantte.cetus.persistence.entity.SupportTicketEntity.Priority;
import com.cantte.cetus.worker.support.SupportRecorder.Feedback;
import com.cantte.cetus.worker.support.SupportRecorder.Ticket;

/**
 * The emails of a support ticket: to the Cetus team, with the state the person saw, and the receipt to the
 * person. The values come from the ticket and are escaped in the HTML.
 */
public record SupportEmail(String subject, String html, String text) {

    /** @param consoleUrl base URL of the console, without a trailing slash */
    public static SupportEmail toTeam(Ticket ticket, String consoleUrl) {
        String url = consoleUrl + "/admin/support/" + ticket.id();
        String text = """
                %s de %s abrió el caso #%d con prioridad %s.

                %s

                Adjuntos: %d. Responde a este correo para escribirle. Detalle: %s

                Estado al abrir el caso:
                %s
                """.formatted(
                        ticket.userEmail(),
                        ticket.accountName(),
                        ticket.number(),
                        priority(ticket.priority()),
                        ticket.message(),
                        ticket.attachments().size(),
                        url,
                        ticket.context());
        String html = """
                <p>%s de %s abrió el caso #%d con prioridad <strong>%s</strong>.</p>
                <blockquote style="white-space:pre-wrap">%s</blockquote>
                <p>Adjuntos: %d. Responde a este correo para escribirle. <a href="%s">Ver el caso</a></p>
                <p>Estado al abrir el caso:</p>
                <pre style="font-size:12px">%s</pre>
                """.formatted(
                        escape(ticket.userEmail()),
                        escape(ticket.accountName()),
                        ticket.number(),
                        priority(ticket.priority()),
                        escape(ticket.message()),
                        ticket.attachments().size(),
                        escape(url),
                        escape(ticket.context()));
        String subject = "[Soporte #%d · %s] %s"
                .formatted(ticket.number(), priority(ticket.priority()), oneLine(ticket.accountName()));
        return new SupportEmail(subject, html, text);
    }

    public static SupportEmail receipt(Ticket ticket) {
        String text = """
                Recibimos tu caso #%d y el equipo de Cetus ya lo tiene. Te responderemos a este correo; si quieres \
                agregar algo, responde aquí mismo.

                Tu mensaje:
                %s
                """.formatted(ticket.number(), ticket.message());
        String html = """
                <p>Recibimos tu caso #%d y el equipo de Cetus ya lo tiene. Te responderemos a este correo; si quieres \
                agregar algo, responde aquí mismo.</p>
                <p>Tu mensaje:</p>
                <blockquote style="white-space:pre-wrap">%s</blockquote>
                """.formatted(ticket.number(), escape(ticket.message()));
        return new SupportEmail("[Cetus] Recibimos tu caso #%d".formatted(ticket.number()), html, text);
    }

    public static SupportEmail feedback(Feedback feedback) {
        String page = feedback.page() == null ? "sin página" : feedback.page();
        String text = """
                %s de %s compartió su opinión desde %s:

                %s
                """.formatted(feedback.userEmail(), feedback.accountName(), page, feedback.message());
        String html = """
                <p>%s de %s compartió su opinión desde %s:</p>
                <blockquote style="white-space:pre-wrap">%s</blockquote>
                """.formatted(
                escape(feedback.userEmail()), escape(feedback.accountName()), escape(page), escape(feedback.message()));
        return new SupportEmail("[Opinión] " + oneLine(feedback.accountName()), html, text);
    }

    private static String priority(Priority priority) {
        return switch (priority) {
            case CRITICAL -> "Crítica";
            case HIGH -> "Alta";
            case MEDIUM -> "Media";
            case LOW -> "Baja";
        };
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
