import { useState } from "react";
import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Building2,
  Check,
  Copy,
  Download,
  KeyRound,
  Mail,
  Search,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import type {
  PublicOrganization,
  PublicOrganizationCode,
} from "@shared/schema";
import simturaLogo from "@assets/Screenshot_2025-08-13_at_9.54.52_AM_1776888878004.png";

function formatMoney(cents: number) {
  return `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export default function OrganizationDashboardPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const justPaid = typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("paid") === "1";

  const { data: org, isLoading: orgLoading, error: orgError } = useQuery<PublicOrganization>({
    queryKey: ["/api/organizations", id],
    queryFn: async () => {
      const res = await fetch(`/api/organizations/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error((await res.json()).message ?? "Failed to load");
      return res.json();
    },
    // After Stripe redirects back, poll until the webhook fulfills the org
    refetchInterval: (query) =>
      query.state.data?.status !== "active" ? 2000 : false,
  });

  const { data: codes, isLoading: codesLoading } = useQuery<PublicOrganizationCode[]>({
    queryKey: ["/api/organizations", id, "codes"],
    queryFn: async () => {
      const res = await fetch(`/api/organizations/${id}/codes`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load codes");
      return res.json();
    },
    enabled: org?.status === "active",
    refetchInterval: (query) =>
      org?.status === "active" && (query.state.data?.length ?? 0) === 0 ? 1500 : false,
  });

  const pendingPayment = org && org.status !== "active";

  const filtered = codes?.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.code.toLowerCase().includes(q) ||
      (c.redeemedByEmail ?? "").toLowerCase().includes(q)
    );
  });

  const copyCode = async (code: string, id: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  const copyAll = async () => {
    if (!codes) return;
    const txt = codes.map((c) => c.code).join("\n");
    await navigator.clipboard.writeText(txt);
    toast({ title: "All codes copied", description: `${codes.length} codes on your clipboard.` });
  };

  const downloadCsv = () => {
    if (!codes || !org) return;
    const rows = [
      ["code", "redeemed_by", "redeemed_at", "issued_at"].join(","),
      ...codes.map((c) =>
        [
          c.code,
          c.redeemedByEmail ?? "",
          c.redeemedAt ?? "",
          c.createdAt,
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(","),
      ),
    ].join("\n");
    const blob = new Blob([rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${org.name.replace(/\s+/g, "_")}-codes.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (orgError) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 gap-4">
        <Building2 className="h-10 w-10 text-white/30" />
        <h1 className="text-2xl font-semibold">Organization not found</h1>
        <p className="text-white/50 text-sm">{(orgError as Error).message}</p>
        <Link href="/organizations">
          <Button variant="outline" className="rounded-full border-white/20">
            Back to Organizations
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-black/40 border-b border-white/5">
        <div className="mx-auto max-w-7xl px-6 sm:px-10 h-20 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-3 cursor-pointer group">
              <ArrowLeft className="h-4 w-4 text-white/60 group-hover:text-white transition-colors" />
              <img src={simturaLogo} alt="Simtura" className="h-9" />
            </div>
          </Link>
          <div className="flex items-center gap-4">
            <Link href={`/org-dashboard/${id}`}>
              <Button size="sm" className="h-9 rounded-full bg-white text-black hover:bg-white/90 font-medium px-5 text-sm">
                Open Dashboard
              </Button>
            </Link>
            <Link href="/organizations" className="text-sm text-white/70 hover:text-white">
              New organization
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-32 pb-20 px-6 sm:px-10 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {pendingPayment ? (
            <div
              className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-amber-300 text-[11px] uppercase tracking-wider mb-5"
              data-testid="badge-status-pending"
            >
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              {justPaid ? "Confirming payment…" : "Awaiting payment"}
            </div>
          ) : (
            <div
              className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-emerald-300 text-[11px] uppercase tracking-wider mb-5"
              data-testid="badge-status-active"
            >
              <Check className="h-3 w-3" /> Active
            </div>
          )}
          {orgLoading ? (
            <Skeleton className="h-12 w-2/3 bg-white/5 mb-3" />
          ) : (
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-3" data-testid="text-org-name">
              {org?.name}
            </h1>
          )}
          {org && (
            <p className="text-white/50 text-sm">
              {org.orgType} · {org.contactName} ·{" "}
              <a href={`mailto:${org.contactEmail}`} className="underline">
                {org.contactEmail}
              </a>
            </p>
          )}
        </motion.div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-4 mt-10">
          <StatCard
            icon={<Users className="h-4 w-4" />}
            label="Seats"
            value={org?.seats ?? "—"}
            loading={orgLoading}
          />
          <StatCard
            icon={<KeyRound className="h-4 w-4" />}
            label="Redeemed"
            value={org ? `${org.redeemedCount} / ${org.seats}` : "—"}
            loading={orgLoading}
          />
          <StatCard
            icon={<Building2 className="h-4 w-4" />}
            label="Per seat / mo"
            value={org ? formatMoney(org.pricePerSeatCents) : "—"}
            loading={orgLoading}
          />
          <StatCard
            icon={<Building2 className="h-4 w-4" />}
            label="Total"
            value={org ? formatMoney(org.totalCents) : "—"}
            loading={orgLoading}
          />
        </div>

        {/* Helpful banner */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mt-8 rounded-2xl border border-white/15 bg-gradient-to-b from-blue-500/10 to-transparent p-6"
        >
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-300 shrink-0">
              <Mail className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-1">Send these codes to your students.</h3>
              <p className="text-sm text-white/60 leading-relaxed">
                Each student creates a free Simtura account, then enters their code on the
                profile page to unlock Pro for the full course duration.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadCsv}
              className="rounded-full border-white/20 bg-transparent text-white hover:bg-white/10 shrink-0"
              data-testid="button-download-csv"
            >
              <Download className="h-3.5 w-3.5 mr-2" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={copyAll}
              className="rounded-full border-white/20 bg-transparent text-white hover:bg-white/10 shrink-0"
              data-testid="button-copy-all"
            >
              <Copy className="h-3.5 w-3.5 mr-2" />
              Copy all
            </Button>
          </div>
        </motion.div>

        {/* Codes list */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mt-10"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <h2 className="text-xl font-semibold tracking-tight">Seat codes</h2>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <Input
                placeholder="Search codes or emails..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 bg-white/[0.04] border-white/10 text-white placeholder:text-white/30"
                data-testid="input-search-codes"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
            {codesLoading ? (
              <div className="p-6 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full bg-white/5" />
                ))}
              </div>
            ) : filtered && filtered.length > 0 ? (
              <ul className="divide-y divide-white/5">
                {filtered.map((c) => {
                  const redeemed = !!c.redeemedAt;
                  return (
                    <li
                      key={c.id}
                      className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02]"
                      data-testid={`row-code-${c.id}`}
                    >
                      <code className="font-mono text-sm tracking-wider text-white">
                        {c.code}
                      </code>
                      <div className="flex-1 text-xs text-white/50 truncate">
                        {redeemed ? (
                          <>
                            Redeemed by{" "}
                            <span className="text-white/80">{c.redeemedByEmail}</span>
                            {" · "}
                            {new Date(c.redeemedAt!).toLocaleDateString()}
                          </>
                        ) : (
                          <span className="text-white/30">Unclaimed</span>
                        )}
                      </div>
                      {redeemed ? (
                        <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-emerald-300">
                          <Check className="h-3 w-3" /> Active
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyCode(c.code, c.id)}
                          className="h-8 text-white/60 hover:text-white hover:bg-white/5"
                          data-testid={`button-copy-${c.id}`}
                        >
                          {copiedId === c.id ? (
                            <>
                              <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-300" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5 mr-1.5" />
                              Copy
                            </>
                          )}
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="p-10 text-center text-white/40 text-sm">No codes match.</div>
            )}
          </div>
        </motion.div>

        <p className="mt-8 text-center text-xs text-white/40">
          Bookmark this page — it's your private dashboard for{" "}
          <span className="text-white/70">{org?.name ?? "this organization"}</span>.
        </p>
      </main>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  loading?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center gap-2 text-white/50 text-[11px] uppercase tracking-[0.2em] mb-3">
        {icon}
        {label}
      </div>
      <div
        className="text-2xl font-bold tracking-tight tabular-nums"
        data-testid={`stat-${label.toLowerCase().replace(/\s/g, "-")}`}
      >
        {loading ? <span className="text-white/30">—</span> : value}
      </div>
    </div>
  );
}
