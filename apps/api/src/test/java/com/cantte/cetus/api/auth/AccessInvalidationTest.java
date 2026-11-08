package com.cantte.cetus.api.auth;

import static com.cantte.cetus.api.support.ConsoleFixtures.bootstrap;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;

import com.cantte.cetus.api.support.ConsoleUser;
import com.cantte.cetus.persistence.entity.AccountEntity;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/** What another replica changes reaches this one's access caches through a NOTIFY, not only through their TTL. */
@QuarkusTest
class AccessInvalidationTest {

    @Inject
    AccessCache access;

    @Test
    void anAccountSuspendedOnAnotherReplicaIsSeenHere() throws InterruptedException {
        ConsoleUser user = ConsoleUser.newOrganization();
        UUID accountId = UUID.fromString(bootstrap(user, "Replicas SAS"));
        assertThat(status(user)).isEqualTo(AccountEntity.Status.ACTIVE);

        // What AdminAccountResource does on another replica: the change and its notification, in one transaction.
        QuarkusTransaction.requiringNew().run(() -> {
            AccountEntity.update("status = ?1 where id = ?2", AccountEntity.Status.SUSPENDED, accountId);
            AccountEntity.getEntityManager()
                    .createNativeQuery("SELECT pg_notify(:channel, :payload)")
                    .setParameter("channel", AccessCache.CHANNEL)
                    .setParameter("payload", "account:" + accountId + ":" + user.organizationId())
                    .getSingleResult();
        });

        Instant deadline = Instant.now().plus(Duration.ofSeconds(10));
        while (status(user) != AccountEntity.Status.SUSPENDED && Instant.now().isBefore(deadline)) {
            Thread.sleep(50);
        }
        assertThat(status(user)).isEqualTo(AccountEntity.Status.SUSPENDED);
    }

    @Test
    void anOrganizationWithNoAccountCannotChangeAnything() {
        ConsoleUser user = ConsoleUser.newOrganization();

        user.request()
                .body(Map.of("name", "ERP", "environment", "TEST"))
                .post("/console/api-keys")
                .then()
                .statusCode(403)
                .body("code", equalTo("account_not_found"));
    }

    private AccountEntity.Status status(ConsoleUser user) {
        return access.organization(user.organizationId())
                .map(AccessCache.OrganizationAccount::status)
                .orElseThrow();
    }
}
