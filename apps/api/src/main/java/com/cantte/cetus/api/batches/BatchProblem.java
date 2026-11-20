package com.cantte.cetus.api.batches;

import com.cantte.cetus.api.error.ProblemDetail;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;
import java.util.List;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/** A batch refused because of its items: every error of every item, so the file is fixed in one go. */
@Schema(description = "Un lote rechazado por sus facturas, con todos sus errores.")
public record BatchProblem(
        @Schema(description = "Estado HTTP.", example = "422")
        int status,

        @Schema(description = "Código estable del error.", example = "invalid_batch")
        String code,

        @Schema(description = "Explicación para personas.") String detail,

        @Schema(description = "Los errores, por factura.") List<BatchError> errors) {

    public static class Invalid extends WebApplicationException {

        public Invalid(List<BatchError> errors) {
            super(Response.status(422)
                    .type(ProblemDetail.MEDIA_TYPE)
                    .entity(new BatchProblem(
                            422, "invalid_batch", errors.size() + " errors in the batch's invoices", errors))
                    .build());
        }
    }
}
