package com.cantte.cetus.api.console;

import com.cantte.cetus.domain.Ids;
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

import java.util.UUID;

@Path("/console/account")
@Produces(MediaType.APPLICATION_JSON)
public class AccountResource {

    @Inject
    ConsoleContext context;

    /** Called by the console right after the organization is created in Better Auth. Idempotent. */
    @POST
    @Transactional
    public AccountView bootstrap(@Valid BootstrapRequest request) {
        AccountEntity account = AccountEntity.findByOrganization(context.organizationId()).orElseGet(() -> {
            AccountEntity created = new AccountEntity();
            created.id = Ids.newId();
            created.organizationId = context.organizationId();
            created.name = request.name();
            created.persist();
            return created;
        });
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
