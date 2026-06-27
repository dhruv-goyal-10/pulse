"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Sidebar } from "@/components/layout/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/use-auth";
import { getToken } from "@/lib/api";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: user, isLoading, isError } = useCurrentUser();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!getToken()) router.replace("/login");
  }, [router]);

  useEffect(() => {
    if (isError) router.replace("/login");
  }, [isError, router]);

  if (isLoading || !user) {
    return <DashboardShellSkeleton />;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col animate-in fade-in-0 duration-500">{children}</div>
    </div>
  );
}

function DashboardShellSkeleton() {
  return (
    <div className="flex min-h-screen bg-background animate-in fade-in-0 duration-300">
      {/* Sidebar skeleton */}
      <aside className="hidden w-60 shrink-0 border-r bg-card md:flex md:flex-col">
        <div className="flex h-16 items-center gap-3 border-b px-5">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-14" />
            <Skeleton className="h-2 w-24" />
          </div>
        </div>
        <div className="space-y-2 p-3">
          <Skeleton className="mb-3 h-2.5 w-16" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-lg" />
          ))}
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b px-4">
          <Skeleton className="h-4 w-40" />
          <div className="ml-auto flex items-center gap-2">
            <Skeleton className="h-9 w-9 rounded-md" />
            <Skeleton className="h-9 w-32 rounded-md" />
          </div>
        </header>
        <main className="flex-1 space-y-6 p-4 md:p-6">
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[130px] rounded-xl" />
            ))}
          </section>
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Skeleton className="h-[380px] rounded-xl lg:col-span-2" />
            <Skeleton className="h-[380px] rounded-xl" />
          </section>
          <Skeleton className="h-64 rounded-xl" />
        </main>
      </div>
    </div>
  );
}
