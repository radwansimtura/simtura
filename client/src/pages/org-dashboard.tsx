import { useState, useMemo, useEffect } from "react";
import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BarChart2,
  Bell,
  Building2,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  FileText,
  GraduationCap,
  KeyRound,
  LayoutDashboard,
  Mail,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Sparkles,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import type { PublicOrganization, PublicOrganizationCode } from "@shared/schema";
import simturaLogo from "@/assets/simtura-logo.png";

// ─── Types ──────────────────────────────────────────────────────────────────

type Section = "overview" | "cohorts" | "students" | "performance" | "reports" | "settings";

type Student = {
  id: string;
  name: string;
  cohort: string;
  scenariosCompleted: number;
  avgScore: number;
  lastActive: string;
  status: "active" | "at-risk" | "inactive" | "completed";
  history: { date: string; scenario: string; score: number }[];
};

type Cohort = {
  id: string;
  name: string;
  discipline: string;
  startDate: string;
  endDate: string;
  seats: number;
  enrolled: number;
  avgScore: number;
  completionRate: number;
  status: "Active" | "Completed" | "Upcoming";
};

// ─── Seeded mock data helpers ────────────────────────────────────────────────

function seededRand(seed: string, offset = 0) {
  let h = 0;
  for (let i = 0; i < seed.length + offset; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i % seed.length)) | 0;
  }
  return Math.abs(h % 1000) / 1000;
}

const FIRST_NAMES = ["Alex", "Jordan", "Casey", "Morgan", "Taylor", "Riley", "Avery", "Skyler", "Drew", "Dakota", "Jamie", "Quinn", "Reese", "Finley", "Logan", "Blake", "Emery", "Rowan", "Sage", "River"];
const LAST_INITIALS = ["R.", "M.", "T.", "S.", "L.", "K.", "B.", "H.", "C.", "P.", "W.", "D.", "G.", "N.", "F."];
const SCENARIOS = ["Chest Pain", "Airway Management", "Trauma Assessment", "Overdose Response", "Pediatric Fever", "Cardiac Arrest", "Stroke Recognition", "Obstetric Emergency", "Burn Management", "Diabetic Emergency"];

function generateStudents(orgId: string, count: number, codes: PublicOrganizationCode[]): Student[] {
  return Array.from({ length: Math.min(count, 20) }, (_, i) => {
    const r = (o: number) => seededRand(orgId, i * 13 + o);
    const score = Math.floor(r(1) * 38) + 62;
    const completed = Math.floor(r(2) * 12) + 1;
    const daysAgo = Math.floor(r(3) * 10);
    const lastActive = daysAgo === 0 ? "Today" : daysAgo === 1 ? "Yesterday" : `${daysAgo} days ago`;
    const status: Student["status"] =
      daysAgo > 5 && score < 70 ? "at-risk"
      : daysAgo > 7 ? "inactive"
      : completed >= 10 ? "completed"
      : "active";
    const cohortIdx = Math.floor(r(4) * 2);
    return {
      id: `s-${i}`,
      name: `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_INITIALS[i % LAST_INITIALS.length]}`,
      cohort: cohortIdx === 0 ? "Spring Cohort 2026" : "Fall Cohort 2025",
      scenariosCompleted: completed,
      avgScore: score,
      lastActive,
      status,
      history: Array.from({ length: completed }, (_, j) => ({
        date: new Date(Date.now() - (completed - j) * 2 * 86400000).toLocaleDateString(),
        scenario: SCENARIOS[(i + j) % SCENARIOS.length],
        score: Math.floor(seededRand(orgId, i * 7 + j) * 35) + 65,
      })),
    };
  });
}

function generateCohorts(orgId: string): Cohort[] {
  return [
    {
      id: "c1", name: "Spring Cohort 2026", discipline: "EMS",
      startDate: "Jan 15, 2026", endDate: "May 30, 2026",
      seats: 18, enrolled: 16, avgScore: 78, completionRate: 62, status: "Active",
    },
    {
      id: "c2", name: "Fall Cohort 2025", discipline: "Nursing",
      startDate: "Aug 20, 2025", endDate: "Dec 15, 2025",
      seats: 22, enrolled: 22, avgScore: 84, completionRate: 100, status: "Completed",
    },
    {
      id: "c3", name: "Summer 2026", discipline: "EMS",
      startDate: "Jun 10, 2026", endDate: "Aug 28, 2026",
      seats: 14, enrolled: 0, avgScore: 0, completionRate: 0, status: "Upcoming",
    },
  ];
}

function generateActivityFeed(orgId: string) {
  const actions = [
    { name: "Alex R.", action: "completed", scenario: "Chest Pain", score: 94, time: "2 min ago" },
    { name: "Jordan M.", action: "started", scenario: "Airway Management", score: null, time: "8 min ago" },
    { name: "Casey T.", action: "completed", scenario: "Overdose Response", score: 81, time: "24 min ago" },
    { name: "Morgan S.", action: "completed", scenario: "Trauma Assessment", score: 73, time: "1 hr ago" },
    { name: "Taylor L.", action: "started", scenario: "Cardiac Arrest", score: null, time: "1 hr ago" },
    { name: "Riley K.", action: "completed", scenario: "Stroke Recognition", score: 88, time: "2 hrs ago" },
    { name: "Avery B.", action: "completed", scenario: "Pediatric Fever", score: 65, time: "3 hrs ago" },
    { name: "Skyler H.", action: "completed", scenario: "Diabetic Emergency", score: 92, time: "5 hrs ago" },
  ];
  return actions;
}

function generatePerformanceTrend() {
  const weeks = ["Wk 1", "Wk 2", "Wk 3", "Wk 4", "Wk 5", "Wk 6", "Wk 7", "Wk 8"];
  return weeks.map((wk, i) => ({
    week: wk,
    classAvg: Math.floor(68 + i * 2.2 + (i % 2) * 1.5),
    topQuartile: Math.floor(82 + i * 1.5),
    bottomQuartile: Math.floor(55 + i * 2.5),
  }));
}

function generateScenarioBreakdown() {
  return [
    { name: "Airway Management", attempts: 48, avgScore: 61, passRate: 54, hardestStep: "BVM ventilation rate" },
    { name: "Cardiac Arrest", attempts: 44, avgScore: 72, passRate: 68, hardestStep: "CPR compression depth" },
    { name: "Chest Pain", attempts: 52, avgScore: 81, passRate: 83, hardestStep: "12-lead interpretation" },
    { name: "Overdose Response", attempts: 38, avgScore: 85, passRate: 89, hardestStep: "Combative patient mgmt" },
    { name: "Trauma Assessment", attempts: 35, avgScore: 74, passRate: 71, hardestStep: "Hemorrhage control" },
    { name: "Stroke Recognition", attempts: 29, avgScore: 79, passRate: 79, hardestStep: "Cincinnati stroke scale" },
    { name: "Pediatric Fever", attempts: 22, avgScore: 68, passRate: 63, hardestStep: "Weight-based dosing" },
    { name: "OB Emergency", attempts: 18, avgScore: 77, passRate: 74, hardestStep: "Crowning management" },
  ];
}

// ─── Nav ─────────────────────────────────────────────────────────────────────

const NAV = [
  { id: "overview" as Section, label: "Overview", icon: LayoutDashboard },
  { id: "cohorts" as Section, label: "Cohorts", icon: Users },
  { id: "students" as Section, label: "Students", icon: GraduationCap },
  { id: "performance" as Section, label: "Performance", icon: BarChart2 },
  { id: "reports" as Section, label: "Reports", icon: FileText },
  { id: "settings" as Section, label: "Settings", icon: Settings },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OrgDashboardPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [section, setSection] = useState<Section>("overview");
  const [dateRange, setDateRange] = useState("This Course");

  // Show welcome toast after successful Stripe payment
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("paid") === "1") {
      toast({
        title: "Payment successful!",
        description: "Your organization is active. Share the access codes with your students.",
      });
      // Clean the URL so the toast doesn't re-fire on refresh
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const { data: org, isLoading: orgLoading } = useQuery<PublicOrganization>({
    queryKey: ["/api/organizations", id],
    queryFn: async () => {
      const res = await fetch(`/api/organizations/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  const { data: codes = [] } = useQuery<PublicOrganizationCode[]>({
    queryKey: ["/api/organizations", id, "codes"],
    queryFn: async () => {
      const res = await fetch(`/api/organizations/${id}/codes`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: org?.status === "active",
  });

  const { data: rawStudents = [] } = useQuery<{ id: string; name: string; email: string; redeemedAt: string; cohortId: string | null }[]>({
    queryKey: ["/api/organizations", id, "students"],
    queryFn: async () => {
      const res = await fetch(`/api/organizations/${id}/students`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: org?.status === "active",
  });

  const { data: rawAttempts = [] } = useQuery<{ id: string; userId: string; scenarioTitle: string; score: number | null; completedAt: string | null; startedAt: string }[]>({
    queryKey: ["/api/organizations", id, "performance"],
    queryFn: async () => {
      const res = await fetch(`/api/organizations/${id}/performance`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: org?.status === "active",
  });

  const redeemedCount = rawStudents.length;

  // Build real student objects from API data, fall back to mock if no real students yet
  const students = useMemo<Student[]>(() => {
    if (rawStudents.length === 0) return generateStudents(id ?? "x", 16, codes);
    return rawStudents.map((s) => {
      const userAttempts = rawAttempts.filter(a => a.userId === s.id && a.completedAt);
      const scores = userAttempts.map(a => a.score ?? 0).filter(sc => sc > 0);
      const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
      const lastAttempt = userAttempts[0];
      const lastActiveMs = lastAttempt ? Date.now() - new Date(lastAttempt.startedAt).getTime() : Infinity;
      const daysAgo = Math.floor(lastActiveMs / 86400000);
      const lastActive = daysAgo === 0 ? "Today" : daysAgo === 1 ? "Yesterday" : lastAttempt ? `${daysAgo} days ago` : "Never";
      const status: Student["status"] =
        !lastAttempt ? "inactive"
        : daysAgo > 5 && avgScore < 70 ? "at-risk"
        : daysAgo > 7 ? "inactive"
        : userAttempts.length >= 10 ? "completed"
        : "active";
      return {
        id: s.id,
        name: s.name || s.email.split("@")[0],
        cohort: "Spring Cohort 2026",
        scenariosCompleted: userAttempts.length,
        avgScore,
        lastActive,
        status,
        history: userAttempts.slice(0, 15).map(a => ({
          date: new Date(a.startedAt).toLocaleDateString(),
          scenario: a.scenarioTitle,
          score: a.score ?? 0,
        })),
      };
    });
  }, [rawStudents, rawAttempts, id, codes]);

  const { data: realCohorts = [], refetch: refetchCohorts } = useQuery<{ id: string; name: string; discipline: string; startDate: string; endDate: string; createdAt: string }[]>({
    queryKey: ["/api/organizations", id, "cohorts"],
    queryFn: async () => {
      const res = await fetch(`/api/organizations/${id}/cohorts`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: org?.status === "active",
  });

  const cohorts: Cohort[] = realCohorts.length > 0
    ? realCohorts.map(c => {
        const now = Date.now();
        const start = new Date(c.startDate).getTime();
        const end = new Date(c.endDate).getTime();
        const status: Cohort["status"] = now < start ? "Upcoming" : now > end ? "Completed" : "Active";
        const orgStudents = rawStudents.filter(s => s.cohortId === c.id);
        return {
          id: c.id,
          name: c.name,
          discipline: c.discipline,
          startDate: new Date(c.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          endDate: new Date(c.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          seats: org?.seats ?? 0,
          enrolled: orgStudents.length,
          avgScore: orgStudents.length > 0 ? Math.round(orgStudents.reduce((sum, s) => {
            const st = students.find(st => st.id === s.id);
            return sum + (st?.avgScore ?? 0);
          }, 0) / orgStudents.length) : 0,
          completionRate: orgStudents.length > 0 ? Math.round(orgStudents.filter(s => students.find(st => st.id === s.id)?.status === "completed").length / orgStudents.length * 100) : 0,
          status,
        };
      })
    : generateCohorts(id ?? "x");
  const tier = org ? (
    org.seats >= 100 ? "Institution" : org.seats >= 25 ? "Department" : "Single Cohort"
  ) : "—";

  return (
    <div className="flex min-h-screen bg-[#0a0a0a] text-white">
      {/* ── Sidebar ── */}
      <aside className="fixed left-0 top-0 h-screen w-60 bg-[#0d0d0d] border-r border-white/8 flex flex-col z-40">
        <div className="px-5 py-5 border-b border-white/8">
          <Link href="/">
            <img src={simturaLogo} alt="Simtura" className="h-7 opacity-80 cursor-pointer" />
          </Link>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
          {NAV.map(({ id: navId, label, icon: Icon }) => {
            const active = section === navId;
            return (
              <button
                key={navId}
                onClick={() => setSection(navId)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${
                  active
                    ? "bg-white/10 text-white font-medium"
                    : "text-white/50 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${active ? "text-white" : "text-white/40"}`} />
                {label}
                {active && <ChevronRight className="ml-auto h-3.5 w-3.5 text-white/30" />}
              </button>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-white/8">
          {orgLoading ? (
            <Skeleton className="h-12 w-full bg-white/5" />
          ) : (
            <div className="rounded-lg bg-white/[0.04] p-3">
              <p className="text-xs text-white font-medium truncate">{org?.name ?? "—"}</p>
              <p className="text-[11px] text-white/40 mt-0.5">{tier} tier</p>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="ml-60 flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-14 bg-[#0a0a0a]/90 backdrop-blur border-b border-white/8 flex items-center justify-between px-6">
          <h1 className="text-sm font-semibold text-white capitalize">{section}</h1>
          <div className="flex items-center gap-3">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="h-8 w-36 text-xs bg-white/[0.04] border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="This Week">This Week</SelectItem>
                <SelectItem value="This Month">This Month</SelectItem>
                <SelectItem value="This Course">This Course</SelectItem>
                <SelectItem value="All Time">All Time</SelectItem>
              </SelectContent>
            </Select>
            <button className="relative h-8 w-8 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors">
              <Bell className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[9px] font-bold flex items-center justify-center">3</span>
            </button>
            <div className="flex items-center gap-2 pl-3 border-l border-white/10">
              <div className="h-7 w-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-medium text-white">
                {user?.name?.[0] ?? "A"}
              </div>
              <span className="text-xs text-white/70">{user?.name?.split(" ")[0] ?? "Admin"}</span>
              <ChevronDown className="h-3.5 w-3.5 text-white/30" />
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={section}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {section === "overview" && (
                <OverviewSection org={org} students={students} orgLoading={orgLoading} redeemedCount={redeemedCount} codes={codes} orgId={id ?? ""} rawAttempts={rawAttempts} />
              )}
              {section === "cohorts" && <CohortsSection cohorts={cohorts} orgId={id ?? ""} onCreated={refetchCohorts} />}
              {section === "students" && <StudentsSection students={students} />}
              {section === "performance" && <PerformanceSection orgId={id ?? ""} />}
              {section === "reports" && <ReportsSection org={org} />}
              {section === "settings" && <SettingsSection org={org} tier={tier} codes={codes} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

// ─── Overview ─────────────────────────────────────────────────────────────────

function OverviewSection({ org, students, orgLoading, redeemedCount, codes, orgId, rawAttempts }: {
  org?: PublicOrganization;
  students: Student[];
  orgLoading: boolean;
  redeemedCount: number;
  codes: PublicOrganizationCode[];
  orgId: string;
  rawAttempts: { id: string; userId: string; scenarioTitle: string; score: number | null; completedAt: string | null; startedAt: string }[];
}) {
  const avgScore = Math.round(students.reduce((s, st) => s + st.avgScore, 0) / Math.max(students.length, 1));
  const totalScenarios = students.reduce((s, st) => s + st.scenariosCompleted, 0);
  const onTrack = students.filter((s) => s.status === "active" || s.status === "completed").length;
  const onTrackPct = Math.round((onTrack / Math.max(students.length, 1)) * 100);

  const barData = students.slice(0, 12).map((s) => ({
    name: s.name.split(" ")[0],
    completed: s.scenariosCompleted,
    color: s.status === "at-risk" ? "#ef4444" : s.status === "inactive" ? "#eab308" : "#10b981",
  }));

  const donutData = [
    { name: "Excellent (90-100%)", value: students.filter(s => s.avgScore >= 90).length, color: "#10b981" },
    { name: "Proficient (75-89%)", value: students.filter(s => s.avgScore >= 75 && s.avgScore < 90).length, color: "#3b82f6" },
    { name: "Developing (60-74%)", value: students.filter(s => s.avgScore >= 60 && s.avgScore < 75).length, color: "#f59e0b" },
    { name: "Needs Support (<60%)", value: students.filter(s => s.avgScore < 60).length, color: "#ef4444" },
  ].filter(d => d.value > 0);

  const atRisk = students.filter(s => s.status === "at-risk" || s.status === "inactive");
  const activity = rawAttempts.length > 0
    ? rawAttempts.slice(0, 8).map(a => {
        const student = students.find(s => s.id === a.userId);
        const name = student?.name ?? "A student";
        const msAgo = Date.now() - new Date(a.startedAt).getTime();
        const minsAgo = Math.floor(msAgo / 60000);
        const time = minsAgo < 60 ? `${minsAgo}m ago` : minsAgo < 1440 ? `${Math.floor(minsAgo / 60)}h ago` : `${Math.floor(minsAgo / 1440)}d ago`;
        return { name, action: a.completedAt ? "completed" : "started", scenario: a.scenarioTitle, score: a.score, time };
      })
    : generateActivityFeed(orgId);

  const courseEnd = org?.createdAt
    ? new Date(new Date(org.createdAt).getTime() + (org.courseMonths ?? 4) * 30 * 86400000)
    : null;
  const daysLeft = courseEnd ? Math.max(0, Math.round((courseEnd.getTime() - Date.now()) / 86400000)) : null;

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Students" value={redeemedCount || students.length} delta="+3 vs last cohort" loading={orgLoading} color="emerald" />
        <StatCard label="Avg Scenario Score" value={`${avgScore}%`} delta="↑ 4pts this month" loading={false} color="blue" />
        <StatCard label="Scenarios Completed" value={totalScenarios} delta={`${totalScenarios} total this cycle`} loading={false} color="violet" />
        <StatCard label="On Track" value={`${onTrackPct}%`} delta={`${onTrack} of ${students.length} students`} loading={false} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left col */}
        <div className="lg:col-span-2 space-y-6">
          {/* Bar chart */}
          <DashCard title="Student Progress" subtitle="Scenarios completed per student this cycle">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "rgba(255,255,255,0.8)" }}
                  itemStyle={{ color: "rgba(255,255,255,0.6)" }}
                />
                <Bar dataKey="completed" radius={[4, 4, 0, 0]}>
                  {barData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-2 text-[11px] text-white/40">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" />On track</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-yellow-500" />Behind</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" />At risk</span>
            </div>
          </DashCard>

          {/* Activity feed */}
          <DashCard title="Recent Activity" subtitle="Live student actions">
            <div className="space-y-0 divide-y divide-white/5">
              {activity.map((a, i) => (
                <div key={i} className="flex items-center gap-3 py-2.5">
                  <div className="h-7 w-7 rounded-full bg-white/8 flex items-center justify-center text-[11px] font-medium text-white/80 shrink-0">
                    {a.name[0]}
                  </div>
                  <div className="flex-1 text-sm">
                    <span className="text-white/90 font-medium">{a.name}</span>
                    <span className="text-white/50"> {a.action} </span>
                    <span className="text-white/70">{a.scenario}</span>
                    {a.score && (
                      <span className={`ml-1.5 text-xs font-semibold ${a.score >= 80 ? "text-emerald-400" : a.score >= 65 ? "text-amber-400" : "text-red-400"}`}>
                        {a.score}%
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-white/30 shrink-0">{a.time}</span>
                </div>
              ))}
            </div>
          </DashCard>
        </div>

        {/* Right col */}
        <div className="space-y-6">
          {/* Donut */}
          <DashCard title="Score Distribution" subtitle="All students this cycle">
            <div className="flex justify-center my-2">
              <PieChart width={160} height={160}>
                <Pie data={donutData} cx={75} cy={75} innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                  {donutData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }}
                />
              </PieChart>
            </div>
            <div className="space-y-2 mt-1">
              {donutData.map((d) => (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-white/60">
                    <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                    {d.name.split(" ")[0]}
                  </span>
                  <span className="text-white/80 font-medium">{d.value}</span>
                </div>
              ))}
            </div>
          </DashCard>

          {/* At-risk */}
          <DashCard title="At-Risk Students" subtitle="No login 5+ days or score <65%">
            {atRisk.length === 0 ? (
              <div className="py-6 text-center">
                <Check className="h-7 w-7 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm text-white/50">All students on track</p>
              </div>
            ) : (
              <div className="space-y-3">
                {atRisk.slice(0, 4).map((s) => (
                  <div key={s.id} className="flex items-center gap-3">
                    <div className="h-7 w-7 rounded-full bg-red-500/15 flex items-center justify-center text-[11px] font-medium text-red-300 shrink-0">
                      {s.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white/90 truncate">{s.name}</p>
                      <p className="text-[11px] text-white/40">{s.lastActive} · {s.avgScore}% avg</p>
                    </div>
                    <button className="h-7 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] text-white/60 hover:text-white transition-colors border border-white/10 shrink-0">
                      Remind
                    </button>
                  </div>
                ))}
              </div>
            )}
          </DashCard>

          {/* Milestones */}
          <DashCard title="Upcoming Milestones" subtitle="">
            <div className="space-y-3">
              {daysLeft !== null && (
                <MilestoneRow
                  label="Course ends"
                  value={daysLeft > 0 ? `${daysLeft} days left` : "Ended"}
                  color={daysLeft < 14 ? "red" : daysLeft < 30 ? "amber" : "emerald"}
                />
              )}
              <MilestoneRow label="Summer 2026 cohort" value="Starts Jun 10" color="blue" />
              <MilestoneRow label="Seats unredeemed" value={`${(org?.seats ?? 0) - redeemedCount} remaining`} color="violet" />
            </div>
          </DashCard>
        </div>
      </div>
    </div>
  );
}

// ─── Cohorts ──────────────────────────────────────────────────────────────────

function CohortsSection({ cohorts, orgId, onCreated }: { cohorts: Cohort[]; orgId: string; onCreated: () => void }) {
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", discipline: "EMS", startDate: "", endDate: "", seats: "20" });

  const handleCreate = async () => {
    if (!form.name || !form.startDate || !form.endDate) {
      toast({ title: "Missing fields", description: "Name, start date, and end date are required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/organizations/${orgId}/cohorts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: form.name, discipline: form.discipline, startDate: form.startDate, endDate: form.endDate, seatCount: Number(form.seats) }),
      });
      if (!res.ok) throw new Error((await res.json()).message ?? "Failed");
      toast({ title: "Cohort created", description: `${form.name} is ready.` });
      setShowCreate(false);
      setForm({ name: "", discipline: "EMS", startDate: "", endDate: "", seats: "20" });
      onCreated();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const statusColors: Record<string, string> = {
    Active: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    Completed: "border-white/15 bg-white/5 text-white/50",
    Upcoming: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Cohorts</h2>
          <p className="text-sm text-white/50 mt-0.5">{cohorts.length} cohorts total</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="h-9 rounded-full bg-white text-black hover:bg-white/90 font-medium px-5 text-sm">
          <Plus className="mr-1.5 h-3.5 w-3.5" /> New Cohort
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cohorts.map((c) => (
          <div key={c.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-5 hover:border-white/20 transition-colors cursor-pointer">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="font-semibold text-white">{c.name}</p>
                <p className="text-xs text-white/40 mt-0.5">{c.discipline} · {c.startDate} – {c.endDate}</p>
              </div>
              <span className={`text-[10px] uppercase tracking-wider border rounded-full px-2 py-0.5 ${statusColors[c.status]}`}>{c.status}</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-[11px] text-white/40">Students</p>
                <p className="text-lg font-bold mt-0.5">{c.enrolled}<span className="text-xs text-white/30">/{c.seats}</span></p>
              </div>
              <div>
                <p className="text-[11px] text-white/40">Avg Score</p>
                <p className={`text-lg font-bold mt-0.5 ${c.avgScore >= 80 ? "text-emerald-400" : c.avgScore >= 70 ? "text-amber-400" : c.avgScore === 0 ? "text-white/30" : "text-red-400"}`}>
                  {c.avgScore > 0 ? `${c.avgScore}%` : "—"}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-white/40">Complete</p>
                <p className="text-lg font-bold mt-0.5">{c.completionRate}%</p>
              </div>
            </div>
            {c.status !== "Upcoming" && (
              <div className="mt-4 bg-white/5 rounded-full h-1.5 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${c.completionRate}%` }} />
              </div>
            )}
          </div>
        ))}

        {/* Empty / add new card */}
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-xl border border-dashed border-white/15 bg-transparent p-5 flex flex-col items-center justify-center gap-2 hover:border-white/30 hover:bg-white/[0.02] transition-colors min-h-[160px]"
        >
          <Plus className="h-6 w-6 text-white/30" />
          <span className="text-sm text-white/40">Create cohort</span>
        </button>
      </div>

      {/* Create modal */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-[#111] border-white/15 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">New Cohort</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-xs text-white/60 uppercase tracking-wider mb-1.5 block">Cohort name</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Spring 2026 EMS" className="bg-white/[0.04] border-white/10 text-white" />
            </div>
            <div>
              <Label className="text-xs text-white/60 uppercase tracking-wider mb-1.5 block">Discipline</Label>
              <Select value={form.discipline} onValueChange={v => setForm({ ...form, discipline: v })}>
                <SelectTrigger className="bg-white/[0.04] border-white/10 text-white"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="EMS">EMS</SelectItem><SelectItem value="Nursing">Nursing</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-white/60 uppercase tracking-wider mb-1.5 block">Start date</Label>
                <Input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} className="bg-white/[0.04] border-white/10 text-white" />
              </div>
              <div>
                <Label className="text-xs text-white/60 uppercase tracking-wider mb-1.5 block">End date</Label>
                <Input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} className="bg-white/[0.04] border-white/10 text-white" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-white/60 uppercase tracking-wider mb-1.5 block">Seat count</Label>
              <Input type="number" value={form.seats} onChange={e => setForm({ ...form, seats: e.target.value })} className="bg-white/[0.04] border-white/10 text-white" />
            </div>
            <Button className="w-full h-10 rounded-full bg-white text-black hover:bg-white/90 font-medium" onClick={handleCreate} disabled={saving}>
              <Sparkles className="mr-2 h-3.5 w-3.5" /> {saving ? "Creating…" : "Create & Assign Codes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Students ─────────────────────────────────────────────────────────────────

function StudentsSection({ students }: { students: Student[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Student | null>(null);

  const filtered = students.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.cohort.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || s.status === filter;
    return matchSearch && matchFilter;
  });

  const statusBadge = (status: Student["status"]) => {
    const map = {
      active: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
      "at-risk": "text-amber-300 bg-amber-500/10 border-amber-500/30",
      inactive: "text-red-300 bg-red-500/10 border-red-500/30",
      completed: "text-white/50 bg-white/5 border-white/15",
    };
    return map[status];
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Students</h2>
          <p className="text-sm text-white/50 mt-0.5">{students.length} total</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
            <Input
              placeholder="Search students..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 w-52 bg-white/[0.04] border-white/10 text-white text-sm placeholder:text-white/30"
            />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="h-8 w-32 bg-white/[0.04] border-white/10 text-white text-xs"><SelectValue placeholder="Filter" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="at-risk">At Risk</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-8 border-white/15 text-white/70 hover:text-white hover:bg-white/5 text-xs">
            <Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/8 bg-white/[0.02]">
              {["Name", "Cohort", "Completed", "Avg Score", "Last Active", "Status", ""].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] uppercase tracking-wider text-white/40 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map((s) => (
              <tr
                key={s.id}
                onClick={() => setSelected(s)}
                className="hover:bg-white/[0.02] cursor-pointer transition-colors"
              >
                <td className="px-4 py-3 font-medium text-white/90">{s.name}</td>
                <td className="px-4 py-3 text-white/50 text-xs">{s.cohort}</td>
                <td className="px-4 py-3 text-white/80">{s.scenariosCompleted}</td>
                <td className="px-4 py-3">
                  <span className={`font-semibold ${s.avgScore >= 80 ? "text-emerald-400" : s.avgScore >= 65 ? "text-amber-400" : "text-red-400"}`}>
                    {s.avgScore}%
                  </span>
                </td>
                <td className="px-4 py-3 text-white/50 text-xs">{s.lastActive}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center border rounded-full text-[10px] uppercase tracking-wider px-2 py-0.5 ${statusBadge(s.status)}`}>
                    {s.status.replace("-", " ")}
                  </span>
                </td>
                <td className="px-4 py-3 text-white/30">
                  <ChevronRight className="h-3.5 w-3.5" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-white/30 text-sm">No students match your search.</div>
        )}
      </div>

      {/* Student detail drawer */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setSelected(null)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 h-screen w-full max-w-md bg-[#111] border-l border-white/10 z-50 overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-semibold">{selected.name}</h2>
                    <p className="text-xs text-white/40 mt-0.5">{selected.cohort}</p>
                  </div>
                  <button onClick={() => setSelected(null)} className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center text-white/50 hover:text-white">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="rounded-lg bg-white/[0.04] p-3 text-center">
                    <p className="text-[11px] text-white/40 mb-1">Avg Score</p>
                    <p className={`text-xl font-bold ${selected.avgScore >= 80 ? "text-emerald-400" : selected.avgScore >= 65 ? "text-amber-400" : "text-red-400"}`}>{selected.avgScore}%</p>
                  </div>
                  <div className="rounded-lg bg-white/[0.04] p-3 text-center">
                    <p className="text-[11px] text-white/40 mb-1">Completed</p>
                    <p className="text-xl font-bold">{selected.scenariosCompleted}</p>
                  </div>
                  <div className="rounded-lg bg-white/[0.04] p-3 text-center">
                    <p className="text-[11px] text-white/40 mb-1">Last Active</p>
                    <p className="text-sm font-medium text-white/70">{selected.lastActive}</p>
                  </div>
                </div>

                {/* Score trend mini chart */}
                <div className="mb-6">
                  <p className="text-xs text-white/50 uppercase tracking-wider mb-3">Score Trend</p>
                  <ResponsiveContainer width="100%" height={100}>
                    <LineChart data={selected.history}>
                      <Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={2} dot={false} />
                      <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, fontSize: 11 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* NREMT readiness */}
                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 mb-5">
                  <p className="text-xs text-white/50 uppercase tracking-wider mb-2">NREMT Readiness Estimate</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-white/5 rounded-full h-2">
                      <div
                        className={`h-full rounded-full ${selected.avgScore >= 80 ? "bg-emerald-500" : selected.avgScore >= 70 ? "bg-amber-500" : "bg-red-500"}`}
                        style={{ width: `${Math.min(selected.avgScore, 100)}%` }}
                      />
                    </div>
                    <span className={`text-sm font-bold ${selected.avgScore >= 80 ? "text-emerald-400" : selected.avgScore >= 70 ? "text-amber-400" : "text-red-400"}`}>
                      {selected.avgScore >= 80 ? "Ready" : selected.avgScore >= 70 ? "Near Ready" : "Developing"}
                    </span>
                  </div>
                </div>

                {/* Scenario history */}
                <p className="text-xs text-white/50 uppercase tracking-wider mb-3">Scenario History</p>
                <div className="space-y-2">
                  {selected.history.map((h, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-white/5">
                      <div>
                        <p className="text-sm text-white/80">{h.scenario}</p>
                        <p className="text-[11px] text-white/30">{h.date}</p>
                      </div>
                      <span className={`text-sm font-semibold ${h.score >= 80 ? "text-emerald-400" : h.score >= 65 ? "text-amber-400" : "text-red-400"}`}>
                        {h.score}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Performance ──────────────────────────────────────────────────────────────

function PerformanceSection({ orgId }: { orgId: string }) {
  const trend = useMemo(() => generatePerformanceTrend(), []);
  const scenarios = useMemo(() => generateScenarioBreakdown(), []);

  const weakest = [...scenarios].sort((a, b) => a.avgScore - b.avgScore).slice(0, 3);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Performance</h2>

      {/* Trend chart */}
      <DashCard title="Class Score Over Time" subtitle="Weekly average — all students">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={trend} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="week" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis domain={[40, 100]} tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }} />
            <Line type="monotone" dataKey="classAvg" name="Class avg" stroke="#10b981" strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="topQuartile" name="Top 25%" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
            <Line type="monotone" dataKey="bottomQuartile" name="Bottom 25%" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </DashCard>

      {/* Weakest areas */}
      <DashCard title="Weakest Areas" subtitle="Scenarios where the cohort is scoring lowest">
        <div className="space-y-3 mt-1">
          {weakest.map((s) => (
            <div key={s.name} className="rounded-lg bg-white/[0.03] border border-white/8 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-white/90">{s.name}</p>
                <span className="text-sm font-bold text-amber-400">{s.avgScore}% avg</span>
              </div>
              <div className="bg-white/5 rounded-full h-1.5 mb-2">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${s.avgScore}%` }} />
              </div>
              <p className="text-[11px] text-white/40">
                <AlertTriangle className="h-3 w-3 inline mr-1 text-amber-400" />
                Consider reviewing — cohort avg is {s.avgScore}%. Hardest step: <span className="text-white/60">{s.hardestStep}</span>
              </p>
            </div>
          ))}
        </div>
      </DashCard>

      {/* Scenario breakdown table */}
      <DashCard title="Scenario Breakdown" subtitle="All attempts this cycle">
        <div className="overflow-x-auto mt-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8">
                {["Scenario", "Attempts", "Avg Score", "Pass Rate", "Hardest Step"].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-[11px] uppercase tracking-wider text-white/40 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {scenarios.map((s) => (
                <tr key={s.name} className="hover:bg-white/[0.02]">
                  <td className="py-3 px-3 text-white/80 font-medium">{s.name}</td>
                  <td className="py-3 px-3 text-white/60">{s.attempts}</td>
                  <td className="py-3 px-3">
                    <span className={`font-semibold ${s.avgScore >= 80 ? "text-emerald-400" : s.avgScore >= 70 ? "text-amber-400" : "text-red-400"}`}>
                      {s.avgScore}%
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className={`font-semibold ${s.passRate >= 80 ? "text-emerald-400" : s.passRate >= 65 ? "text-amber-400" : "text-red-400"}`}>
                      {s.passRate}%
                    </span>
                  </td>
                  <td className="py-3 px-3 text-white/40 text-xs">{s.hardestStep}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DashCard>
    </div>
  );
}

// ─── Reports ──────────────────────────────────────────────────────────────────

const REPORTS = [
  { title: "Cohort Summary Report", desc: "Overall performance snapshot for the current cohort cycle.", icon: BarChart2 },
  { title: "Individual Student Report", desc: "Per-student breakdown suitable for advisors or program coordinators.", icon: GraduationCap },
  { title: "NREMT/NCLEX Readiness Report", desc: "Readiness estimates per student based on score trajectory.", icon: TrendingUp },
  { title: "Engagement Report", desc: "Login frequency, time on platform, and scenario attempt patterns.", icon: Calendar },
];

function ReportsSection({ org }: { org?: PublicOrganization }) {
  const { toast } = useToast();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Reports</h2>
        <p className="text-sm text-white/50 mt-0.5">Generate and download pre-built reports for your organization.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {REPORTS.map((r) => (
          <div key={r.title} className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="h-9 w-9 rounded-lg bg-white/8 flex items-center justify-center text-white/60 shrink-0">
                <r.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium text-white/90 text-sm">{r.title}</p>
                <p className="text-xs text-white/40 mt-0.5 leading-relaxed">{r.desc}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs border-white/15 text-white/60 hover:text-white hover:bg-white/5"
                onClick={() => toast({ title: "Generating report…", description: "Your PDF will download shortly." })}
              >
                <Download className="mr-1.5 h-3 w-3" /> PDF
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs border-white/15 text-white/60 hover:text-white hover:bg-white/5"
                onClick={() => toast({ title: "Generating CSV…", description: "Your CSV will download shortly." })}
              >
                <Download className="mr-1.5 h-3 w-3" /> CSV
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex items-center gap-3 mb-3">
          <Mail className="h-4 w-4 text-white/50" />
          <p className="text-sm font-medium text-white/80">Schedule recurring reports</p>
        </div>
        <p className="text-xs text-white/40 mb-4">Get the Cohort Summary delivered to your inbox automatically.</p>
        <div className="flex items-center gap-3">
          <Select>
            <SelectTrigger className="h-8 w-36 bg-white/[0.04] border-white/10 text-white text-xs"><SelectValue placeholder="Frequency" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="biweekly">Bi-weekly</SelectItem>
              <SelectItem value="end-of-course">End of course</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" className="h-8 rounded-full bg-white text-black hover:bg-white/90 font-medium text-xs px-4" onClick={() => toast({ title: "Schedule saved", description: "You'll receive reports on the selected cadence." })}>
            Save schedule
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Settings ─────────────────────────────────────────────────────────────────

function SettingsSection({ org, tier, codes }: { org?: PublicOrganization; tier: string; codes: PublicOrganizationCode[] }) {
  const { toast } = useToast();
  const redeemed = codes.filter(c => !!c.redeemedAt).length;
  const unredeemed = (org?.seats ?? 0) - redeemed;

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-xl font-semibold">Settings</h2>

      {/* Org profile */}
      <DashCard title="Organization Profile" subtitle="">
        <div className="space-y-4 mt-2">
          <div>
            <Label className="text-xs text-white/50 uppercase tracking-wider mb-1.5 block">Organization name</Label>
            <Input defaultValue={org?.name} className="bg-white/[0.04] border-white/10 text-white" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-white/50 uppercase tracking-wider mb-1.5 block">Primary contact</Label>
              <Input defaultValue={org?.contactName} className="bg-white/[0.04] border-white/10 text-white" />
            </div>
            <div>
              <Label className="text-xs text-white/50 uppercase tracking-wider mb-1.5 block">Contact email</Label>
              <Input defaultValue={org?.contactEmail} className="bg-white/[0.04] border-white/10 text-white" />
            </div>
          </div>
          <Button size="sm" className="h-8 rounded-full bg-white text-black hover:bg-white/90 font-medium text-xs px-4" onClick={() => toast({ title: "Saved" })}>
            Save changes
          </Button>
        </div>
      </DashCard>

      {/* Billing */}
      <DashCard title="Billing" subtitle="">
        <div className="space-y-3 mt-2">
          <div className="flex justify-between text-sm">
            <span className="text-white/50">Current tier</span>
            <span className="font-medium">{tier}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-white/50">Seats purchased</span>
            <span className="font-medium">{org?.seats ?? "—"}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-white/50">Price per seat</span>
            <span className="font-medium">${org ? (org.pricePerSeatCents / 100).toFixed(2) : "—"}/mo</span>
          </div>
          <div className="flex justify-between text-sm border-t border-white/8 pt-3">
            <span className="text-white/50">Total paid</span>
            <span className="font-bold">${org ? (org.totalCents / 100).toLocaleString() : "—"}</span>
          </div>
        </div>
        <Link href="/organizations">
          <Button size="sm" variant="outline" className="mt-4 h-8 rounded-full border-white/20 text-white/70 hover:text-white hover:bg-white/5 text-xs px-4">
            <ArrowUpRight className="mr-1.5 h-3 w-3" /> Upgrade tier
          </Button>
        </Link>
      </DashCard>

      {/* Notifications */}
      <DashCard title="Notification Preferences" subtitle="">
        <div className="space-y-3 mt-2">
          {[
            "At-risk student alerts",
            "Weekly performance digest",
            "Course milestone reminders",
            "New redemption notifications",
          ].map((pref) => (
            <div key={pref} className="flex items-center justify-between py-2 border-b border-white/5">
              <span className="text-sm text-white/70">{pref}</span>
              <button
                className="h-5 w-9 rounded-full bg-emerald-500 relative transition-colors"
                onClick={() => toast({ title: `${pref} updated` })}
              >
                <span className="absolute right-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow" />
              </button>
            </div>
          ))}
        </div>
      </DashCard>

      {/* Code management */}
      <DashCard title="Redemption Codes" subtitle="">
        <div className="flex items-center gap-6 mt-2 mb-4 text-sm">
          <div><span className="text-emerald-400 font-bold">{redeemed}</span><span className="text-white/40 ml-1">redeemed</span></div>
          <div><span className="text-white/60 font-bold">{unredeemed}</span><span className="text-white/40 ml-1">unclaimed</span></div>
        </div>
        <div className="flex gap-2">
          <Link href={`/organizations/${org?.id}`}>
            <Button size="sm" variant="outline" className="h-8 rounded-full border-white/15 text-white/70 hover:text-white hover:bg-white/5 text-xs px-4">
              <KeyRound className="mr-1.5 h-3 w-3" /> Manage codes
            </Button>
          </Link>
          <Button size="sm" variant="outline" className="h-8 rounded-full border-white/15 text-white/70 hover:text-white hover:bg-white/5 text-xs px-4" onClick={() => toast({ title: "Coming soon", description: "Code regeneration will be available shortly." })}>
            Regenerate
          </Button>
        </div>
      </DashCard>
    </div>
  );
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function DashCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-4">
        <p className="text-sm font-semibold text-white/90">{title}</p>
        {subtitle && <p className="text-xs text-white/40 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function StatCard({ label, value, delta, loading, color }: {
  label: string;
  value: string | number;
  delta: string;
  loading: boolean;
  color: "emerald" | "blue" | "violet" | "amber";
}) {
  const accent = {
    emerald: "text-emerald-400",
    blue: "text-blue-400",
    violet: "text-violet-400",
    amber: "text-amber-400",
  }[color];

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-[11px] uppercase tracking-wider text-white/40 mb-2">{label}</p>
      {loading ? (
        <Skeleton className="h-8 w-24 bg-white/5" />
      ) : (
        <p className={`text-3xl font-bold tabular-nums ${accent}`}>{value}</p>
      )}
      <p className="text-[11px] text-white/30 mt-1.5">{delta}</p>
    </div>
  );
}

function MilestoneRow({ label, value, color }: { label: string; value: string; color: string }) {
  const dot: Record<string, string> = {
    emerald: "bg-emerald-400",
    amber: "bg-amber-400",
    red: "bg-red-400",
    blue: "bg-blue-400",
    violet: "bg-violet-400",
  };
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-2 text-white/60">
        <span className={`h-2 w-2 rounded-full shrink-0 ${dot[color] ?? "bg-white/30"}`} />
        {label}
      </span>
      <span className="text-white/80 font-medium text-xs">{value}</span>
    </div>
  );
}
