package com.cantte.cetus.api.auth;

import com.cantte.cetus.cache.Cache;
import com.cantte.cetus.cache.Caches;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.persistence.AfterCommit;
import com.cantte.cetus.persistence.entity.AccountEntity;
import com.cantte.cetus.persistence.entity.ApiKeyEntity;
import io.quarkus.narayana.jta.QuarkusTransaction;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;
import org.eclipse.microprofile.config.inject.ConfigProperty;

/**
 * What every request reads before it does anything: its API key, and its account's status and request
 * limits, found by ID or by organization. Changes reach this replica once committed; other replicas see them
 * within {@link #TTL} until a shared store backs these caches.
 */
@ApplicationScoped
public class AccessCache {

    private static final Duration TTL = Duration.ofSeconds(30);

    /** lastUsedAt is shown to the minute: refreshing it more often would write the key row on every request. */
    private static final Duration LAST_USED_PRECISION = Duration.ofMinutes(1);

    public record ApiKeyAccess(UUID id, UUID accountId, Environment environment) {}

    /** {@code limits} is null when the account has none of its own and its keys keep the per-key ones. */
    public record AccountAccess(AccountEntity.Status status, ApiKeyRateLimiter.Limits limits) {}

    public record OrganizationAccount(UUID id, AccountEntity.Status status) {}

    private final Cache<String, ApiKeyAccess> apiKeys;
    private final Cache<String, AccountAccess> accounts;
    private final Cache<String, OrganizationAccount> organizations;
    private final Cache<UUID, Boolean> lastUsedWrites;

    @Inject
    AfterCommit afterCommit;

    @Inject
    public AccessCache(
            Caches caches,
            @ConfigProperty(name = "cetus.cache.access.max-entries", defaultValue = "4096") int capacity) {
        apiKeys = caches.shared("api-keys", capacity, TTL, ApiKeyAccess.class);
        accounts = caches.shared("accounts", capacity, TTL, AccountAccess.class);
        organizations = caches.shared("organizations", capacity, TTL, OrganizationAccount.class);
        lastUsedWrites = caches.local("api-key-last-used", capacity, LAST_USED_PRECISION);
    }

    public Optional<ApiKeyAccess> apiKey(String hash) {
        return apiKeys.find(
                hash,
                () -> QuarkusTransaction.joiningExisting()
                        .call(() -> ApiKeyEntity.findActiveByHash(hash)
                                .map(key -> new ApiKeyAccess(key.id, key.accountId, key.environment))));
    }

    public AccountAccess account(UUID accountId) {
        return accounts.get(
                accountId.toString(),
                () -> QuarkusTransaction.joiningExisting().call(() -> {
                    Object[] account = (Object[]) AccountEntity.getEntityManager()
                            .createQuery("""
                                    SELECT a.status,
                                           coalesce(a.requestsPerSecond, p.requestsPerSecond),
                                           coalesce(a.requestsBurst, p.requestsBurst)
                                    FROM AccountEntity a JOIN PlanEntity p ON p.code = a.plan
                                    WHERE a.id = :id
                                    """)
                            .setParameter("id", accountId)
                            .getSingleResult();
                    // Each table sets the pair together or leaves both null, so the two values come from the same row.
                    ApiKeyRateLimiter.Limits limits = account[1] == null
                            ? null
                            : new ApiKeyRateLimiter.Limits((Integer) account[1], (Integer) account[2]);
                    return new AccountAccess((AccountEntity.Status) account[0], limits);
                }));
    }

    public Optional<OrganizationAccount> organization(String organizationId) {
        return organizations.find(
                organizationId,
                () -> QuarkusTransaction.joiningExisting()
                        .call(() -> AccountEntity.findByOrganization(organizationId)
                                .map(account -> new OrganizationAccount(account.id, account.status))));
    }

    /** Records the key's use at most once per {@link #LAST_USED_PRECISION} from this replica. */
    public void used(ApiKeyAccess key) {
        lastUsedWrites.get(key.id(), () -> {
            OffsetDateTime now = OffsetDateTime.now();
            QuarkusTransaction.requiringNew()
                    .run(() -> ApiKeyEntity.update(
                            "lastUsedAt = ?1 where id = ?2 and (lastUsedAt is null or lastUsedAt < ?3)",
                            now,
                            key.id(),
                            now.minus(LAST_USED_PRECISION)));
            return Boolean.TRUE;
        });
    }

    /** Call these in the transaction that makes the change: the invalidation waits for its commit. */
    public void revoked(ApiKeyEntity key) {
        afterCommit.run(() -> apiKeys.invalidate(key.keyHash));
    }

    public void changed(AccountEntity account) {
        afterCommit.run(() -> {
            accounts.invalidate(account.id.toString());
            organizations.invalidate(account.organizationId);
        });
    }
}
