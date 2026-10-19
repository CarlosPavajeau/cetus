package com.cantte.cetus.domain;

import com.cantte.cetus.domain.model.CorrectionConcept;
import com.cantte.cetus.domain.model.CreditNoteConcept;
import com.cantte.cetus.domain.model.DebitNoteConcept;
import com.cantte.cetus.domain.model.DocumentType;
import org.junit.jupiter.api.Test;

import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;

class DebitNoteTest {

    @Test
    void conceptsUseTheCodesAndNamesOfAnnexTable1325() {
        assertThat(Arrays.stream(DebitNoteConcept.values()).map(DebitNoteConcept::dianCode))
                .containsExactly("1", "2", "3", "4");
        assertThat(Arrays.stream(DebitNoteConcept.values()).map(DebitNoteConcept::dianName))
                .containsExactly("Intereses", "Gastos por cobrar", "Cambio del valor", "Otros");
    }

    @Test
    void aStoredConceptIsReadAccordingToTheNoteType() {
        assertThat(CorrectionConcept.of(DocumentType.DEBIT_NOTE, "INTEREST")).isEqualTo(DebitNoteConcept.INTEREST);
        assertThat(CorrectionConcept.of(DocumentType.CREDIT_NOTE, "CANCELLATION")).isEqualTo(CreditNoteConcept.CANCELLATION);
        assertThat(CorrectionConcept.of(DocumentType.INVOICE, null)).isNull();
    }
}
