package com.cantte.cetus.domain.dian;

import com.cantte.cetus.domain.model.PersonType;
import java.util.Objects;
import java.util.stream.Stream;

/**
 * Whether someone must issue electronic invoices, from the public calculator's answers. A guide, not advice: a
 * legal entity or a natural person in the SIMPLE regime must; any other natural person must unless they meet
 * every condition of a non-VAT-responsible person (income under 3,500 UVT, one establishment at most, no
 * franchises, no customs user, contracts and deposits under 3,500 UVT). The console's calculator applies the
 * same rules to show the result; this copy writes the email.
 */
public final class InvoicingObligation {

    private InvoicingObligation() {}

    public enum Answer {
        YES,
        NO,
        UNKNOWN
    }

    public enum Verdict {
        OBLIGATED,
        NOT_OBLIGATED,
        REVIEW
    }

    /**
     * A natural person's answers are all present; a legal entity's are all null, since it is obligated
     * regardless.
     */
    public record Answers(
            PersonType personType,
            Answer simpleRegime,
            Answer incomeOverCap,
            Answer severalEstablishments,
            Answer otherConditions) {

        public Answers {
            Objects.requireNonNull(personType, "personType");
            boolean natural = personType == PersonType.NATURAL_PERSON;
            Stream.of(simpleRegime, incomeOverCap, severalEstablishments, otherConditions)
                    .forEach(answer -> {
                        if ((answer != null) != natural) {
                            throw new IllegalArgumentException(
                                    natural
                                            ? "A natural person answers every question"
                                            : "A legal entity answers only its person type");
                        }
                    });
        }

        public static Answers legalEntity() {
            return new Answers(PersonType.LEGAL_ENTITY, null, null, null, null);
        }
    }

    public static Verdict assess(Answers answers) {
        if (answers.personType() == PersonType.LEGAL_ENTITY) {
            return Verdict.OBLIGATED;
        }
        var conditions = Stream.of(
                        answers.simpleRegime(),
                        answers.incomeOverCap(),
                        answers.severalEstablishments(),
                        answers.otherConditions())
                .toList();
        if (conditions.contains(Answer.YES)) {
            return Verdict.OBLIGATED;
        }
        return conditions.contains(Answer.UNKNOWN) ? Verdict.REVIEW : Verdict.NOT_OBLIGATED;
    }
}
