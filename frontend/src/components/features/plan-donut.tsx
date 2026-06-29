"use client";

import { useQuery } from "@tanstack/react-query";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import type { RevenueByPlanResponse } from "@/types/api";

const PLAN_COLORS: Record<string, string> = {
  starter: "hsl(var(--chart-2))",
  growth: "hsl(var(--chart-1))",
  scale: "hsl(var(--chart-3))",
};

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

interface TipEntry {
  payload?: { plan: string; mrr: number; customers: number; pct_of_mrr: number };
}

function DonutTooltip({ active, payload }: { active?: boolean; payload?: TipEntry[] }) {
  const p = payload?.[0]?.payload;
  if (!active || !p) return null;
  return (
    <div className="rounded-md border bg-popover px-2.5 py-2 text-xs shadow-md">
      <div className="mb-0.5 font-medium">{titleCase(p.plan)}</div>
      <div className="text-muted-foreground">
        {formatCurrency(p.mrr)} · {p.customers} customers · {p.pct_of_mrr.toFixed(1)}%
      </div>
    </div>
  );
}

export function PlanDonut() {
  const { data, isLoading } = useQuery<RevenueByPlanResponse>({
    queryKey: ["revenue-by-plan"],
    queryFn: () => api<RevenueByPlanResponse>("/metrics/revenue-by-plan"),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Revenue by plan</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="animate-in fade-in-0 duration-500">
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data?.tiers ?? []}
                    dataKey="mrr"
                    nameKey="plan"
                    innerRadius="60%"
                    outerRadius="85%"
                    paddingAngle={2}
                    animationDuration={700}
                  >
                    {(data?.tiers ?? []).map((t) => (
                      <Cell key={t.plan} fill={PLAN_COLORS[t.plan] ?? "hsl(var(--muted))"} stroke="hsl(var(--card))" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip content={<DonutTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 space-y-2">
              {(data?.tiers ?? []).map((t) => (
                <div key={t.plan} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PLAN_COLORS[t.plan] }} />
                    <span>{titleCase(t.plan)}</span>
                    <span className="text-xs text-muted-foreground">({t.customers})</span>
                  </div>
                  <div className="flex items-center gap-3 tabular-nums">
                    <span className="text-xs text-muted-foreground">{t.pct_of_mrr.toFixed(1)}%</span>
                    <span className="font-medium">{formatCurrency(t.mrr)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
