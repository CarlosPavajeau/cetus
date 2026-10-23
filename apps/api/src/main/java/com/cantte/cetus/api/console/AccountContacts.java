package com.cantte.cetus.api.console;

import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.persistence.entity.AccountContactEntity;
import com.cantte.cetus.persistence.entity.AccountContactEntity.Category;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.NotFoundException;

import java.time.OffsetDateTime;
import java.util.Locale;
import java.util.UUID;

/** The contacts every account starts with. */
@ApplicationScoped
public class AccountContacts {

    @Inject
    EntityManager em;

    /**
     * Points every category without a contact to {@code email}, as verified: it is the address a member
     * signs in with (on bootstrap, the owner who created the organization).
     */
    @Transactional(Transactional.TxType.MANDATORY)
    public void seed(UUID accountId, String email) {
        for (Category category : Category.values()) {
            em.createNativeQuery("""
                            INSERT INTO billing.account_contacts (id, account_id, category, email, verified_at)
                            VALUES (:id, :account, :category, :email, :now)
                            ON CONFLICT (account_id, category) DO NOTHING
                            """)
                    .setParameter("id", Ids.newId())
                    .setParameter("account", accountId)
                    .setParameter("category", category.name())
                    .setParameter("email", normalize(email))
                    .setParameter("now", OffsetDateTime.now())
                    .executeUpdate();
        }
    }

    /** Addresses are compared and stored in lower case. */
    static String normalize(String email) {
        return email.strip().toLowerCase(Locale.ROOT);
    }

    static AccountContactEntity require(UUID accountId, Category category) {
        return AccountContactEntity.findForUpdate(accountId, category)
                .orElseThrow(() -> new NotFoundException("The account has no " + category + " contact"));
    }
}
