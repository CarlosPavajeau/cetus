package com.cantte.cetus.worker.handlers;

import com.cantte.cetus.email.EmailMessage;
import com.cantte.cetus.email.EmailRateLimited;
import com.cantte.cetus.email.EmailRejectedException;
import com.cantte.cetus.email.EmailSender;
import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.notifications.NotificationKind;
import com.cantte.cetus.persistence.entity.JobEntity;
import com.cantte.cetus.worker.notifications.NotificationEmail;
import com.cantte.cetus.worker.runner.GiveUp;
import com.cantte.cetus.worker.runner.JobHandler;
import com.cantte.cetus.worker.runner.RetryLater;
import com.cantte.cetus.worker.support.EmailClients;
import com.cantte.cetus.worker.support.NotificationRecorder;
import com.cantte.cetus.worker.support.NotificationRecorder.Pending;
import com.cantte.cetus.worker.support.NotificationRecorder.VerificationLink;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

import java.util.List;
import java.util.Optional;

/**
 * Emails a notice to the verified contacts of its categories, one email per address. Each email goes out
 * with an idempotency key of the notice and the address, so a retry after a partial failure does not send
 * the ones already delivered again. A contact verification goes to the new address instead, with a link
 * made at this moment.
 */
@ApplicationScoped
public class SendNotificationHandler implements JobHandler {

    private static final Logger LOG = Logger.getLogger(SendNotificationHandler.class);

    @Inject
    NotificationRecorder notifications;
    @Inject
    EmailClients email;

    @ConfigProperty(name = "cetus.console.url")
    String consoleUrl;

    @Override
    public String type() {
        return JobTypes.SEND_NOTIFICATION;
    }

    @Override
    public void handle(JobEntity job) {
        Pending notice = notifications.load(job.referenceId).orElse(null);
        if (notice == null) {
            return;
        }
        Optional<EmailSender> sender = email.notificationSender();
        if (notice.kind() == NotificationKind.CONTACT_VERIFICATION) {
            VerificationLink link = notifications.verificationLink(notice).orElse(null);
            if (link == null) {
                notifications.skipped(notice.id(), "The change was verified, canceled or replaced");
                return;
            }
            if (sender.isEmpty()) {
                // Only where email is not configured (local development): the link is the only way to verify.
                LOG.warnf("Email delivery is not configured; verify %s at %s/contact-verification/%s",
                        link.email(), stripSlash(consoleUrl), link.token());
                notifications.skipped(notice.id(), "Email delivery is not configured");
                return;
            }
            // A new link per attempt: the key names it, so a retry never answers with an email of an older one.
            send(sender.get(), notice, link.email(), link.token(),
                    "notification-" + notice.id() + "-" + link.tokenHash().substring(0, 16));
            notifications.sent(notice.id(), List.of(link.email()));
            return;
        }

        if (sender.isEmpty()) {
            notifications.skipped(notice.id(), "Email delivery is not configured");
            return;
        }
        if (notice.recipients().isEmpty()) {
            notifications.skipped(notice.id(), "no_contact");
            return;
        }
        for (String recipient : notice.recipients()) {
            send(sender.get(), notice, recipient, null, "notification-" + notice.id() + "-" + recipient);
        }
        notifications.sent(notice.id(), notice.recipients());
        LOG.infof("Notice %s %s emailed to %d contacts", notice.kind(), notice.id(), notice.recipients().size());
    }

    @Override
    public void onDead(JobEntity job, String reason) {
        notifications.failed(job.referenceId, "Gave up after " + job.attempts + " attempts: " + reason);
    }

    private void send(EmailSender sender, Pending notice, String recipient, String token, String idempotencyKey) {
        NotificationEmail content = NotificationEmail.of(notice.kind(), notice.accountName(), notice.data(),
                stripSlash(consoleUrl), token);
        EmailMessage message = new EmailMessage(email.notificationsFrom(), recipient, null,
                content.subject(), content.html(), content.text(), null);
        try {
            sender.send(message, idempotencyKey);
        } catch (EmailRateLimited e) {
            throw new RetryLater(email.rateLimitDelay(), e.getMessage());
        } catch (EmailRejectedException e) {
            notifications.failed(notice.id(), recipient + ": " + e.getMessage());
            throw new GiveUp(e.getMessage(), e);
        }
    }

    private static String stripSlash(String url) {
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }
}
