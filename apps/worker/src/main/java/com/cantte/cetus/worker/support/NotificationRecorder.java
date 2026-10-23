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
    public record Pending(UUID id, UUID accountId, String accountName, NotificationKind kind, Map<String, String> data,
                          List<String> recipients) {
    }

    /** A fresh verification link of a contact and the new address it goes to. */
    public record VerificationLink(String token, String tokenHash, String email) {
    }

    /** Empty when the notice is gone or already resolved. */
    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public Optional<Pending> load(UUID id) {
        NotificationEntity notification = NotificationEntity.findById(id);
        if (notification == null || notification.status != Status.PENDING) {
            return Optional.empty();
        }
        NotificationKind kind = NotificationKind.valueOf(notification.kind);
        AccountEntity account = AccountEntity.findById(notification.accountId);
        List<String> recipients = kind.categories().isEmpty() ? List.of()
                : AccountContactEntity.emails(notification.accountId, kind.categories());
        return Optional.of(new Pending(notification.id, notification.accountId, account.name, kind,
                Map.copyOf(notification.data), recipients));
    }

    /**
     * Makes a new link for the change the notice was requested for and keeps only its hash. Empty when that
     * change was verified, canceled or replaced since: the email would only confuse.
     */
    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public Optional<VerificationLink> verificationLink(Pending notice) {
        AccountContactEntity contact = AccountContactEntity.findById(UUID.fromString(notice.data().get("contactId")),
                LockModeType.PESSIMISTIC_WRITE);
        if (contact == null || contact.pendingEmail == null || contact.pendingRequestedAt == null
                || !contact.pendingEmail.equals(notice.data().get("email"))
                || !contact.pendingRequestedAt.toInstant().equals(Instant.parse(notice.data().get("requestedAt")))) {
            return Optional.empty();
        }
        byte[] secret = new byte[32];
        RANDOM.nextBytes(secret);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(secret);
        contact.pendingTokenHash = Hashing.sha256Hex(token.getBytes(StandardCharsets.UTF_8));
        contact.pendingExpiresAt = OffsetDateTime.now().plus(VERIFICATION_LIFETIME);
        return Optional.of(new VerificationLink(token, contact.pendingTokenHash, contact.pendingEmail));
    }

    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public void sent(UUID id, List<String> recipients) {
        NotificationEntity notification = NotificationEntity.findById(id);
        notification.status = Status.SENT;
        notification.recipients = recipients.toArray(String[]::new);
        notification.error = null;
        notification.sentAt = OffsetDateTime.now();
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

    private static void resolve(UUID id, Status status, String reason) {
        NotificationEntity notification = NotificationEntity.findById(id);
        if (notification != null && notification.status == Status.PENDING) {
            notification.status = status;
            notification.error = reason;
        }
    }
}
