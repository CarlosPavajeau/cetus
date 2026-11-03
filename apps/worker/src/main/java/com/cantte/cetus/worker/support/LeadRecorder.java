package com.cantte.cetus.worker.support;

import com.cantte.cetus.domain.dian.InvoicingObligation;
import com.cantte.cetus.persistence.entity.LeadEntity;
import com.cantte.cetus.persistence.entity.LeadEntity.IntegrationDetails;
import com.cantte.cetus.persistence.entity.LeadEntity.PartnerDetails;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.util.Optional;
import java.util.UUID;

/** Reads a lead in a short transaction, typed by its form, to email it outside of one. */
@ApplicationScoped
public class LeadRecorder {

    @Inject
    ObjectMapper mapper;

    public sealed interface Lead {
        UUID id();

        String email();
    }

    public record CalculatorLead(UUID id, String email, InvoicingObligation.Answers answers) implements Lead {}

    public record PartnerLead(UUID id, String email, PartnerDetails details) implements Lead {}

    public record IntegrationLead(UUID id, String email, IntegrationDetails details) implements Lead {}

    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public Optional<Lead> lead(UUID id) {
        return LeadEntity.<LeadEntity>findByIdOptional(id).map(this::typed);
    }

    private Lead typed(LeadEntity lead) {
        return switch (lead.kind) {
            case CALCULATOR ->
                new CalculatorLead(
                        lead.id, lead.email, mapper.convertValue(lead.details, InvoicingObligation.Answers.class));
            case PARTNER ->
                new PartnerLead(lead.id, lead.email, mapper.convertValue(lead.details, PartnerDetails.class));
            case INTEGRATION ->
                new IntegrationLead(lead.id, lead.email, mapper.convertValue(lead.details, IntegrationDetails.class));
        };
    }
}
