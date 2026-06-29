"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { formatCompactCurrency, formatCurrency } from "@/lib/format";
import type { MrrMovementResponse } from "@/types/api";

type Period = "30d" | "90d" | "180d" | "365d";

const PERIOD_LABEL: Record<Period, string> = {
  "30d": "Last 30 days",
  "90d": "Last quarter",
  "180d": "Last 6 months",
  "365d": "Last year",
};

function periodDates(period: Period) {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - Number(period.replace("d", "")));
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

function fmt(v: number) {
  return v < 0
    ? `-${formatCurrency(Math.abs(v), { maximumFractionDigits: 0 })}`
    : formatCurrency(v, { maximumFractionDigits: 0 });
}

interface TickProps {
  x?: number;
  y?: number;
  payload?: { value: string };
}

function StackedTick({ x = 0, y = 0, payload }: TickProps) {
  const value = String(payload?.value ?? "");
  const parts = value.split(" ");
  const isSingleLine = parts.length === 1;
  return (
    <g transform={`translate(${x},${y})`}>
      {isSingleLine ? (
        <text x={0} y={18} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize={11}>
          {parts[0]}
        </text>
      ) : (
        <>
          <text x={0} y={12} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize={11}>
            {parts[0]}
          </text>
          <text x={0} y={26} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize={11} fontWeight={500}>
            {parts.slice(1).join(" ")}
          </text>
        </>
      )}
    </g>
  );
}

export function MrrWaterfall() {
  const [period, setPeriod] = useState<Period>("90d");
  const { from, to } = periodDates(period);
  const { data, isLoading, isFetching } = useQuery<MrrMovementResponse>({
    queryKey: ["mrr-movement", from, to],
    queryFn: () => api<MrrMovementResponse>("/metrics/mrr-movement", { query: { from, to } }),
    placeholderData: (prev) => prev,
  });

  const bars = data
    ? [
        { name: "New Starter", value: data.new_starter, fill: "hsl(var(--chart-3) / 0.55)" },
        { name: "New Growth", value: data.new_growth, fill: "hsl(var(--chart-3) / 0.8)" },
        { name: "New Scale", value: data.new_scale, fill: "hsl(var(--chart-3))" },
        { name: "Upgrade Growth", value: data.expansion_growth, fill: "hsl(var(--chart-1) / 0.7)" },
        { name: "Upgrade Scale", value: data.expansion_scale, fill: "hsl(var(--chart-1))" },
        { name: "Contraction", value: data.contraction, fill: "hsl(var(--warning))" },
        { name: "Churn", value: data.churn, fill: "hsl(var(--destructive))" },
        { name: "Net", value: data.net, fill: data.net >= 0 ? "hsl(var(--foreground))" : "hsl(var(--destructive))" },
      ]
    : [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="text-base">MRR movement</CardTitle>
          <p className="text-xs text-muted-foreground">Net MRR change decomposed into components</p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="h-8 w-40 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(PERIOD_LABEL) as Period[]).map((p) => (
              <SelectItem key={p} value={p}>{PERIOD_LABEL[p]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-72 w-full" />
        ) : (
          <div
            key={period}
            className={`h-72 w-full animate-in fade-in-0 duration-500 ${isFetching ? "opacity-70 transition-opacity" : ""}`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bars} margin={{ left: 0, right: 16, top: 28, bottom: 8 }} barCategoryGap="18%">
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  height={40}
                  tick={<StackedTick />}
                />
                <YAxis
                  tickFormatter={(v) => formatCompactCurrency(v)}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                />
                <Tooltip
                  formatter={(v: number) => fmt(v)}
                  cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
                  contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--popover))", fontSize: 12 }}
                />
                <Bar
                  dataKey="value"
                  radius={[4, 4, 4, 4]}
                  minPointSize={4}
                  animationDuration={700}
                  animationEasing="ease-out"
                >
                  {bars.map((b, i) => (
                    <Cell key={i} fill={b.fill} />
                  ))}
                  <LabelList
                    dataKey="value"
                    position="top"
                    offset={8}
                    fill="hsl(var(--foreground))"
                    fontSize={10}
                    fontWeight={500}
                    formatter={(v: number | string) => {
                      const n = Number(v);
                      return n > 0 ? fmt(n) : "";
                    }}
                  />
                  <LabelList
                    dataKey="value"
                    position="bottom"
                    offset={8}
                    fill="hsl(var(--foreground))"
                    fontSize={10}
                    fontWeight={500}
                    formatter={(v: number | string) => {
                      const n = Number(v);
                      return n < 0 ? fmt(n) : "";
                    }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
