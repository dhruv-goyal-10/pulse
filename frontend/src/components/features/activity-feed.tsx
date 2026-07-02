"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowDownRight, ArrowUpRight, Sparkles, UserMinus, UserPlus } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { formatCurrency, formatRelative } from "@/lib/format";
import type { ActivityItem } from "@/types/api";

interface ActivityFeedResponse {
  items: ActivityItem[];
}

const iconFor = (type: string) => {
  if (type === "new") return { icon: UserPlus, color: "text-success bg-success/10" };
  if (type === "expansion") return { icon: ArrowUpRight, color: "text-primary bg-primary/10" };
  if (type === "contraction") return { icon: ArrowDownRight, color: "text-warning bg-warning/10" };
  if (type === "churn") return { icon: UserMinus, color: "text-destructive bg-destructive/10" };
  return { icon: Sparkles, color: "text-muted-foreground bg-muted" };
};

export function ActivityFeed() {
  const { data, isLoading } = useQuery<ActivityFeedResponse>({
    queryKey: ["activity-recent"],
    queryFn: () => api<ActivityFeedResponse>("/activity/recent", { query: { limit: 10 } }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent activity</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-2 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : !data?.items?.length ? (
          <EmptyState title="No recent activity" description="Events will appear here as customers sign up, upgrade, or churn." />
        ) : (
          <ul className="space-y-3">
            {data.items.map((item) => {
              const { icon: Icon, color } = iconFor(item.event_type);
              return (
                <li key={item.id} className="flex items-start gap-3">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">{item.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatRelative(item.event_date)} · {item.amount >= 0 ? "+" : ""}
                      {formatCurrency(item.amount)}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
