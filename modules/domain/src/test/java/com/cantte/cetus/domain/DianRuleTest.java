package com.cantte.cetus.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.cantte.cetus.domain.dian.DianRule;
import com.cantte.cetus.domain.dian.DianRule.Kind;
import org.junit.jupiter.api.Test;

class DianRuleTest {

    @Test
    void readsARejection() {
        assertThat(DianRule.parse(
                        "Regla: FAK26, Rechazo: Responsabilidad informada para receptor no valida según lista."))
                .contains(new DianRule(
                        "FAK26", Kind.REJECTION, "Responsabilidad informada para receptor no valida según lista."));
    }

    @Test
    void readsANotificationWithOrWithoutAccent() {
        assertThat(DianRule.parse("Regla: FAJ43b, Notificación: Nombre informado No corresponde al registrado."))
                .contains(new DianRule("FAJ43b", Kind.NOTIFICATION, "Nombre informado No corresponde al registrado."));
        assertThat(DianRule.parse("regla:FAJ43b ,notificacion:  Nombre"))
                .contains(new DianRule("FAJ43b", Kind.NOTIFICATION, "Nombre"));
    }

    @Test
    void keepsAMessageThatSpansLinesAndHasCommas() {
        assertThat(DianRule.parse("Regla: 90, Rechazo: Documento procesado anteriormente,\nCUFE repetido"))
                .contains(new DianRule("90", Kind.REJECTION, "Documento procesado anteriormente,\nCUFE repetido"));
    }

    @Test
    void ignoresTextOutsideTheFormat() {
        assertThat(DianRule.parse("Error interno del servicio.")).isEmpty();
        assertThat(DianRule.parse("Regla: FAK26, Advertencia: algo")).isEmpty();
    }
}
