package com.cantte.cetus.dian;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class DianResponseTest {

    @Test
    void recognizesATestSetTheDianAlreadyAccepted() {
        // As returned by GetStatusZip in habilitación once the set was accepted.
        assertThat(response("2", "Set de prueba con identificador " + UUID.randomUUID() + " se encuentra Aceptado.")
                        .testSetAlreadyAccepted())
                .isTrue();
    }

    @Test
    void otherOutcomesAreNotAnAcceptedTestSet() {
        assertThat(response("00", "Procesado Correctamente.").testSetAlreadyAccepted())
                .isFalse();
        assertThat(response("99", "Validación contiene errores en campos mandatorios.")
                        .testSetAlreadyAccepted())
                .isFalse();
        assertThat(response(null, null).testSetAlreadyAccepted()).isFalse();
    }

    private static DianResponse response(String code, String description) {
        return new DianResponse(false, code, description, null, List.of(), null, null, "");
    }
}
