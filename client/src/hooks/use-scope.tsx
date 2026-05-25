import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type ScopeMode = "EMT-B" | "AEMT" | "Paramedic";

const STORAGE_KEY = "simtura_scope_mode";

interface ScopeContextValue {
  scope: ScopeMode | null;
  setScope: (s: ScopeMode) => void;
  clearScope: () => void;
}

const ScopeContext = createContext<ScopeContextValue>({
  scope: null,
  setScope: () => {},
  clearScope: () => {},
});

export function ScopeProvider({ children }: { children: ReactNode }) {
  const [scope, setScopeState] = useState<ScopeMode | null>(() => {
    // URL query param wins over localStorage so shareable links carry scope.
    try {
      const params = new URLSearchParams(window.location.search);
      const fromUrl = params.get("scope");
      if (fromUrl === "EMT-B" || fromUrl === "AEMT" || fromUrl === "Paramedic") {
        try { localStorage.setItem(STORAGE_KEY, fromUrl); } catch {}
        return fromUrl;
      }
    } catch {}
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "EMT-B" || stored === "AEMT" || stored === "Paramedic") return stored;
    } catch {}
    return null;
  });

  const setScope = (s: ScopeMode) => {
    setScopeState(s);
    try { localStorage.setItem(STORAGE_KEY, s); } catch {}
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("scope", s);
      window.history.replaceState({}, "", url);
    } catch {}
  };

  const clearScope = () => {
    setScopeState(null);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  };

  return (
    <ScopeContext.Provider value={{ scope, setScope, clearScope }}>
      {children}
    </ScopeContext.Provider>
  );
}

export function useScope() {
  return useContext(ScopeContext);
}
