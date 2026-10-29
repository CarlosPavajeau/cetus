package com.cantte.cetus.worker.handlers;

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
import com.cantte.cetus.worker.support.SupportRecorder.Feedback;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.util.Optional;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

/** Emails an opinion shared from the console to the Cetus support mailbox, with the person as Reply-To. */
@ApplicationScoped
public class SendFeedbackHandler implements JobHandler {

    private static final Logger LOG = Logger.getLogger(SendFeedbackHandler.class);

    @Inject
    SupportRecorder support;

    @Inject
    EmailClients email;

    @ConfigProperty(name = "cetus.support.recipient")
    Optional<String> recipient;

    @Override
    public String type() {
        return JobTypes.SEND_FEEDBACK;
    }

    @Override
    public void handle(JobEntity job) {
        Feedback feedback = support.feedback(job.referenceId).orElse(null);
        if (feedback == null) {
            return;
        }
        Optional<EmailSender> sender = email.notificationSender();
        Optional<String> mailbox = recipient.filter(address -> !address.isBlank());
        if (sender.isEmpty() || mailbox.isEmpty()) {
            LOG.warn("Email delivery or CETUS_SUPPORT_EMAIL is not configured; feedback is not emailed");
            return;
        }
        SupportEmail content = SupportEmail.feedback(feedback);
        EmailMessage message = new EmailMessage(
                email.notificationsFrom(),
                mailbox.get(),
                feedback.userEmail(),
                content.subject(),
                content.html(),
                content.text(),
                null);
        try {
            sender.get().send(message, "feedback-" + feedback.id());
        } catch (EmailRateLimited e) {
            throw new RetryLater(email.rateLimitDelay(), e.getMessage());
        } catch (EmailRejectedException e) {
            throw new GiveUp(e.getMessage(), e);
        }
    }
}
