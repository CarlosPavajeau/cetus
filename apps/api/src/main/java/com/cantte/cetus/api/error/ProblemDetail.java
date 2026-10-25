package com.cantte.cetus.api.error;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.ws.rs.core.Response;
import java.util.List;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/**
 * Error body returned by every endpoint, as an RFC 9457 problem detail. {@code code} is a stable extension
 * member clients branch on; {@code detail} is for humans. {@code type} and {@code instance} are filled in by
 * {@link ProblemResponseFilter}, so the code building the problem does not need the request.
 */
@Schema(name = "ProblemDetail", description = "Un error, como problem detail (RFC 9457).")
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ProblemDetail(
        @Schema(description = "Tipo del problema (RFC 9457).", example = "about:blank")
        String type,

        @Schema(description = "Nombre del estado HTTP.", example = "Unprocessable Entity")
        String title,

        @Schema(description = "Estado HTTP.", example = "422")
        int status,

        @Schema(description = "Explicación para personas. No decidas según este texto: cambia.")
        String detail,

        @Schema(description = "Ruta de la petición.", example = "/v1/invoices")
        String instance,

        @Schema(description = "Código estable del error. Decide según este campo.", example = "issuer_not_ready")
        String code,

        @Schema(description = "Los campos inválidos; solo en `invalid_request`.")
        List<FieldError> errors) {

    public static final String MEDIA_TYPE = "application/problem+json";

    /** One invalid field of the request; only present on {@code invalid_request}. */
    @Schema(description = "Un campo inválido de la petición.")
    public record FieldError(
            @Schema(description = "Ruta del campo.", example = "lines[0].quantity")
            String field,

            @Schema(description = "Por qué es inválido.", example = "must be greater than 0")
            String message) {}

    public static ProblemDetail of(int status, String code, String detail) {
        return of(status, code, detail, null);
    }

    public static ProblemDetail of(int status, String code, String detail, List<FieldError> errors) {
        return new ProblemDetail("about:blank", title(status), status, detail, null, code, errors);
    }

    public static Response response(int status, String code, String detail) {
        return builder(status, code, detail).build();
    }

    /** For callers that add headers (e.g. {@code Retry-After}) before building. */
    public static Response.ResponseBuilder builder(int status, String code, String detail) {
        return Response.status(status).type(MEDIA_TYPE).entity(of(status, code, detail));
    }

    ProblemDetail withContext(String type, String instance) {
        return new ProblemDetail(type, title, status, detail, instance, code, errors);
    }

    private static String title(int status) {
        Response.Status known = Response.Status.fromStatusCode(status);
        if (known != null) {
            return known.getReasonPhrase();
        }
        return Response.Status.Family.familyOf(status) == Response.Status.Family.CLIENT_ERROR
                ? "Client Error"
                : "Server Error";
    }
}
