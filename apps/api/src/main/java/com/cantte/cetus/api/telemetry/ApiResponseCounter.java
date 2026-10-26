package com.cantte.cetus.api.telemetry;

import jakarta.inject.Inject;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerResponseContext;
import jakarta.ws.rs.container.ContainerResponseFilter;
import jakarta.ws.rs.ext.Provider;

/** Counts every response, those built by the exception mappers included. */
@Provider
public class ApiResponseCounter implements ContainerResponseFilter {

    @Inject
    ApiResponses responses;

    @Override
    public void filter(ContainerRequestContext request, ContainerResponseContext response) {
        responses.record(response.getStatus());
    }
}
