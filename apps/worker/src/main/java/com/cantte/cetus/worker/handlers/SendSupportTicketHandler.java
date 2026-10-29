package com.cantte.cetus.worker.handlers;

import com.cantte.cetus.aws.DocumentStorage;
import com.cantte.cetus.email.EmailMessage;
import com.cantte.cetus.email.EmailRateLimited;
import com.cantte.cetus.email.EmailRejectedException;
import com.cantte.cetus.email.EmailSender;
import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.persistence.entity.JobEntity;
import com.cantte.cetus.worker.notifications.SupportEmail;
import com.cantte.cetus.worker.runner.GiveUp;
import com.cantte.cetus.worker.runner.JobHandler;
import com.cantte.cetus.worker.runner.RetryLater;
import com.cantte.cetus.worker.support.EmailClients;
import com.cantte.cetus.worker.support.SupportRecorder;
import com.cantte.cetus.worker.support.SupportRecorder.Ticket;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.util.List;
import java.util.Optional;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

/**
 * Emails a support ticket to the Cetus support mailbox, with its attachments and the person as Reply-To, and
 * then the receipt to the person, with the mailbox as Reply-To: the conversation goes on by email. Each email
 * has its own idempotency key, so a retry does not send again the one already delivered.
 */
@ApplicationScoped
public class SendSupportTicketHandler implements JobHandler {

    private static final Logger LOG = Logger.getLogger(SendSupportTicketHandler.class);

    @Inject
    SupportRecorder support;

    @Inject
    EmailClients email;

    @Inject
    DocumentStorage storage;

    @ConfigProperty(name = "cetus.support.recipient")
    Optional<String> recipient;

    @ConfigProperty(name = "cetus.console.url")
    String consoleUrl;

    @Override
    public String type() {
        return JobTypes.SEND_SUPPORT_TICKET;
    }

    @Override
    public void handle(JobEntity job) {
        Ticket ticket = support.ticket(job.referenceId).orElse(null);
        if (ticket == null) {
            return;
        }
        Optional<EmailSender> sender = email.notificationSender();
        Optional<String> mailbox = recipient.filter(address -> !address.isBlank());
        if (sender.isEmpty() || mailbox.isEmpty()) {
            LOG.warnf(
                    "Email delivery or CETUS_SUPPORT_EMAIL is not configured; support ticket #%d is not emailed",
                    ticket.number());
            return;
        }
        List<EmailMessage.Attachment> attachments = ticket.attachments().stream()
                .map(attachment ->
                        new EmailMessage.Attachment(attachment.fileName(), storage.get(attachment.storageKey())))
                .toList();
        SupportEmail team = SupportEmail.toTeam(ticket, stripSlash(consoleUrl));
        send(
                sender.get(),
                new EmailMessage(
                        email.notificationsFrom(),
                        mailbox.get(),
                        ticket.userEmail(),
                        team.subject(),
                        team.html(),
                        team.text(),
                        attachments),
                "support-ticket-" + ticket.id());
        SupportEmail receipt = SupportEmail.receipt(ticket);
        send(
                sender.get(),
                new EmailMessage(
                        email.notificationsFrom(),
                        ticket.userEmail(),
                        mailbox.get(),
                        receipt.subject(),
                        receipt.html(),
                        receipt.text(),
                        null),
                "support-ticket-" + ticket.id() + "-receipt");
        LOG.infof("Support ticket #%d emailed", ticket.number());
    }

    private void send(EmailSender sender, EmailMessage message, String idempotencyKey) {
        try {
            sender.send(message, idempotencyKey);
        } catch (EmailRateLimited e) {
            throw new RetryLater(email.rateLimitDelay(), e.getMessage());
        } catch (EmailRejectedException e) {
            throw new GiveUp(e.getMessage(), e);
        }
    }

    private static String stripSlash(String url) {
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }
}
