"use client";

import { useQuery } from "@tanstack/react-query";

import { ActivityFeed } from "@/components/features/activity-feed";
import { KpiCard } from "@/components/features/kpi-card";
import { PlanDonut } from "@/components/features/plan-donut";
import { RevenueChart } from "@/components/features/revenue-chart";
import { Header } from "@/components/layout/header";
import { api } from "@/lib/api";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import type { KpisResponse } from "@/types/api";

export default function OverviewPage() {
  const { data, isLoading } = useQuery<KpisResponse>({
    queryKey: ["kpis", "30d"],
    queryFn: () => api<KpisResponse>("/metrics/kpis", { query: { period: "30d" } }),
  });

  const cards = [
    { label: "MRR", value: data ? formatCurrency(data.mrr.value) : "—", kpi: data?.mrr },
    {
      label: "Active subscriptions",
      value: data ? formatNumber(data.active_subscriptions.value) : "—",
      kpi: data?.active_subscriptions,
    },
    { label: "Churn rate", value: data ? formatPercent(data.churn_rate.value) : "—", kpi: data?.churn_rate },
    { label: "ARPU", value: data ? formatCurrency(data.arpu.value) : "—", kpi: data?.arpu },
  ];

  return (
    <>
      <Header title="Overview" subtitle="Subscription business health" />
      <main className="flex-1 space-y-6 p-4 md:p-6">
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c, i) => (
            <div
              key={c.label}
              className="animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-both"
              style={{ animationDuration: "500ms", animationDelay: `${i * 70}ms` }}
            >
              <KpiCard label={c.label} value={c.value} kpi={c.kpi} loading={isLoading} />
            </div>
          ))}
        </section>

        <section
          className="grid grid-cols-1 gap-4 lg:grid-cols-3 animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-both"
          style={{ animationDuration: "500ms", animationDelay: "300ms" }}
        >
          <div className="lg:col-span-2">
            <RevenueChart />
          </div>
          <PlanDonut />
        </section>

        <section
          className="animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-both"
          style={{ animationDuration: "500ms", animationDelay: "400ms" }}
        >
          <ActivityFeed />
        </section>
      </main>
    </>
  );
}
