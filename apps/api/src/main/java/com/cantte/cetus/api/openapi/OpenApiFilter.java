package com.cantte.cetus.api.openapi;

import org.eclipse.microprofile.openapi.OASFactory;
import org.eclipse.microprofile.openapi.OASFilter;
import org.eclipse.microprofile.openapi.models.OpenAPI;
import org.eclipse.microprofile.openapi.models.media.Schema;

/** Adjusts what annotations cannot express. The console generates its TypeScript types from this spec. */
public class OpenApiFilter implements OASFilter {

    @Override
    public void filterOpenAPI(OpenAPI openAPI) {
        Schema auditValue = openAPI.getComponents().getSchemas().get("AuditValue");
        if (auditValue != null) {
            auditValue.setType(null);
            auditValue.addOneOf(OASFactory.createSchema().addType(Schema.SchemaType.NULL));
        }
    }
}
