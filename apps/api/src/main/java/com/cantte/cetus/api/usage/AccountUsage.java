package com.cantte.cetus.api.usage;

import com.cantte.cetus.api.auth.ApiKeyRateLimiter;
import com.cantte.cetus.api.usage.UsageViews.DocumentCountView;
import com.cantte.cetus.api.usage.UsageViews.MonthTotalView;
import com.cantte.cetus.api.usage.UsageViews.PeriodUsageView;
import com.cantte.cetus.api.usage.UsageViews.RequestLimitsView;
import com.cantte.cetus.api.usage.UsageViews.UsageView;
import com.cantte.cetus.cache.RateLimiter;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.domain.usage.UsagePeriod;
import com.cantte.cetus.persistence.entity.AccountEntity;
import com.cantte.cetus.persistence.entity.IssuerEntity;
import com.cantte.cetus.persistence.entity.PlanEntity;
import com.cantte.cetus.persistence.entity.PlanVersionEntity;
import com.cantte.cetus.persistence.entity.SubscriptionEntity;
import com.cantte.cetus.persistence.usage.UsageCounters;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.time.YearMonth;
import java.util.List;
import java.util.Optional;

/** An account's billable documents and the API limits that apply to it. */
@ApplicationScoped
public class AccountUsage {

    @Inject
    UsageCounters counters;

    @Inject
    ApiKeyRateLimiter rateLimiter;

    public PeriodUsageView period(AccountEntity account, YearMonth period) {
        List<DocumentCountView> documents = counters.byType(account.id, period).entrySet().stream()
                .map(entry -> new DocumentCountView(entry.getKey(), entry.getValue()))
                .toList();
        long total = documents.stream().mapToLong(DocumentCountView::count).sum();
        return new PeriodUsageView(period.toString(), documents, total);
    }

    /** This month, and the totals of the {@code months} months up to it. */
    public UsageView overview(AccountEntity account, int months) {
        YearMonth current = UsagePeriod.current();
        List<MonthTotalView> totals =
                counters.totals(account.id, current.minusMonths(months - 1), current).reversed().entrySet().stream()
                        .map(entry -> new MonthTotalView(entry.getKey().toString(), entry.getValue()))
                        .toList();
        long issuersLive = IssuerEntity.count("accountId = ?1 and environment = ?2", account.id, Environment.LIVE);
        return new UsageView(period(account, current), issuersLive, totals, requests(account));
    }

    /**
     * The account's own limits, else its subscription plan's, else the per-key ones the API applies to every key.
     */
    private RequestLimitsView requests(AccountEntity account) {
        if (account.requestsPerSecond != null) {
            return new RequestLimitsView(account.requestsPerSecond, account.requestsBurst, false);
        }
        Optional<PlanEntity> subscribed = SubscriptionEntity.findCurrent(account.id)
                .map(subscription -> PlanVersionEntity.<PlanVersionEntity>findById(subscription.planVersionId))
                .map(version -> PlanEntity.<PlanEntity>findById(version.planId));
        if (subscribed.isPresent() && subscribed.get().requestsPerSecond != null) {
            PlanEntity plan = subscribed.get();
            return new RequestLimitsView(plan.requestsPerSecond, plan.requestsBurst, false);
        }
        RateLimiter.Limits perKey = rateLimiter.perKey();
        return new RequestLimitsView(perKey.ratePerSecond(), perKey.burst(), true);
    }
}
