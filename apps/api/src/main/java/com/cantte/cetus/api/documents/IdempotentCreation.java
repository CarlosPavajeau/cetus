package com.cantte.cetus.api.documents;

import com.cantte.cetus.api.error.ApiError;
import com.cantte.cetus.domain.dian.Hashing;
import com.cantte.cetus.persistence.IdempotencyStore;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.nio.charset.StandardCharsets;
import java.util.UUID;
import java.util.function.Function;

/**
 * Runs a document creation under an Idempotency-Key: a retry with the same key and body gets the
 * stored response back instead of a second document. The key is stored in the caller's transaction,
 * so a failed creation leaves no trace of it.
 */
@ApplicationScoped
public class IdempotentCreation {

    @Inject
    IdempotencyStore idempotency;
    @Inject
    ObjectMapper mapper;

    /**
     * @param create receives the request serialized as JSON (stored as the document payload) and
     *               returns the response body
     */
    @Transactional(Transactional.TxType.MANDATORY)
    public Response accept(UUID accountId, String idempotencyKey, Object request, Function<String, Object> create)
            throws JsonProcessingException {
        String rawJson = mapper.writeValueAsString(request);
        String requestHash = Hashing.sha256Hex(rawJson.getBytes(StandardCharsets.UTF_8));

        var outcome = idempotency.begin(accountId, idempotencyKey, requestHash);
        switch (outcome.state()) {
            case REPLAY:
                return Response.status(outcome.responseStatus()).entity(outcome.responseBody())
                        .type(MediaType.APPLICATION_JSON).header("Idempotent-Replayed", "true").build();
            case IN_PROGRESS:
                return Response.status(409).entity(new ApiError("idempotency_in_progress",
                        "A request with this Idempotency-Key is still being processed", null)).build();
            case MISMATCH:
                return Response.status(422).entity(new ApiError("idempotency_mismatch",
                        "This Idempotency-Key was used with a different request body", null)).build();
            default:
                break;
        }

        Object body = create.apply(rawJson);
        idempotency.complete(accountId, idempotencyKey, 202, mapper.writeValueAsString(body));
        return Response.accepted(body).build();
    }
}
