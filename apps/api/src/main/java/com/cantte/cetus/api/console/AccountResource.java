package com.cantte.cetus.api.console;

import com.cantte.cetus.api.audit.RequestOriginResolver;
import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.persistence.audit.AuditAction;
import com.cantte.cetus.persistence.audit.AuditLog;
import com.cantte.cetus.persistence.entity.AccountEntity;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Path("/console/account")
@Produces(MediaType.APPLICATION_JSON)
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
    public AccountView get() {
        return AccountView.from(context.account());
    }

    public record BootstrapRequest(@NotBlank String name) {
    }

    public record AccountView(UUID id, String name, String status, String plan) {
        static AccountView from(AccountEntity account) {
            return new AccountView(account.id, account.name, account.status, account.plan);
        }
    }
}
