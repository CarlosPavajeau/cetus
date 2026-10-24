package com.cantte.cetus.api.console;

import com.cantte.cetus.api.audit.RequestOriginResolver;
import com.cantte.cetus.api.auth.ApiKeys;
import com.cantte.cetus.api.error.ProblemDetail;
import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.persistence.audit.AuditAction;
import com.cantte.cetus.persistence.audit.AuditLog;
import com.cantte.cetus.persistence.entity.ApiKeyEntity;
import com.cantte.cetus.persistence.usage.ApiKeyRequestView;
import com.cantte.cetus.persistence.usage.ApiKeyUsage;
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
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

@Path("/console/api-keys")
@Produces(MediaType.APPLICATION_JSON)
@APIResponse(
        responseCode = "400",
        description = "Bad Request",
        content =
                @Content(mediaType = ProblemDetail.MEDIA_TYPE, schema = @Schema(implementation = ProblemDetail.class)))
@APIResponse(
        responseCode = "404",
        description = "Not Found",
        content =
                @Content(mediaType = ProblemDetail.MEDIA_TYPE, schema = @Schema(implementation = ProblemDetail.class)))
@APIResponse(
        responseCode = "422",
        description = "Unprocessable Entity",
        content =
                @Content(mediaType = ProblemDetail.MEDIA_TYPE, schema = @Schema(implementation = ProblemDetail.class)))
public class ApiKeyResource {

    static final int RECENT_REQUESTS = 10;

    @Inject
    ConsoleContext context;

    @Inject
    AuditLog auditLog;

    @Inject
    RequestOriginResolver origin;

    @Inject
    ApiKeyUsage usage;

    @GET
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    public List<ApiKeyView> list() {
        return ApiKeyEntity.listByAccount(context.account().id).stream()
                .map(ApiKeyView::from)
                .toList();
    }

    /** One key of the account with its most recent requests; 404 for a missing id or another account's key. */
    @GET
    @Path("/{id}")
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    public ApiKeyDetail get(@PathParam("id") UUID id) {
        UUID accountId = context.account().id;
        ApiKeyEntity key = find(accountId, id);
        return new ApiKeyDetail(
                ApiKeyView.from(key),
                usage.countSince(accountId, key.id, OffsetDateTime.now().minusHours(24)),
                usage.recent(accountId, key.id, RECENT_REQUESTS).stream()
                        .map(ApiKeyRequestEntry::from)
                        .toList());
    }

    /** The full key is returned only here, once. */
    @POST
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    public CreatedApiKey create(@Valid @NotNull CreateApiKeyRequest request) {
        String secret = ApiKeys.generate(request.environment());
        ApiKeyEntity key = new ApiKeyEntity();
        key.id = Ids.newId();
        key.accountId = context.account().id;
        key.environment = request.environment();
        key.name = request.name();
        key.keyPrefix = ApiKeys.prefix(secret);
        key.keyHash = ApiKeys.hash(secret);
        key.createdBy = context.userId();
        // Flush so the database-generated createdAt is in the response.
        key.persistAndFlush();
        audit(AuditAction.API_KEY_CREATED, key);
        return new CreatedApiKey(ApiKeyView.from(key), secret);
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    @APIResponse(responseCode = "204", description = "No Content")
    public void revoke(@PathParam("id") UUID id) {
        ApiKeyEntity key = find(context.account().id, id);
        if (key.revokedAt == null) {
            key.revokedAt = OffsetDateTime.now();
            audit(AuditAction.API_KEY_REVOKED, key);
        }
    }

    private static ApiKeyEntity find(UUID accountId, UUID id) {
        return ApiKeyEntity.findForAccount(accountId, id).orElseThrow(() -> new NotFoundException("API key not found"));
    }

    /** Never the secret nor its hash: the prefix is enough to identify the key. */
    private void audit(AuditAction action, ApiKeyEntity key) {
        auditLog.record(
                key.accountId,
                context.actor(),
                origin.resolve(),
                action,
                "api_key",
                key.id,
                Map.of("name", key.name, "environment", key.environment, "prefix", key.keyPrefix));
    }

    public record CreateApiKeyRequest(
            @NotBlank @Size(max = 80) String name, @NotNull Environment environment) {}

    public record ApiKeyView(
            @Schema(required = true) UUID id,
            @Schema(required = true) String name,
            @Schema(required = true) Environment environment,
            @Schema(required = true) String prefix,
            @Schema(required = true, nullable = true) OffsetDateTime lastUsedAt,
            @Schema(required = true, nullable = true) OffsetDateTime revokedAt,
            @Schema(required = true) OffsetDateTime createdAt,

            @Schema(required = true, nullable = true, description = "Better Auth user id of the creator")
            String createdBy) {
        static ApiKeyView from(ApiKeyEntity key) {
            return new ApiKeyView(
                    key.id,
                    key.name,
                    key.environment,
                    key.keyPrefix,
                    key.lastUsedAt,
                    key.revokedAt,
                    key.createdAt,
                    key.createdBy);
        }
    }

    public record ApiKeyDetail(
            @Schema(required = true) ApiKeyView key,
            @Schema(required = true) long requestsLast24Hours,

            @Schema(required = true, description = "Newest first")
            List<ApiKeyRequestEntry> recentRequests) {}

    /** A /v1 request made with the key. {@code id} is the X-Request-Id the client received. */
    public record ApiKeyRequestEntry(
            @Schema(required = true) UUID id,
            @Schema(required = true) String method,
            @Schema(required = true) String path,
            @Schema(required = true) int status,
            @Schema(required = true) int durationMs,
            @Schema(required = true) OffsetDateTime createdAt) {
        static ApiKeyRequestEntry from(ApiKeyRequestView request) {
            return new ApiKeyRequestEntry(
                    request.id(),
                    request.method(),
                    request.path(),
                    request.status(),
                    request.durationMs(),
                    request.createdAt());
        }
    }

    public record CreatedApiKey(
            @Schema(required = true) ApiKeyView key,
            @Schema(required = true) String secret) {}
}
