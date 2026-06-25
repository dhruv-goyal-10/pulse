"use client";

import { useQuery } from "@tanstack/react-query";

import { api, getToken } from "@/lib/api";
import type { User } from "@/types/api";

export function useCurrentUser() {
  const hasToken = typeof window !== "undefined" && !!getToken();
  return useQuery<User>({
    queryKey: ["auth", "me"],
    queryFn: () => api<User>("/auth/me"),
    enabled: hasToken,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}
