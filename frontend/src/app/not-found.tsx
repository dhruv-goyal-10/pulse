import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-xl gradient-brand text-2xl font-semibold text-white shadow-lg">
          404
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2">
          <Button asChild>
            <Link href="/">Go to dashboard</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/customers">View customers</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
