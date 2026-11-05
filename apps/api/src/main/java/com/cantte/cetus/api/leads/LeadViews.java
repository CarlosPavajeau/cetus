package com.cantte.cetus.api.leads;

import com.cantte.cetus.domain.dian.InvoicingObligation;
import com.cantte.cetus.domain.dian.InvoicingObligation.Answer;
import com.cantte.cetus.domain.model.PersonType;
import com.cantte.cetus.persistence.entity.LeadEntity.Integration;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

public final class LeadViews {

    /** A privacy policy version, as the console names them: its date. */
    static final String POLICY_VERSION = "\\d{4}-\\d{2}-\\d{2}";

    static final int EMAIL_MAX = 254;

    /**
     * Stricter than {@code @Email}: the address goes into the provider's URL paths for "Avísame" lists, so it only
     * takes the characters real addresses use, and never '%', which would let it encode a path of its own.
     */
    static final String EMAIL = "[A-Za-z0-9._+-]+@[A-Za-z0-9-]+(\\.[A-Za-z0-9-]+)*\\.[A-Za-z]{2,}";

    private LeadViews() {}

    public record CalculatorLeadRequest(
            @NotBlank @Pattern(regexp = EMAIL) @Size(max = EMAIL_MAX)
            String email,

            @NotBlank @Pattern(regexp = POLICY_VERSION) String policyVersion,
            @NotNull @Valid CalculatorAnswers answers) {}

    /** A legal entity sends only its person type; a natural person answers every question. */
    public record CalculatorAnswers(
            @NotNull PersonType personType,
            Answer simpleRegime,
            Answer incomeOverCap,
            Answer severalEstablishments,
            Answer otherConditions) {

        InvoicingObligation.Answers toDomain() {
            return new InvoicingObligation.Answers(
                    personType, simpleRegime, incomeOverCap, severalEstablishments, otherConditions);
        }
    }

    public record PartnerLeadRequest(
            @NotBlank @Pattern(regexp = EMAIL) @Size(max = EMAIL_MAX)
            String email,

            @NotBlank @Pattern(regexp = POLICY_VERSION) String policyVersion,
            @NotBlank @Size(max = 120) String name,
            @Size(max = 160) String company,
            @Pattern(regexp = "[+0-9 ()-]{7,20}") String phone,
            @NotNull @Min(1) @Max(10_000) Integer companies,
            @Size(max = 2_000) String message) {}

    public record IntegrationLeadRequest(
            @NotBlank @Pattern(regexp = EMAIL) @Size(max = EMAIL_MAX)
            String email,

            @NotBlank @Pattern(regexp = POLICY_VERSION) String policyVersion,
            @NotNull Integration integration) {}

    /** What the public pages show: real figures from production, and the cap the calculator compares against. */
    public record LandingView(
            long acceptedDocuments,
            long activeIssuers,
            @Schema(nullable = true) ObligationCapView obligationCap,
            @Schema(nullable = true) CourtesyView courtesy) {}

    /** The active promotion's courtesy lot for accounts that start in production, and the slots left. */
    public record CourtesyView(int slots, int slotsRemaining, int documents, int validityDays) {}

    /** 3,500 UVT and the UVT's value this year, from configuration. */
    public record ObligationCapView(long uvtValueCop, int uvt) {}
}
