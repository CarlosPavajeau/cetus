package com.cantte.cetus.api.billing;

import com.cantte.cetus.api.billing.BillingViews.RevenueView;
import com.cantte.cetus.domain.billing.VatThreshold;
import com.cantte.cetus.persistence.entity.BillingOrderEntity;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

/**
 * What the paid orders add up to in a calendar year, Colombia time, against the income up to which Cetus' holder
 * stays not responsible for VAT. Refunded orders do not count.
 */
@ApplicationScoped
public class Revenue {

    public static final ZoneId COLOMBIA = ZoneId.of("America/Bogota");

    @Inject
    VatThresholds thresholds;

    @Transactional(Transactional.TxType.MANDATORY)
    public RevenueView year(int year) {
        long revenueCents = BillingOrderEntity.revenueCents(
                LocalDate.of(year, 1, 1).atStartOfDay(COLOMBIA).toOffsetDateTime(),
                LocalDate.of(year + 1, 1, 1).atStartOfDay(COLOMBIA).toOffsetDateTime());
        Optional<VatThreshold> threshold = thresholds.current();
        return new RevenueView(
                year,
                revenueCents,
                threshold.map(VatThreshold::uvtValueCop).orElse(null),
                threshold.map(VatThreshold::uvt).orElse(null),
                threshold.map(VatThreshold::limitCents).orElse(null),
                threshold
                        .map(t -> BigDecimal.valueOf(revenueCents)
                                .multiply(BigDecimal.valueOf(100))
                                .divide(BigDecimal.valueOf(t.limitCents()), 2, RoundingMode.HALF_UP))
                        .orElse(null),
                threshold.map(t -> t.crossed(revenueCents)).orElse(List.of()));
    }
}
