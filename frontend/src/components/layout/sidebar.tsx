"use client";

import { Activity, LayoutDashboard, Settings, TrendingUp, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/revenue", label: "Revenue", icon: TrendingUp },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r bg-card md:flex md:flex-col">
      <div className="flex h-16 items-center gap-3 border-b px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-brand text-white shadow-sm">
          <Activity className="h-4 w-4" />
        </div>
        <div>
          <div className="text-[15px] font-semibold leading-tight tracking-tight">Pulse</div>
          <div className="text-[11px] text-muted-foreground">Internal analytics</div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Dashboard
        </div>
        {nav.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                active
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-primary" />
              )}
              <item.icon className={cn("h-4 w-4 transition-colors", active ? "text-primary" : "")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
