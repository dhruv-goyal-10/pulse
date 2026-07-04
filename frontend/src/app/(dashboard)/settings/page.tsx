"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, Download, Loader2, Mail, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import type {
  BillingResponse,
  NotificationPref,
  NotificationPrefsResponse,
  TeamMember,
  UserRole,
} from "@/types/api";

export default function SettingsPage() {
  return (
    <>
      <Header title="Settings" />
      <main className="flex-1 p-4 md:p-6">
        <Tabs defaultValue="team">
          <TabsList>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>
          <TabsContent value="team"><TeamTab /></TabsContent>
          <TabsContent value="billing"><BillingTab /></TabsContent>
          <TabsContent value="notifications"><NotificationsTab /></TabsContent>
        </Tabs>
      </main>
    </>
  );
}

function TeamTab() {
  const qc = useQueryClient();
  const { data: team, isLoading } = useQuery<TeamMember[]>({
    queryKey: ["team"],
    queryFn: () => api<TeamMember[]>("/team"),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => api(`/team/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team"] }),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Team members</CardTitle>
          <CardDescription>Manage who can access Pulse</CardDescription>
        </div>
        <InviteDialog />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : !team?.length ? (
          <EmptyState title="No team members yet" description="Invite your team to collaborate." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {team.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell className="text-muted-foreground">{m.email}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{m.role}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => removeMutation.mutate(m.id)} disabled={removeMutation.isPending}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function InviteDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("member");

  const invite = useMutation({
    mutationFn: () => api("/team/invite", { method: "POST", body: JSON.stringify({ email, role }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team"] });
      setEmail("");
      setOpen(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Invite member</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite team member</DialogTitle>
          <DialogDescription>They&apos;ll receive a link to accept and set a password.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="invite-email">Email</Label>
            <Input id="invite-email" type="email" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {invite.isError && <p className="text-sm text-destructive">{invite.error instanceof Error ? invite.error.message : "Failed"}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => invite.mutate()} disabled={!email || invite.isPending}>
            {invite.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send invite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BillingTab() {
  const { data, isLoading } = useQuery<BillingResponse>({
    queryKey: ["billing"],
    queryFn: () => api<BillingResponse>("/billing"),
  });

  if (isLoading || !data) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Current plan</CardTitle>
          <CardDescription>Next billing date {formatDate(data.next_billing_date)}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Stat label="Plan" value={data.plan} />
          <Stat label="Monthly cost" value={formatCurrency(data.plan_price)} />
          <Stat label="Seats" value={String(data.seats)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Payment method</CardTitle>
            <CardDescription>Used for renewals and prorations</CardDescription>
          </div>
          <Button variant="outline" size="sm">Update</Button>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <div className="rounded-md bg-primary/10 p-2 text-primary"><CreditCard className="h-5 w-5" /></div>
          <div>
            <div className="font-medium">{data.payment_method.brand} ending in {data.payment_method.last4}</div>
            <div className="text-sm text-muted-foreground">Expires {data.payment_method.exp_month.toString().padStart(2, "0")}/{data.payment_method.exp_year}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoice history</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">PDF</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.invoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">{inv.number}</TableCell>
                  <TableCell>{formatDate(inv.date)}</TableCell>
                  <TableCell className="tabular-nums">{formatCurrency(inv.amount)}</TableCell>
                  <TableCell><Badge variant="success" className="capitalize">{inv.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon"><Download className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function NotificationsTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<NotificationPrefsResponse>({
    queryKey: ["notifications"],
    queryFn: () => api<NotificationPrefsResponse>("/notifications"),
  });

  const update = useMutation({
    mutationFn: (body: { key: string; enabled: boolean }) =>
      api<NotificationPrefsResponse>("/notifications", { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: (data) => qc.setQueryData(["notifications"], data),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Mail className="h-4 w-4" /> Email notifications</CardTitle>
        <CardDescription>Choose which events you get emailed about</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : (
          <ul className="divide-y">
            {(data?.items ?? []).map((n: NotificationPref) => (
              <li key={n.key} className="flex items-center justify-between py-3">
                <div className="text-sm">{n.label}</div>
                <Switch
                  checked={n.enabled}
                  onCheckedChange={(checked) => update.mutate({ key: n.key, enabled: checked })}
                  disabled={update.isPending}
                />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}
