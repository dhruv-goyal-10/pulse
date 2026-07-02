"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { CohortGridResponse } from "@/types/api";

type Granularity = "monthly" | "quarterly";

function cellClass(pct: number | null): string {
  if (pct == null) return "bg-muted/30 text-muted-foreground";
  if (pct >= 90) return "bg-success/90 text-success-foreground";
  if (pct >= 75) return "bg-success/60 text-foreground";
  if (pct >= 60) return "bg-success/35 text-foreground";
  if (pct >= 45) return "bg-warning/50 text-foreground";
  if (pct >= 25) return "bg-warning/70 text-warning-foreground";
  return "bg-destructive/70 text-destructive-foreground";
}

function formatCohortLabel(cohort: string, granularity: Granularity): string {
  const d = new Date(cohort + "T00:00:00");
  if (granularity === "quarterly") {
    const q = Math.floor(d.getMonth() / 3) + 1;
    return `Q${q} ${d.getFullYear()}`;
  }
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function CohortGrid() {
  const [granularity, setGranularity] = useState<Granularity>("monthly");
  const { data, isLoading, isFetching } = useQuery<CohortGridResponse>({
    queryKey: ["cohorts", granularity],
    queryFn: () =>
      api<CohortGridResponse>("/metrics/cohorts", {
        query: { granularity, periods_back: 12, look_forward: 7 },
      }),
    placeholderData: (prev) => prev,
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="text-base">Cohort retention</CardTitle>
          <p className="text-xs text-muted-foreground">
            Rows are signup {granularity === "monthly" ? "months" : "quarters"}; columns are periods since signup.
          </p>
        </div>
        <Select value={granularity} onValueChange={(v) => setGranularity(v as Granularity)}>
          <SelectTrigger className="h-8 w-32 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="quarterly">Quarterly</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {isLoading || !data ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-full" />
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : (
          <div
            key={granularity}
            className={cn(
              "overflow-x-auto animate-in fade-in-0 slide-in-from-bottom-1 duration-400",
              isFetching && "opacity-70 transition-opacity"
            )}
          >
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="pb-2 pr-3 text-left font-medium">Cohort</th>
                  <th className="pb-2 pr-3 text-right font-medium">Size</th>
                  {Array.from({ length: data.look_forward }).map((_, i) => (
                    <th key={i} className="pb-2 pr-1 text-center font-medium">
                      {granularity === "monthly" ? `M${i + 1}` : `Q${i + 1}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row, rowIdx) => (
                  <tr
                    key={row.cohort}
                    className="border-t animate-in fade-in-0 slide-in-from-bottom-1 fill-mode-both"
                    style={{ animationDuration: "500ms", animationDelay: `${rowIdx * 30}ms` }}
                  >
                    <td className="py-1.5 pr-3 font-medium tabular-nums">
                      {formatCohortLabel(row.cohort, granularity)}
                    </td>
                    <td className="py-1.5 pr-3 text-right tabular-nums text-muted-foreground">{row.cohort_size}</td>
                    {row.retention.map((r, i) => (
                      <td key={i} className="p-0.5">
                        <div
                          className={cn(
                            "flex h-8 items-center justify-center rounded text-xs font-medium tabular-nums transition-colors",
                            cellClass(r)
                          )}
                        >
                          {r == null ? "—" : `${Math.round(r)}%`}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
