package com.cantte.cetus.worker.support;

import com.cantte.cetus.domain.model.Address;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.domain.model.IdentificationType;
import com.cantte.cetus.domain.model.Party;
import com.cantte.cetus.domain.model.PersonType;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class EmailClientsTest {

    private static final Party CUSTOMER = new Party(PersonType.LEGAL_ENTITY, IdentificationType.NIT, "900108281", "3",
            "Cliente SAS", null, List.of("R-99-PN"), "01", "IVA",
            new Address("11001", "Bogotá", "11", "Bogotá", null, "Calle 1", "CO", "Colombia"), "compras@example.com", null);

    @Test
    void withoutKeyOrSenderNothingIsSent() {
        assertThat(clients(Optional.empty(), Optional.of("from@cetus.test"), Optional.empty()).sender()).isEmpty();
        assertThat(clients(Optional.of("re_key"), Optional.empty(), Optional.empty()).sender()).isEmpty();
        assertThat(clients(Optional.of("  "), Optional.of("from@cetus.test"), Optional.empty()).sender()).isEmpty();
        assertThat(clients(Optional.of("re_key"), Optional.of("from@cetus.test"), Optional.empty()).sender()).isPresent();
    }

    @Test
    void noticesGoFromTheirOwnSenderOrTheDocumentsOne() {
        EmailClients onlyNotices = new EmailClients(Optional.of("re_key"), "https://api.resend.com", Duration.ofSeconds(1),
                Duration.ofSeconds(1), Optional.empty(), Optional.of("avisos@cetus.test"), Optional.empty(),
                Duration.ofSeconds(2));
        assertThat(onlyNotices.sender()).isEmpty();
        assertThat(onlyNotices.notificationSender()).isPresent();
        assertThat(onlyNotices.notificationsFrom()).isEqualTo("avisos@cetus.test");

        EmailClients shared = clients(Optional.of("re_key"), Optional.of("from@cetus.test"), Optional.empty());
        assertThat(shared.notificationSender()).isPresent();
        assertThat(shared.notificationsFrom()).isEqualTo("from@cetus.test");

        assertThat(clients(Optional.of("re_key"), Optional.empty(), Optional.empty()).notificationSender()).isEmpty();
        assertThat(clients(Optional.empty(), Optional.of("from@cetus.test"), Optional.empty()).notificationSender())
                .isEmpty();
    }

    @Test
    void testDocumentsOnlyGoToTheTestMailbox() {
        EmailClients withMailbox = clients(Optional.of("re_key"), Optional.of("from@cetus.test"), Optional.of("qa@cetus.test"));
        assertThat(withMailbox.recipient(Environment.TEST, CUSTOMER)).contains("qa@cetus.test");
        assertThat(withMailbox.recipient(Environment.LIVE, CUSTOMER)).contains("compras@example.com");

        EmailClients withoutMailbox = clients(Optional.of("re_key"), Optional.of("from@cetus.test"), Optional.empty());
        assertThat(withoutMailbox.recipient(Environment.TEST, CUSTOMER)).isEmpty();
    }

    private static EmailClients clients(Optional<String> apiKey, Optional<String> from, Optional<String> testRecipient) {
        return new EmailClients(apiKey, "https://api.resend.com", Duration.ofSeconds(1), Duration.ofSeconds(1), from,
                Optional.empty(), testRecipient, Duration.ofSeconds(2));
    }
}
