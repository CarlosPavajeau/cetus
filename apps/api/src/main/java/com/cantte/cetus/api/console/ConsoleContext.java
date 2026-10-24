package com.cantte.cetus.api.console;

import com.cantte.cetus.domain.DomainException;
import com.cantte.cetus.persistence.audit.Actor;
import com.cantte.cetus.persistence.entity.AccountEntity;
import jakarta.enterprise.context.RequestScoped;
import jakarta.inject.Inject;
import jakarta.json.JsonArray;
import jakarta.json.JsonString;
import java.util.Collection;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
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

    /** The address the user signs in with, as Better Auth put it in the token. */
    public Optional<String> email() {
        String email = jwt.getClaim("email");
        return Optional.ofNullable(email).filter(value -> !value.isBlank());
    }

    /** The user's roles in the active organization (owner, admin, member), as the console put them in the token. */
    public Set<String> organizationRoles() {
        Object roles = jwt.getClaim("orgRoles");
        if (roles instanceof JsonArray array) {
            return array.stream()
                    .filter(JsonString.class::isInstance)
                    .map(value -> ((JsonString) value).getString())
                    .collect(Collectors.toUnmodifiableSet());
        }
        if (roles instanceof Collection<?> values) {
            return values.stream().map(String::valueOf).collect(Collectors.toUnmodifiableSet());
        }
        return Set.of();
    }

    /** The Cetus admin acting as this user, while an impersonation session lasts. */
    public Optional<String> impersonatedBy() {
        // A JSON null may come back as a JsonValue rather than null: only a non-blank string counts.
        Object admin = jwt.getClaim("impersonatedBy");
        if (admin instanceof JsonString json) {
            admin = json.getString();
        }
        return admin instanceof String id && !id.isBlank() ? Optional.of(id) : Optional.empty();
    }

    /** The signed-in console user as the actor of an audited action. */
    public Actor actor() {
        return new Actor(
                Actor.ActorType.USER, jwt.getSubject(), impersonatedBy().orElse(null));
    }

    /** A member of the Cetus team acting from the administration (the caller holds a platform role). */
    public Actor platformActor() {
        return new Actor(Actor.ActorType.PLATFORM, jwt.getSubject());
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
                .orElseThrow(
                        () -> new DomainException("account_not_found", "The organization has no Cetus account yet"));
    }
}
