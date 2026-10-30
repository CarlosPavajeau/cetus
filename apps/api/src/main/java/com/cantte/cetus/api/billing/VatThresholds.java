package com.cantte.cetus.api.billing;

import com.cantte.cetus.domain.billing.VatThreshold;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.List;
import java.util.Optional;
import org.eclipse.microprofile.config.inject.ConfigProperty;

/**
 * The VAT threshold of the year, from configuration: the UVT's value and the threshold in UVT change every year and
 * must be confirmed with the accountant, so the code never fixes them. Without both, there is no threshold to report
 * against. The yearly revenue report and the admins' alerts read it once paid orders exist (phase 2).
 */
@ApplicationScoped
public class VatThresholds {

    private final Optional<VatThreshold> current;

    public VatThresholds(
            @ConfigProperty(name = "cetus.billing.uvt-value-cop") Optional<Long> uvtValueCop,
            @ConfigProperty(name = "cetus.billing.vat-threshold-uvt") Optional<Integer> uvt,
            @ConfigProperty(name = "cetus.billing.vat-threshold-alert-percents") List<Integer> alertPercents) {
        current = uvtValueCop.flatMap(value -> uvt.map(units -> new VatThreshold(value, units, alertPercents)));
    }

    public Optional<VatThreshold> current() {
        return current;
    }
}
