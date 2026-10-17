package com.cantte.cetus.api.console;

import com.cantte.cetus.domain.DomainException;
import com.cantte.cetus.persistence.audit.Actor;
import com.cantte.cetus.persistence.entity.AccountEntity;
import jakarta.enterprise.context.RequestScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.jwt.JsonWebToken;

/**
 * Identity of a console request. The JWT is minted by Better Auth in the console server;
 * the "org" claim carries the active organization, which maps 1:1 to a Cetus account.
 */
@RequestScoped
public class ConsoleContext {

    @Inject
    JsonWebToken jwt;

    public String userId() {
        return jwt.getSubject();
    }

    /** The signed-in console user as the actor of an audited action. */
    public Actor actor() {
        return new Actor(Actor.ActorType.USER, jwt.getSubject());
    }

    public String organizationId() {
        String org = jwt.getClaim("org");
        if (org == null || org.isBlank()) {
            throw new DomainException("no_active_organization", "Select an organization first");
        }
        return org;
    }

    public AccountEntity account() {
        return AccountEntity.findByOrganization(organizationId())
                .orElseThrow(() -> new DomainException("account_not_found",
                        "The organization has no Cetus account yet"));
    }
}
