"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { formatCompactCurrency, formatCurrency, formatDate, titleCase } from "@/lib/format";
import type { RevenueTimeseriesResponse } from "@/types/api";

type Period = "7d" | "30d" | "90d";
type Mode = "total" | "movement";

function periodDates(period: Period) {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - Number(period.replace("d", "")));
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

export function RevenueChart() {
  const [period, setPeriod] = useState<Period>("90d");
  const [mode, setMode] = useState<Mode>("total");
  const { from, to } = periodDates(period);

  const { data, isLoading, isFetching } = useQuery<RevenueTimeseriesResponse>({
    queryKey: ["revenue-timeseries", from, to],
    queryFn: () => api<RevenueTimeseriesResponse>("/metrics/revenue-timeseries", { query: { from, to } }),
    placeholderData: (prev) => prev,
  });

  const points = data?.points ?? [];
  const totalTick = (v: number) => formatCompactCurrency(v);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-base">Revenue over time</CardTitle>
          <p className="text-xs text-muted-foreground">
            {titleCase(data?.granularity) || "…"} · {points.length} points
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
            <TabsList className="h-8">
              <TabsTrigger value="total" className="text-xs">Total</TabsTrigger>
              <TabsTrigger value="movement" className="text-xs">Movement</TabsTrigger>
            </TabsList>
          </Tabs>
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="h-8 w-24 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 days</SelectItem>
              <SelectItem value="30d">30 days</SelectItem>
              <SelectItem value="90d">90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-72 w-full" />
        ) : (
          <div
            key={`${mode}-${period}`}
            className={`h-72 w-full animate-in fade-in-0 duration-500 ${isFetching ? "opacity-70 transition-opacity" : ""}`}
          >
            <ResponsiveContainer width="100%" height="100%">
              {mode === "total" ? (
                <AreaChart data={points} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fillTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={(d) => formatDate(d, { month: "short", day: "numeric" })} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tickFormatter={totalTick} tickLine={false} axisLine={false} width={44} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip content={<ChartTooltip mode="total" />} />
                  <Area type="monotone" dataKey="total_mrr" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#fillTotal)" animationDuration={700} />
                </AreaChart>
              ) : (
                <AreaChart data={points} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={(d) => formatDate(d, { month: "short", day: "numeric" })} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tickFormatter={totalTick} tickLine={false} axisLine={false} width={44} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip content={<ChartTooltip mode="movement" />} />
                  <Area type="monotone" dataKey="new" stackId="1" stroke="hsl(var(--success))" fill="hsl(var(--success))" fillOpacity={0.5} animationDuration={700} />
                  <Area type="monotone" dataKey="expansion" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.5} animationDuration={700} />
                  <Area type="monotone" dataKey="contraction" stackId="1" stroke="hsl(var(--warning))" fill="hsl(var(--warning))" fillOpacity={0.5} animationDuration={700} />
                  <Area type="monotone" dataKey="churn" stackId="1" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive))" fillOpacity={0.5} animationDuration={700} />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface TooltipPayloadItem {
  name?: string;
  dataKey?: string;
  value?: number;
  color?: string;
}

function ChartTooltip({ active, payload, label, mode }: { active?: boolean; payload?: TooltipPayloadItem[]; label?: string; mode: Mode }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-popover p-2 text-xs shadow-md">
      <div className="mb-1 font-medium">{label && formatDate(label)}</div>
      {mode === "total" ? (
        <div>MRR: {formatCurrency(payload[0]?.value ?? 0)}</div>
      ) : (
        payload.map((p) => (
          <div key={p.dataKey} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="capitalize">{p.dataKey}:</span>
            <span className="tabular-nums">{formatCurrency(p.value ?? 0)}</span>
          </div>
        ))
      )}
    </div>
  );
}
