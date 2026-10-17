package com.cantte.cetus.api.auth;

import com.cantte.cetus.domain.model.Environment;
import jakarta.enterprise.context.RequestScoped;

import java.util.UUID;

/** Account and environment resolved from the API key of the current request. */
@RequestScoped
public class ApiPrincipal {

    private UUID accountId;
    private Environment environment;

    void set(UUID accountId, Environment environment) {
        this.accountId = accountId;
        this.environment = environment;
    }

    public UUID accountId() {
        return accountId;
    }

    public Environment environment() {
        return environment;
    }
}
