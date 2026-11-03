package com.cantte.cetus.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.cantte.cetus.domain.dian.InvoicingObligation;
import com.cantte.cetus.domain.dian.InvoicingObligation.Answer;
import com.cantte.cetus.domain.dian.InvoicingObligation.Answers;
import com.cantte.cetus.domain.dian.InvoicingObligation.Verdict;
import com.cantte.cetus.domain.model.PersonType;
import org.junit.jupiter.api.Test;

class InvoicingObligationTest {

    @Test
    void aLegalEntityIsObligated() {
        assertThat(InvoicingObligation.assess(Answers.legalEntity())).isEqualTo(Verdict.OBLIGATED);
    }

    @Test
    void aNaturalPersonMeetingEveryConditionIsNotObligated() {
        assertThat(InvoicingObligation.assess(natural(Answer.NO, Answer.NO, Answer.NO, Answer.NO)))
                .isEqualTo(Verdict.NOT_OBLIGATED);
    }

    @Test
    void anyYesObligatesEvenWithUnknowns() {
        assertThat(InvoicingObligation.assess(natural(Answer.YES, Answer.NO, Answer.NO, Answer.NO)))
                .isEqualTo(Verdict.OBLIGATED);
        assertThat(InvoicingObligation.assess(natural(Answer.UNKNOWN, Answer.NO, Answer.YES, Answer.UNKNOWN)))
                .isEqualTo(Verdict.OBLIGATED);
    }

    @Test
    void anUnknownWithoutAYesNeedsAReview() {
        assertThat(InvoicingObligation.assess(natural(Answer.NO, Answer.UNKNOWN, Answer.NO, Answer.NO)))
                .isEqualTo(Verdict.REVIEW);
    }

    @Test
    void theAnswersMatchThePersonType() {
        assertThatThrownBy(() -> new Answers(PersonType.NATURAL_PERSON, Answer.NO, null, Answer.NO, Answer.NO))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new Answers(PersonType.LEGAL_ENTITY, Answer.NO, null, null, null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    private static Answers natural(Answer simple, Answer income, Answer establishments, Answer others) {
        return new Answers(PersonType.NATURAL_PERSON, simple, income, establishments, others);
    }
}
