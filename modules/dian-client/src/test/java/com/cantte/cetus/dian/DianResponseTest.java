package com.cantte.cetus.dian;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class DianResponseTest {

    @Test
    void recognizesATestSetTheDianAlreadyAccepted() {
        // As returned by GetStatusZip in habilitación once the set was accepted.
        assertThat(response("2", "Set de prueba con identificador a09e2744-f1d7-4697-bbcf-613bc312450d se encuentra Aceptado.")
                .testSetAlreadyAccepted()).isTrue();
    }

    @Test
    void otherOutcomesAreNotAnAcceptedTestSet() {
        assertThat(response("00", "Procesado Correctamente.").testSetAlreadyAccepted()).isFalse();
        assertThat(response("99", "Validación contiene errores en campos mandatorios.").testSetAlreadyAccepted()).isFalse();
        assertThat(response(null, null).testSetAlreadyAccepted()).isFalse();
    }

    private static DianResponse response(String code, String description) {
        return new DianResponse(false, code, description, null, List.of(), null, null, "");
    }
}
