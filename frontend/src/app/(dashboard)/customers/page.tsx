"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { useState } from "react";

import { CustomerDetailSheet } from "@/components/features/customer-detail-sheet";
import { StatusBadge } from "@/components/features/status-badge";
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDebounce } from "@/hooks/use-debounce";
import { api } from "@/lib/api";
import { formatCurrency, formatDate, formatRelative } from "@/lib/format";
import type { CustomerListItem, CustomerStatus, PaginatedResponse } from "@/types/api";

const STATUS_OPTIONS: (CustomerStatus | "all")[] = ["all", "active", "trialing", "past_due", "churned"];

type SortField = "name" | "company" | "mrr" | "signup_date" | "last_active";

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [status, setStatus] = useState<CustomerStatus | "all">("all");
  const [sortField, setSortField] = useState<SortField>("mrr");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const size = 15;

  const { data, isLoading, isFetching } = useQuery<PaginatedResponse<CustomerListItem>>({
    queryKey: ["customers", debouncedSearch, status, sortField, sortDir, page],
    queryFn: () =>
      api<PaginatedResponse<CustomerListItem>>("/customers", {
        query: {
          page,
          size,
          search: debouncedSearch || undefined,
          status: status === "all" ? undefined : status,
          sort: `${sortField}:${sortDir}`,
        },
      }),
    placeholderData: (prev) => prev,
  });

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const openDetail = (id: string) => {
    setSelectedId(id);
    setSheetOpen(true);
  };

  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    setPage(1);
  };

  return (
    <>
      <Header title="Customers" subtitle={`${data?.total ?? 0} total`} />
      <main className="flex-1 space-y-4 p-4 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              placeholder="Search name, company, or email…"
              className="pl-9"
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_OPTIONS.map((s) => (
              <Button
                key={s}
                variant={status === s ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setStatus(s);
                  setPage(1);
                }}
                className="capitalize"
              >
                {s === "all" ? "All" : s.replace("_", " ")}
              </Button>
            ))}
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : !data?.items.length ? (
              <div className="p-8">
                <EmptyState
                  title="No customers match these filters"
                  description="Try clearing search or the status filter."
                  action={
                    <Button variant="outline" size="sm" onClick={clearFilters} className="gap-1">
                      <X className="h-3 w-3" /> Clear filters
                    </Button>
                  }
                />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortHeader field="name" active={sortField} dir={sortDir} onClick={toggleSort}>Name</SortHeader>
                    <SortHeader field="company" active={sortField} dir={sortDir} onClick={toggleSort}>Company</SortHeader>
                    <TableHead>Plan</TableHead>
                    <SortHeader field="mrr" active={sortField} dir={sortDir} onClick={toggleSort}>MRR</SortHeader>
                    <TableHead>Status</TableHead>
                    <SortHeader field="signup_date" active={sortField} dir={sortDir} onClick={toggleSort}>Signup</SortHeader>
                    <SortHeader field="last_active" active={sortField} dir={sortDir} onClick={toggleSort}>Last active</SortHeader>
                  </TableRow>
                </TableHeader>
                <TableBody className={isFetching ? "opacity-60 transition-opacity" : ""}>
                  {data.items.map((c) => (
                    <TableRow key={c.id} className="cursor-pointer" onClick={() => openDetail(c.id)}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-muted-foreground">{c.company}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{c.plan}</Badge></TableCell>
                      <TableCell className="tabular-nums">{formatCurrency(c.mrr)}</TableCell>
                      <TableCell><StatusBadge status={c.status} /></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(c.signup_date)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatRelative(c.last_active)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {data && data.pages > 1 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Page {data.page} of {data.pages} · {data.total} customers
            </span>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="h-4 w-4" /> Prev
              </Button>
              <Button variant="outline" size="sm" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </main>

      <CustomerDetailSheet customerId={selectedId} open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  );
}

function SortHeader({
  field,
  active,
  dir,
  onClick,
  children,
}: {
  field: SortField;
  active: SortField;
  dir: "asc" | "desc";
  onClick: (f: SortField) => void;
  children: React.ReactNode;
}) {
  const isActive = active === field;
  const Icon = !isActive ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <TableHead>
      <button
        onClick={() => onClick(field)}
        className="inline-flex items-center gap-1 text-left font-medium text-muted-foreground hover:text-foreground"
      >
        {children}
        <Icon className="h-3 w-3" />
      </button>
    </TableHead>
  );
}
