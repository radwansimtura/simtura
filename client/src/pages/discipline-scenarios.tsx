import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "@/components/theme-provider";
import type { Scenario } from "@shared/schema";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Filter,
  Moon,
  Search,
  Sun,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import simturaLogo from "@assets/Screenshot_2025-08-13_at_9.54.52_AM_1776888878004.png";

const difficultyColors: Record<string, string> = {
  Beginner: "bg-green-500/10 text-green-600 dark:text-green-400",
  Intermediate: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  Advanced: "bg-red-500/10 text-red-600 dark:text-red-400",
};

const certColors: Record<string, string> = {
  EMR: "bg-green-500/10 text-green-600 dark:text-green-400",
  EMT: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  AEMT: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  Paramedic: "bg-red-500/10 text-red-600 dark:text-red-400",
  RN: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  LPN: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
  BSN: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
};

interface DisciplineScenariosPageProps {
  discipline: string;
  title: string;
  subtitle: string;
  heroImage: string;
  accentColor: string;
  certLevels: string[];
}

export default function DisciplineScenariosPage({
  discipline,
  title,
  subtitle,
  heroImage,
  accentColor,
  certLevels,
}: DisciplineScenariosPageProps) {
  const { theme, toggleTheme } = useTheme();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCert, setSelectedCert] = useState<string>("All");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("All");

  const { data: scenarios, isLoading } = useQuery<Scenario[]>({
    queryKey: ["/api/scenarios", discipline],
    queryFn: async () => {
      const res = await fetch(`/api/scenarios?discipline=${discipline}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const filteredScenarios = scenarios?.filter((s) => {
    const matchesSearch = s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCert = selectedCert === "All" || s.certLevel === selectedCert;
    const matchesDifficulty = selectedDifficulty === "All" || s.difficulty === selectedDifficulty;
    return matchesSearch && matchesCert && matchesDifficulty;
  });

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon" data-testid="button-back-home">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <img src={simturaLogo} alt="Simtura" className="h-7" data-testid="img-logo" />
            </div>
            <Button size="icon" variant="ghost" onClick={toggleTheme} data-testid="button-theme-toggle">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </nav>

      <div className="relative h-56 sm:h-64 overflow-hidden">
        <img
          src={heroImage}
          alt={title}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-black/40" />
        <div className="absolute bottom-0 left-0 right-0 pb-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white" data-testid="text-scenarios-title">
              {title}
            </h1>
            <p className="mt-2 text-gray-300 max-w-2xl">
              {subtitle}
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search scenarios..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="input-search"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-1">
              <Filter className="h-4 w-4 text-muted-foreground" />
            </div>
            {["All", ...certLevels].map((cert) => (
              <Button
                key={cert}
                variant={selectedCert === cert ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCert(cert)}
                data-testid={`button-filter-cert-${cert}`}
              >
                {cert}
              </Button>
            ))}
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {["All", "Beginner", "Intermediate", "Advanced"].map((diff) => (
            <Button
              key={diff}
              variant={selectedDifficulty === diff ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setSelectedDifficulty(diff)}
              data-testid={`button-filter-diff-${diff}`}
            >
              {diff}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-md border border-border/50 bg-card p-0">
                <Skeleton className="h-48 w-full rounded-t-md rounded-b-none" />
                <div className="p-5 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <div className="flex gap-2 pt-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredScenarios && filteredScenarios.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredScenarios.map((scenario) => (
              <Link key={scenario.id} href={`/scenario/${scenario.id}`}>
                <div
                  className="group cursor-pointer rounded-md border border-border/50 bg-card transition-colors hover-elevate"
                  data-testid={`card-scenario-${scenario.id}`}
                >
                  {scenario.imageUrl && (
                    <div className="relative h-48 overflow-hidden rounded-t-md">
                      <img
                        src={scenario.imageUrl}
                        alt={scenario.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                      <div className="absolute bottom-3 left-3 flex gap-2">
                        <Badge variant="secondary" className={certColors[scenario.certLevel] || ""}>
                          {scenario.certLevel}
                        </Badge>
                      </div>
                    </div>
                  )}
                  <div className="p-5">
                    <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors" data-testid={`text-scenario-title-${scenario.id}`}>
                      {scenario.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {scenario.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={difficultyColors[scenario.difficulty] || ""}>
                        {scenario.difficulty}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {scenario.estimatedMinutes} min
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-1 text-sm text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      Start Scenario <ArrowRight className="h-3 w-3" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Search className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2" data-testid="text-no-results">No scenarios found</h3>
            <p className="text-muted-foreground text-sm">
              Try adjusting your filters or search term.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
