package com.cantte.cetus.worker.support;

import com.cantte.cetus.domain.Ids;
import io.quarkus.test.junit.QuarkusTestProfile;
import java.util.Map;

/** The platform's issuer is configured, so paid orders are invoiced and watched. */
public class BillingIssuerConfigured implements QuarkusTestProfile {

    @Override
    public Map<String, String> getConfigOverrides() {
        return Map.of("cetus.billing.invoice-issuer-id", Ids.newId().toString());
    }
}
