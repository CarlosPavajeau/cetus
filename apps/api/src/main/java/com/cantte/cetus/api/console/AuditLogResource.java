package com.cantte.cetus.api.console;

import com.cantte.cetus.persistence.audit.AuditAction;
import com.cantte.cetus.persistence.audit.AuditLog;
import com.cantte.cetus.persistence.audit.AuditPage;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;

/** Activity of the account behind the active organization, newest first. */
@Path("/console/audit-log")
@Produces(MediaType.APPLICATION_JSON)
public class AuditLogResource {

    @Inject
    ConsoleContext context;
    @Inject
    AuditLog auditLog;

    @GET
    @Transactional
    public AuditPage list(@QueryParam("action") String action,
                          @QueryParam("before") Long before,
                          @QueryParam("limit") @DefaultValue("50") int limit) {
        return auditLog.list(context.account().id, parseAction(action), before, limit);
    }

    private static AuditAction parseAction(String action) {
        if (action == null || action.isBlank()) {
            return null;
        }
        try {
            return AuditAction.valueOf(action);
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Unknown action " + action);
        }
    }
}
