"use client";

import { useQuery } from "@tanstack/react-query";
import { Ban, Loader2, RefreshCw } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { StatusBadge } from "@/components/features/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { api } from "@/lib/api";
import { formatCurrency, formatDate, formatRelative } from "@/lib/format";
import type { CustomerDetail, RevenueHistoryPoint } from "@/types/api";

interface Props {
  customerId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomerDetailSheet({ customerId, open, onOpenChange }: Props) {
  const { data: detail, isLoading } = useQuery<CustomerDetail>({
    queryKey: ["customer", customerId],
    queryFn: () => api<CustomerDetail>(`/customers/${customerId}`),
    enabled: !!customerId && open,
  });

  const { data: history } = useQuery<RevenueHistoryPoint[]>({
    queryKey: ["customer-revenue", customerId],
    queryFn: () => api<RevenueHistoryPoint[]>(`/customers/${customerId}/revenue-history`),
    enabled: !!customerId && open,
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-4">
        {isLoading || !detail ? (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading customer…
          </div>
        ) : (
          <>
            <SheetHeader>
              <div className="flex items-center gap-2">
                <SheetTitle>{detail.company}</SheetTitle>
                <StatusBadge status={detail.status} />
                <Badge variant="outline" className="capitalize">{detail.plan}</Badge>
              </div>
              <SheetDescription>
                {detail.name} · {detail.email}
              </SheetDescription>
            </SheetHeader>

            <div className="grid grid-cols-3 gap-3 rounded-md border p-3">
              <Stat label="MRR" value={formatCurrency(detail.mrr)} />
              <Stat label="Signed up" value={formatDate(detail.signup_date)} />
              <Stat label="Last active" value={formatRelative(detail.last_active)} />
            </div>

            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Revenue history</div>
              <div className="h-40 w-full rounded-md border p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history ?? []}>
                    <XAxis dataKey="event_date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(d) => formatDate(d, { month: "short", day: "numeric" })} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `$${v}`} width={40} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Line type="stepAfter" dataKey="running_mrr" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Plan history</div>
              <ul className="space-y-2 text-sm">
                {detail.plan_history.map((p, i) => (
                  <li key={i} className="flex items-center justify-between rounded-md border p-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">{p.event_type}</Badge>
                      <span>
                        {p.from_plan && <span className="capitalize text-muted-foreground">{p.from_plan} → </span>}
                        <span className="capitalize font-medium">{p.to_plan ?? "—"}</span>
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDate(p.event_date)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Separator />
            <div className="flex items-center gap-2">
              <Button variant="outline" className="gap-2">
                <RefreshCw className="h-4 w-4" /> Change plan
              </Button>
              <Button variant="destructive" className="gap-2">
                <Ban className="h-4 w-4" /> Cancel subscription
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Actions are visual placeholders in this portfolio build.</p>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-medium tabular-nums">{value}</div>
    </div>
  );
}
