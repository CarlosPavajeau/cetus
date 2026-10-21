package com.cantte.cetus.api.admin;

import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.jwt.JsonWebToken;

import java.util.List;

/** Who is calling the administration API. Lets the console check the platform role end to end. */
@Path("/admin/me")
@Produces(MediaType.APPLICATION_JSON)
public class AdminSessionResource {

    @Inject
    JsonWebToken jwt;

    @GET
    @RolesAllowed({PlatformRoles.ADMIN, PlatformRoles.SUPPORT})
    public AdminSessionView me() {
        return new AdminSessionView(jwt.getSubject(), jwt.getGroups().stream().sorted().toList());
    }

    public record AdminSessionView(String userId, List<String> roles) {
    }
}
