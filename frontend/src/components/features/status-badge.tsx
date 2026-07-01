import { Badge } from "@/components/ui/badge";
import type { CustomerStatus } from "@/types/api";

const config: Record<CustomerStatus, { variant: "success" | "info" | "warning" | "muted"; label: string }> = {
  active: { variant: "success", label: "Active" },
  trialing: { variant: "info", label: "Trialing" },
  past_due: { variant: "warning", label: "Past due" },
  churned: { variant: "muted", label: "Churned" },
};

export function StatusBadge({ status }: { status: CustomerStatus }) {
  const c = config[status];
  return <Badge variant={c.variant}>{c.label}</Badge>;
}
