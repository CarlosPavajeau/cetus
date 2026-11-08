package com.cantte.cetus.worker.support;

import com.cantte.cetus.domain.dian.Hashing;
import com.cantte.cetus.notifications.NotificationKind;
import com.cantte.cetus.persistence.entity.AccountContactEntity;
import com.cantte.cetus.persistence.entity.AccountEntity;
import com.cantte.cetus.persistence.entity.NotificationEntity;
import com.cantte.cetus.persistence.entity.NotificationEntity.Status;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.LockModeType;
import jakarta.transaction.Transactional;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/** Short transactions around the email of a notice. */
@ApplicationScoped
public class NotificationRecorder {

    /** How long a contact's verification link works. */
    public static final Duration VERIFICATION_LIFETIME = Duration.ofHours(48);

    private static final SecureRandom RANDOM = new SecureRandom();

    /** A pending notice, with the verified addresses of its categories. */
    public record Pending(
            UUID id,
            UUID accountId,
            String accountName,
            NotificationKind kind,
            Map<String, String> data,
            List<String> recipients) {}

    /** A fresh verification link of a contact and the new address it goes to. */
    public record VerificationLink(String token, String tokenHash, String email) {}

    /** Empty when the notice is gone or already resolved. */
    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public Optional<Pending> load(UUID id) {
        NotificationEntity notification = NotificationEntity.findById(id);
        if (notification == null || notification.status != Status.PENDING) {
            return Optional.empty();
        }
        NotificationKind kind = NotificationKind.valueOf(notification.kind);
        AccountEntity account = AccountEntity.findById(notification.accountId);
        List<String> recipients = kind.categories().isEmpty()
                ? List.of()
                : AccountContactEntity.emails(notification.accountId, kind.categories());
        return Optional.of(new Pending(
                notification.id,
                notification.accountId,
                account.name,
                kind,
                Map.copyOf(notification.data),
                recipients));
    }

    /**
     * Makes a new link for the change the notice was requested for and keeps only its hash, on one of the
     * categories still waiting for that address since that request: the one the notice names if it still is,
     * so a category that left a shared request does not take the others' link with it. Empty when none is
     * (verified, canceled or replaced since): the email would only confuse.
     */
    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public Optional<VerificationLink> verificationLink(Pending notice) {
        String email = notice.data().get("email");
        Instant requestedAt = Instant.parse(notice.data().get("requestedAt"));
        UUID named = UUID.fromString(notice.data().get("contactId"));
        // Locked in the same order as the console's changes (AccountContactEntity.listForUpdate).
        List<AccountContactEntity> waiting = AccountContactEntity.listForUpdate(notice.accountId()).stream()
                .filter(contact -> email.equals(contact.pendingEmail)
                        && contact.pendingRequestedAt != null
                        && contact.pendingRequestedAt.toInstant().equals(requestedAt))
                .toList();
        if (waiting.isEmpty()) {
            return Optional.empty();
        }
        AccountContactEntity holder = waiting.stream()
                .filter(contact -> contact.id.equals(named))
                .findFirst()
                .orElseGet(() -> waiting.stream()
                        .min(Comparator.comparing(contact -> contact.category))
                        .orElseThrow());
        byte[] secret = new byte[32];
        RANDOM.nextBytes(secret);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(secret);
        // One link per request: a token left on another category by an earlier attempt stops working.
        waiting.forEach(contact -> {
            contact.pendingTokenHash = null;
            contact.pendingExpiresAt = null;
        });
        AccountContactEntity.flush();
        holder.pendingTokenHash = Hashing.sha256Hex(token.getBytes(StandardCharsets.UTF_8));
        holder.pendingExpiresAt = OffsetDateTime.now().plus(VERIFICATION_LIFETIME);
        return Optional.of(new VerificationLink(token, holder.pendingTokenHash, email));
    }

    /**
     * Only a pending notice moves: one another run already resolved keeps its status.
     *
     * @return whether the notice moved to SENT
     */
    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public boolean sent(UUID id, List<String> recipients) {
        return NotificationEntity.update(
                        "status = ?1, recipients = ?2, error = null, sentAt = ?3 where id = ?4 and status = ?5",
                        Status.SENT,
                        recipients.toArray(String[]::new),
                        OffsetDateTime.now(),
                        id,
                        Status.PENDING)
                > 0;
    }

    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public void skipped(UUID id, String reason) {
        resolve(id, Status.SKIPPED, reason);
    }

    /** No more attempts. A notice already sent or skipped keeps its status. */
    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public void failed(UUID id, String reason) {
        resolve(id, Status.FAILED, reason);
    }

    /** Locked, so a run marking it sent at the same time is not overwritten. */
    private static void resolve(UUID id, Status status, String reason) {
        NotificationEntity notification = NotificationEntity.findById(id, LockModeType.PESSIMISTIC_WRITE);
        if (notification != null && notification.status == Status.PENDING) {
            notification.status = status;
            notification.error = reason;
        }
    }
}
