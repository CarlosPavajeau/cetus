package com.cantte.cetus.api.auth;

import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.persistence.audit.Actor;
import jakarta.enterprise.context.RequestScoped;
import java.util.UUID;

/** Account, environment and key resolved from the API key of the current request. */
@RequestScoped
public class ApiPrincipal {

    private UUID accountId;
    private Environment environment;
    private UUID apiKeyId;

    void set(UUID accountId, Environment environment, UUID apiKeyId) {
        this.accountId = accountId;
        this.environment = environment;
        this.apiKeyId = apiKeyId;
    }

    public UUID accountId() {
        return accountId;
    }

    public Environment environment() {
        return environment;
    }

    public UUID apiKeyId() {
        return apiKeyId;
    }

    /** The API key as the actor of an audited action. */
    public Actor actor() {
        return new Actor(Actor.ActorType.API_KEY, apiKeyId.toString());
    }
}
