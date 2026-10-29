package com.cantte.cetus.api.usage;

import com.cantte.cetus.api.auth.ApiKeyRateLimiter;
import com.cantte.cetus.api.usage.UsageViews.DocumentCountView;
import com.cantte.cetus.api.usage.UsageViews.MonthTotalView;
import com.cantte.cetus.api.usage.UsageViews.PeriodUsageView;
import com.cantte.cetus.api.usage.UsageViews.PlanView;
import com.cantte.cetus.api.usage.UsageViews.RequestLimitsView;
import com.cantte.cetus.api.usage.UsageViews.UsageView;
import com.cantte.cetus.cache.RateLimiter;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.domain.usage.UsagePeriod;
import com.cantte.cetus.persistence.entity.AccountEntity;
import com.cantte.cetus.persistence.entity.IssuerEntity;
import com.cantte.cetus.persistence.entity.PlanEntity;
import com.cantte.cetus.persistence.usage.UsageCounters;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.time.YearMonth;
import java.util.List;

/** An account's billable documents against its current plan. */
@ApplicationScoped
public class AccountUsage {

    @Inject
    UsageCounters counters;

    @Inject
    ApiKeyRateLimiter rateLimiter;

    public PeriodUsageView period(AccountEntity account, YearMonth period) {
        PlanEntity plan = PlanEntity.of(account);
        List<DocumentCountView> documents = counters.byType(account.id, period).entrySet().stream()
                .map(entry -> new DocumentCountView(entry.getKey(), entry.getValue()))
                .toList();
        long total = documents.stream().mapToLong(DocumentCountView::count).sum();
        long overage = plan.documentsIncluded == null ? 0 : Math.max(0, total - plan.documentsIncluded);
        Long costOverage = plan.priceOverageCop == null ? null : overage * plan.priceOverageCop;
        return new PeriodUsageView(period.toString(), PlanView.from(plan), documents, total, overage, costOverage);
    }

    /** This month against the plan, and the totals of the {@code months} months up to it. */
    public UsageView overview(AccountEntity account, int months) {
        YearMonth current = UsagePeriod.current();
        List<MonthTotalView> totals =
                counters.totals(account.id, current.minusMonths(months - 1), current).reversed().entrySet().stream()
                        .map(entry -> new MonthTotalView(entry.getKey().toString(), entry.getValue()))
                        .toList();
        long issuersLive = IssuerEntity.count("accountId = ?1 and environment = ?2", account.id, Environment.LIVE);
        return new UsageView(period(account, current), issuersLive, totals, requests(account));
    }

    /** The account's own limits, else its plan's, else the per-key ones the API applies to every key. */
    private RequestLimitsView requests(AccountEntity account) {
        if (account.requestsPerSecond != null) {
            return new RequestLimitsView(account.requestsPerSecond, account.requestsBurst, false);
        }
        PlanEntity plan = PlanEntity.of(account);
        if (plan.requestsPerSecond != null) {
            return new RequestLimitsView(plan.requestsPerSecond, plan.requestsBurst, false);
        }
        RateLimiter.Limits perKey = rateLimiter.perKey();
        return new RequestLimitsView(perKey.ratePerSecond(), perKey.burst(), true);
    }
}
