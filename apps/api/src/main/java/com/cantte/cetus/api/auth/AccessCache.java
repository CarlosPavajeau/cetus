package com.cantte.cetus.api.auth;

import com.cantte.cetus.cache.Cache;
import com.cantte.cetus.cache.Caches;
import com.cantte.cetus.cache.RateLimiter;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.persistence.AfterCommit;
import com.cantte.cetus.persistence.entity.AccountEntity;
import com.cantte.cetus.persistence.entity.ApiKeyEntity;
import com.cantte.cetus.persistence.entity.SubscriptionEntity;
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
 * limits, found by ID or by organization. A revoked key or an account's new status reaches every replica once
 * committed: this one at once, the others through a NOTIFY on {@value #CHANNEL} ({@link AccessListener}). Other
 * changes, such as a subscription the worker started, show within {@link #TTL}. Loads run in their own
 * transaction, so a caller's uncommitted change is never cached.
 */
@ApplicationScoped
public class AccessCache {

    private static final Duration TTL = Duration.ofSeconds(30);

    static final String CHANNEL = "billing_access";
    private static final String API_KEY = "api-key:";
    private static final String ACCOUNT = "account:";

    /** lastUsedAt is shown to the minute: refreshing it more often would write the key row on every request. */
    private static final Duration LAST_USED_PRECISION = Duration.ofMinutes(1);

    public record ApiKeyAccess(UUID id, UUID accountId, Environment environment) {}

    /**
     * {@code limits}: the account's own, else its subscription plan's; null when neither has any and its keys keep
     * the per-key ones. A subscription started or ended by the worker shows within {@link #TTL}.
     */
    public record AccountAccess(AccountEntity.Status status, RateLimiter.Limits limits) {}

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
                () -> QuarkusTransaction.requiringNew()
                        .call(() -> ApiKeyEntity.findActiveByHash(hash)
                                .map(key -> new ApiKeyAccess(key.id, key.accountId, key.environment))));
    }

    public AccountAccess account(UUID accountId) {
        return accounts.get(
                accountId.toString(),
                () -> QuarkusTransaction.requiringNew().call(() -> {
                    Object[] account = (Object[]) AccountEntity.getEntityManager()
                            .createQuery("""
                                    SELECT a.status,
                                           coalesce(a.requestsPerSecond, p.requestsPerSecond),
                                           coalesce(a.requestsBurst, p.requestsBurst)
                                    FROM AccountEntity a
                                    LEFT JOIN SubscriptionEntity s ON s.accountId = a.id AND s.status <> :canceled
                                    LEFT JOIN PlanVersionEntity v ON v.id = s.planVersionId
                                    LEFT JOIN PlanEntity p ON p.id = v.planId
                                    WHERE a.id = :id
                                    """)
                            .setParameter("id", accountId)
                            .setParameter("canceled", SubscriptionEntity.Status.CANCELED)
                            .getSingleResult();
                    // Each table sets the pair together or leaves both null, so the two values come from the same row.
                    RateLimiter.Limits limits = account[1] == null
                            ? null
                            : new RateLimiter.Limits((Integer) account[1], (Integer) account[2]);
                    return new AccountAccess((AccountEntity.Status) account[0], limits);
                }));
    }

    public Optional<OrganizationAccount> organization(String organizationId) {
        return organizations.find(
                organizationId,
                () -> QuarkusTransaction.requiringNew()
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

    /** Call these in the transaction that makes the change: the invalidations wait for its commit. */
    public void revoked(ApiKeyEntity key) {
        String payload = API_KEY + key.keyHash;
        notifyReplicas(payload);
        afterCommit.run(() -> invalidate(payload));
    }

    public void changed(AccountEntity account) {
        String payload = ACCOUNT + account.id + ":" + account.organizationId;
        notifyReplicas(payload);
        afterCommit.run(() -> invalidate(payload));
    }

    /** Drops what a notification names from this replica's caches; anything else is ignored. */
    void invalidate(String payload) {
        if (payload.startsWith(API_KEY)) {
            apiKeys.invalidate(payload.substring(API_KEY.length()));
        } else if (payload.startsWith(ACCOUNT)) {
            String[] ids = payload.substring(ACCOUNT.length()).split(":", 2);
            accounts.invalidate(ids[0]);
            if (ids.length == 2) {
                organizations.invalidate(ids[1]);
            }
        }
    }

    /** Sent on commit, and only then, as Postgres does with NOTIFY. */
    private static void notifyReplicas(String payload) {
        AccountEntity.getEntityManager()
                .createNativeQuery("SELECT pg_notify(:channel, :payload)")
                .setParameter("channel", CHANNEL)
                .setParameter("payload", payload)
                .getSingleResult();
    }
}
