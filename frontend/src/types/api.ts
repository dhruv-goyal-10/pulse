export type Plan = "starter" | "growth" | "scale";
export type CustomerStatus = "active" | "trialing" | "past_due" | "churned";
export type UserRole = "admin" | "member" | "viewer";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar_url: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface LoginResponse {
  token: TokenResponse;
  user: User;
}

export interface KpiValue {
  value: number;
  delta_pct: number | null;
  delta_direction: "up" | "down" | "flat" | null;
  invert_color: boolean;
}

export interface KpisResponse {
  mrr: KpiValue;
  active_subscriptions: KpiValue;
  churn_rate: KpiValue;
  arpu: KpiValue;
  period_days: number;
}

export interface RevenueTimeseriesPoint {
  date: string;
  total_mrr: number;
  new: number;
  expansion: number;
  contraction: number;
  churn: number;
}

export interface RevenueTimeseriesResponse {
  granularity: "daily" | "weekly" | "monthly" | "quarterly";
  from_date: string;
  to_date: string;
  points: RevenueTimeseriesPoint[];
}

export interface PlanBreakdown {
  plan: string;
  customers: number;
  mrr: number;
  pct_of_mrr: number;
}

export interface RevenueByPlanResponse {
  total_mrr: number;
  tiers: PlanBreakdown[];
}

export interface MrrMovementResponse {
  from_date: string;
  to_date: string;
  new_starter: number;
  new_growth: number;
  new_scale: number;
  expansion_growth: number;
  expansion_scale: number;
  contraction: number;
  churn: number;
  net: number;
}

export interface CohortRow {
  cohort: string;
  cohort_size: number;
  retention: (number | null)[];
}

export interface CohortGridResponse {
  granularity: "monthly" | "quarterly";
  look_forward: number;
  rows: CohortRow[];
}

export interface ActivityItem {
  id: string;
  event_type: string;
  amount: number;
  event_date: string;
  customer_name: string;
  company: string;
  from_plan: string | null;
  to_plan: string | null;
  label: string;
}

export interface CustomerListItem {
  id: string;
  name: string;
  company: string;
  email: string;
  plan: Plan;
  status: CustomerStatus;
  mrr: number;
  signup_date: string;
  last_active: string;
}

export interface PlanChangeEntry {
  event_date: string;
  from_plan: string | null;
  to_plan: string | null;
  event_type: string;
}

export interface CustomerDetail extends CustomerListItem {
  plan_history: PlanChangeEntry[];
}

export interface RevenueHistoryPoint {
  event_date: string;
  event_type: string;
  amount: number;
  running_mrr: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface TeamMember extends User {}

export interface Invoice {
  id: string;
  number: string;
  date: string;
  amount: number;
  status: string;
  pdf_url: string;
}

export interface BillingResponse {
  plan: string;
  plan_price: number;
  seats: number;
  next_billing_date: string;
  payment_method: { brand: string; last4: string; exp_month: number; exp_year: number };
  invoices: Invoice[];
}

export interface NotificationPref {
  key: string;
  label: string;
  enabled: boolean;
}

export interface NotificationPrefsResponse {
  items: NotificationPref[];
}
