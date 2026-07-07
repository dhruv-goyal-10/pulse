"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Activity, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, setToken } from "@/lib/api";
import type { LoginResponse } from "@/types/api";

interface AuthConfigResponse {
  google_oauth_enabled: boolean;
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("demo@pulse.app");
  const [password, setPassword] = useState("demo123");
  const redirect = searchParams.get("redirect") || "/";

  const { data: config } = useQuery<AuthConfigResponse>({
    queryKey: ["auth-config"],
    queryFn: () => api<AuthConfigResponse>("/auth/config"),
    staleTime: Infinity,
  });
  const googleEnabled = config?.google_oauth_enabled ?? false;

  const mutation = useMutation({
    mutationFn: (body: { email: string; password: string }) =>
      api<LoginResponse>("/auth/login", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: (data) => {
      setToken(data.token.access_token);
      router.push(redirect);
    },
  });

  const apiBase = process.env.NEXT_PUBLIC_API_BASE || "";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg gradient-brand text-white shadow-sm">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-xl">Sign in to Pulse</CardTitle>
            <CardDescription>Internal analytics for the Pulse team</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Button
              variant="outline"
              className="w-full gap-2"
              disabled={!googleEnabled}
              aria-disabled={!googleEnabled}
              title={googleEnabled ? undefined : "Google OAuth is not configured on this instance"}
              onClick={() => {
                if (!googleEnabled) return;
                window.location.href = `${apiBase}/api/auth/google/login`;
              }}
            >
              <GoogleIcon />
              Sign in with Google
            </Button>
            {!googleEnabled && (
              <p className="text-center text-[11px] text-muted-foreground">
                Not configured on this demo — set <code className="rounded bg-muted px-1">GOOGLE_CLIENT_ID</code> in <code className="rounded bg-muted px-1">.env</code> to enable.
              </p>
            )}
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or continue with email</span>
            </div>
          </div>

          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate({ email, password });
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            {mutation.isError && (
              <p className="text-sm text-destructive">
                {mutation.error instanceof Error ? mutation.error.message : "Sign in failed"}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Sign in
            </Button>
          </form>
          <p className="text-center text-xs text-muted-foreground">
            Demo: <code className="rounded bg-muted px-1">demo@pulse.app</code> / <code className="rounded bg-muted px-1">demo123</code>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}
