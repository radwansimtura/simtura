import { createContext, useContext, ReactNode } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import type { PublicUser } from "@shared/schema";

interface AuthContextValue {
  user: PublicUser | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<PublicUser>;
  signUp: (email: string, password: string, name: string) => Promise<PublicUser>;
  signOut: () => Promise<void>;
  upgrade: () => Promise<PublicUser>;
  downgrade: () => Promise<PublicUser>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: user, isLoading } = useQuery<PublicUser | null>({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 1000 * 60 * 5,
  });

  const signInMutation = useMutation({
    mutationFn: async (vars: { email: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/signin", vars);
      return res.json() as Promise<PublicUser>;
    },
    onSuccess: (u) => {
      queryClient.setQueryData(["/api/auth/me"], u);
      queryClient.invalidateQueries({ queryKey: ["/api/me/stats"] });
    },
  });

  const signUpMutation = useMutation({
    mutationFn: async (vars: { email: string; password: string; name: string }) => {
      const res = await apiRequest("POST", "/api/auth/signup", vars);
      return res.json() as Promise<PublicUser>;
    },
    onSuccess: (u) => {
      queryClient.setQueryData(["/api/auth/me"], u);
      queryClient.invalidateQueries({ queryKey: ["/api/me/stats"] });
    },
  });

  const signOutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/signout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/me"], null);
      queryClient.removeQueries({ queryKey: ["/api/me/stats"] });
    },
  });

  const upgradeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/upgrade");
      return res.json() as Promise<PublicUser>;
    },
    onSuccess: (u) => {
      queryClient.setQueryData(["/api/auth/me"], u);
      queryClient.invalidateQueries({ queryKey: ["/api/me/stats"] });
    },
  });

  const downgradeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/downgrade");
      return res.json() as Promise<PublicUser>;
    },
    onSuccess: (u) => {
      queryClient.setQueryData(["/api/auth/me"], u);
      queryClient.invalidateQueries({ queryKey: ["/api/me/stats"] });
    },
  });

  const value: AuthContextValue = {
    user: user ?? null,
    isLoading,
    signIn: (email, password) => signInMutation.mutateAsync({ email, password }),
    signUp: (email, password, name) => signUpMutation.mutateAsync({ email, password, name }),
    signOut: () => signOutMutation.mutateAsync(),
    upgrade: () => upgradeMutation.mutateAsync(),
    downgrade: () => downgradeMutation.mutateAsync(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
