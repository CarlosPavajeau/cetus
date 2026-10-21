package com.cantte.cetus.api.console;

import com.cantte.cetus.api.audit.RequestOriginResolver;
import com.cantte.cetus.api.error.ProblemDetail;
import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.persistence.audit.AuditAction;
import com.cantte.cetus.persistence.audit.AuditLog;
import com.cantte.cetus.persistence.entity.AccountEntity;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Path("/console/account")
@Produces(MediaType.APPLICATION_JSON)
@APIResponse(responseCode = "400", description = "Bad Request",
        content = @Content(mediaType = ProblemDetail.MEDIA_TYPE, schema = @Schema(implementation = ProblemDetail.class)))
@APIResponse(responseCode = "404", description = "Not Found",
        content = @Content(mediaType = ProblemDetail.MEDIA_TYPE, schema = @Schema(implementation = ProblemDetail.class)))
@APIResponse(responseCode = "422", description = "Unprocessable Entity",
        content = @Content(mediaType = ProblemDetail.MEDIA_TYPE, schema = @Schema(implementation = ProblemDetail.class)))
public class AccountResource {

    @Inject
    ConsoleContext context;
    @Inject
    AuditLog auditLog;
    @Inject
    RequestOriginResolver origin;

    /** Called by the console right after the organization is created in Better Auth. Idempotent. */
    @POST
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    public AccountView bootstrap(@Valid BootstrapRequest request) {
        Optional<AccountEntity> existing = AccountEntity.findByOrganization(context.organizationId());
        if (existing.isPresent()) {
            return AccountView.from(existing.get());
        }
        AccountEntity account = new AccountEntity();
        account.id = Ids.newId();
        account.organizationId = context.organizationId();
        account.name = request.name();
        account.persist();
        auditLog.record(account.id, context.actor(), origin.resolve(), AuditAction.ACCOUNT_CREATED,
                "account", account.id, Map.of("name", account.name));
        return AccountView.from(account);
    }

    @GET
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    public AccountView get() {
        return AccountView.from(context.account());
    }

    public record BootstrapRequest(@NotBlank @Size(max = 200) String name) {
    }

    public record AccountView(
            @Schema(required = true) UUID id,
            @Schema(required = true) String name,
            @Schema(required = true) String status,
            @Schema(required = true) String plan,
            @Schema(required = true, nullable = true, description = "Why the account is suspended, when it is")
            String statusReason) {
        static AccountView from(AccountEntity account) {
            return new AccountView(account.id, account.name, account.status, account.plan,
                    "ACTIVE".equals(account.status) ? null : account.statusReason);
        }
    }
}
