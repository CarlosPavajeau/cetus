package com.cantte.cetus.worker.handlers;

import com.cantte.cetus.email.ContactLists;
import com.cantte.cetus.email.EmailMessage;
import com.cantte.cetus.email.EmailRateLimited;
import com.cantte.cetus.email.EmailRejectedException;
import com.cantte.cetus.email.EmailSender;
import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.persistence.entity.JobEntity;
import com.cantte.cetus.worker.notifications.LeadEmail;
import com.cantte.cetus.worker.runner.GiveUp;
import com.cantte.cetus.worker.runner.JobHandler;
import com.cantte.cetus.worker.runner.RetryLater;
import com.cantte.cetus.worker.support.EmailClients;
import com.cantte.cetus.worker.support.LeadRecorder;
import com.cantte.cetus.worker.support.LeadRecorder.CalculatorLead;
import com.cantte.cetus.worker.support.LeadRecorder.IntegrationLead;
import com.cantte.cetus.worker.support.LeadRecorder.Lead;
import com.cantte.cetus.worker.support.LeadRecorder.PartnerLead;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.util.Optional;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

/**
 * Tells the support mailbox about a lead, with the person as Reply-To; emails the calculator's result to the
 * person; and puts an "Avísame" address on the provider's list for that integration. Every step can run again on a
 * retry: the emails carry idempotency keys and adding an address to a list twice changes nothing.
 */
@ApplicationScoped
public class SendLeadHandler implements JobHandler {

    private static final Logger LOG = Logger.getLogger(SendLeadHandler.class);

    @Inject
    LeadRecorder leads;

    @Inject
    EmailClients email;

    @ConfigProperty(name = "cetus.support.recipient")
    Optional<String> recipient;

    @ConfigProperty(name = "cetus.console.url")
    String consoleUrl;

    @Override
    public String type() {
        return JobTypes.SEND_LEAD;
    }

    @Override
    public void handle(JobEntity job) {
        Lead lead = leads.lead(job.referenceId).orElse(null);
        if (lead == null) {
            return;
        }
        Optional<EmailSender> sender = email.notificationSender();
        if (sender.isEmpty()) {
            LOG.warn("Email delivery is not configured; the lead is not emailed");
        }
        try {
            sender.ifPresent(available -> tellTheTeam(available, lead));
            switch (lead) {
                case CalculatorLead calculator -> sender.ifPresent(available -> sendResult(available, calculator));
                case IntegrationLead integration -> subscribe(integration);
                case PartnerLead ignored -> {}
            }
        } catch (EmailRateLimited e) {
            throw new RetryLater(email.rateLimitDelay(), e.getMessage());
        } catch (EmailRejectedException e) {
            throw new GiveUp(e.getMessage(), e);
        }
    }

    private void tellTheTeam(EmailSender sender, Lead lead) {
        Optional<String> mailbox = recipient.filter(address -> !address.isBlank());
        if (mailbox.isEmpty()) {
            LOG.warn("CETUS_SUPPORT_EMAIL is not configured; the team is not told about the lead");
            return;
        }
        LeadEmail content = LeadEmail.toTeam(lead);
        sender.send(
                new EmailMessage(
                        email.notificationsFrom(),
                        mailbox.get(),
                        lead.email(),
                        content.subject(),
                        content.html(),
                        content.text(),
                        null),
                "lead-" + lead.id() + "-team");
    }

    private void sendResult(EmailSender sender, CalculatorLead lead) {
        LeadEmail content = LeadEmail.result(lead, consoleUrl);
        sender.send(
                new EmailMessage(
                        email.notificationsFrom(),
                        lead.email(),
                        recipient.filter(address -> !address.isBlank()).orElse(null),
                        content.subject(),
                        content.html(),
                        content.text(),
                        null),
                "lead-" + lead.id() + "-visitor");
    }

    private void subscribe(IntegrationLead lead) {
        Optional<ContactLists> lists = email.contactLists();
        if (lists.isEmpty()) {
            LOG.warn("RESEND_CONTACTS_API_KEY is not configured; the address is not added to the integration's list");
            return;
        }
        lists.get().subscribe(lead.email(), LeadEmail.waitlist(lead.details().integration()));
    }
}
