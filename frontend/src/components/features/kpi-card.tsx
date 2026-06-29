import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { KpiValue } from "@/types/api";

interface KpiCardProps {
  label: string;
  value: string;
  kpi?: KpiValue;
  loading?: boolean;
}

export function KpiCard({ label, value, kpi, loading }: KpiCardProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-4 h-8 w-32" />
          <Skeleton className="mt-4 h-5 w-24" />
        </CardContent>
      </Card>
    );
  }

  const dir = kpi?.delta_direction || "flat";
  const invert = kpi?.invert_color ?? false;
  const isPositive = (!invert && dir === "up") || (invert && dir === "down");
  const isNegative = (!invert && dir === "down") || (invert && dir === "up");

  const deltaColor = isPositive
    ? "text-success"
    : isNegative
      ? "text-destructive"
      : "text-muted-foreground";

  const Icon = dir === "up" ? ArrowUpRight : dir === "down" ? ArrowDownRight : Minus;

  return (
    <Card className="group relative overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <CardContent className="p-5">
        <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="mt-2 text-[28px] font-semibold tabular-nums leading-none tracking-tight">{value}</div>
        {kpi?.delta_pct != null ? (
          <div className="mt-3 flex items-center gap-1.5 text-xs">
            <span className={cn("inline-flex items-center gap-0.5 font-medium tabular-nums", deltaColor)}>
              <Icon className="h-3 w-3" />
              {kpi.delta_pct > 0 ? "+" : ""}
              {kpi.delta_pct.toFixed(1)}%
            </span>
            <span className="text-muted-foreground">vs previous period</span>
          </div>
        ) : (
          <div className="mt-3 h-5" />
        )}
      </CardContent>
    </Card>
  );
}
