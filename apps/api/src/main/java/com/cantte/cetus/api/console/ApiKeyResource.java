package com.cantte.cetus.api.console;

import com.cantte.cetus.api.audit.RequestOriginResolver;
import com.cantte.cetus.api.auth.ApiKeys;
import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.persistence.audit.AuditAction;
import com.cantte.cetus.persistence.audit.AuditLog;
import com.cantte.cetus.persistence.entity.ApiKeyEntity;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Path("/console/api-keys")
@Produces(MediaType.APPLICATION_JSON)
public class ApiKeyResource {

    @Inject
    ConsoleContext context;
    @Inject
    AuditLog auditLog;
    @Inject
    RequestOriginResolver origin;

    @GET
    @Transactional
    public List<ApiKeyView> list() {
        return ApiKeyEntity.listByAccount(context.account().id).stream().map(ApiKeyView::from).toList();
    }

    /** The full key is returned only here, once. */
    @POST
    @Transactional
    public CreatedApiKey create(@Valid @NotNull CreateApiKeyRequest request) {
        String secret = ApiKeys.generate(request.environment());
        ApiKeyEntity key = new ApiKeyEntity();
        key.id = Ids.newId();
        key.accountId = context.account().id;
        key.environment = request.environment();
        key.name = request.name();
        key.keyPrefix = ApiKeys.prefix(secret);
        key.keyHash = ApiKeys.hash(secret);
        key.persist();
        audit(AuditAction.API_KEY_CREATED, key);
        return new CreatedApiKey(ApiKeyView.from(key), secret);
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    public void revoke(@PathParam("id") UUID id) {
        ApiKeyEntity key = ApiKeyEntity.<ApiKeyEntity>findByIdOptional(id)
                .filter(found -> found.accountId.equals(context.account().id))
                .orElseThrow(() -> new NotFoundException("API key not found"));
        if (key.revokedAt == null) {
            key.revokedAt = OffsetDateTime.now();
            audit(AuditAction.API_KEY_REVOKED, key);
        }
    }

    /** Never the secret nor its hash: the prefix is enough to identify the key. */
    private void audit(AuditAction action, ApiKeyEntity key) {
        auditLog.record(key.accountId, context.actor(), origin.resolve(), action, "api_key", key.id,
                Map.of("name", key.name, "environment", key.environment, "prefix", key.keyPrefix));
    }

    public record CreateApiKeyRequest(@NotBlank @Size(max = 80) String name, @NotNull Environment environment) {
    }

    public record ApiKeyView(UUID id, String name, Environment environment, String prefix,
                             OffsetDateTime lastUsedAt, OffsetDateTime revokedAt, OffsetDateTime createdAt) {
        static ApiKeyView from(ApiKeyEntity key) {
            return new ApiKeyView(key.id, key.name, key.environment, key.keyPrefix, key.lastUsedAt,
                    key.revokedAt, key.createdAt);
        }
    }

    public record CreatedApiKey(ApiKeyView key, String secret) {
    }
}
