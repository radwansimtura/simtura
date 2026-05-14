import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarClock,
  Check,
  GraduationCap,
  KeyRound,
  Mail,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import {
  ORG_TYPES,
  PRICING_TIERS,
  pricePerSeatCents,
  type CreateOrganizationInput,
  type PublicOrganization,
} from "@shared/schema";
import simturaLogo from "@/assets/simtura-logo.png";
import { SiteFooter } from "@/components/site-footer";

const VALUE_PROPS = [
  {
    icon: <GraduationCap className="h-5 w-5" />,
    title: "Built around how your program runs.",
    body: "Whether you run one class a semester or multiple cohorts year-round, pricing matches your actual structure.",
  },
  {
    icon: <KeyRound className="h-5 w-5" />,
    title: "Individual student codes.",
    body: "Each seat gets its own unique redemption code. Distribute them however works for you.",
  },
  {
    icon: <ShieldCheck className="h-5 w-5" />,
    title: "Track redemptions.",
    body: "See exactly which codes have been claimed and by whom from a private dashboard.",
  },
  {
    icon: <CalendarClock className="h-5 w-5" />,
    title: "Pay for your course, not the calendar.",
    body: "Access ends when your course does. A 6-week EMT class pays for 6 weeks — not an annual subscription.",
  },
];

function formatMoney(cents: number) {
  return `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default function OrganizationsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [seats, setSeats] = useState(25);
  const [courseMonths, setCourseMonths] = useState(4);
  const [form, setForm] = useState<Omit<CreateOrganizationInput, "seats" | "courseMonths">>({
    name: "",
    contactName: user?.name ?? "",
    contactEmail: user?.email ?? "",
    billingEmail: user?.email ?? "",
    orgType: "EMS Agency",
    notes: "",
  });

  const ppsc = useMemo(() => pricePerSeatCents(seats), [seats]);
  const monthlyTotalCents = ppsc * seats;
  const totalCents = monthlyTotalCents * courseMonths;

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload: CreateOrganizationInput = { ...form, seats, courseMonths };
      const res = await apiRequest("POST", "/api/organizations", payload);
      return (await res.json()) as PublicOrganization & { checkoutUrl?: string };
    },
    onSuccess: (org) => {
      if (org.checkoutUrl) {
        toast({
          title: "Redirecting to checkout…",
          description: `Securely complete payment for ${org.name}.`,
        });
        window.location.href = org.checkoutUrl;
        return;
      }
      // Fallback if no checkoutUrl (shouldn't happen)
      setLocation(`/organizations/${org.id}`);
    },
    onError: (e: any) => {
      toast({
        title: "Could not start checkout",
        description: e?.message ?? "Please check the form and try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.contactName || !form.contactEmail || !form.billingEmail) {
      toast({
        title: "Missing information",
        description: "Please fill in every required field.",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate();
  };

  const scrollToBuy = () => {
    document.getElementById("get-started")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-black text-white relative">
      {/* Background video */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <video
          src="/videos/organizations-bg.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          data-testid="video-organizations-bg"
        />
        <div className="absolute inset-0 bg-black/65" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-black/80" />
      </div>

      {/* Content wrapper above video */}
      <div className="relative z-10">
      {/* Top nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-black/40 border-b border-white/5">
        <div className="mx-auto max-w-7xl px-6 sm:px-10 h-20 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-3 cursor-pointer group" data-testid="link-home">
              <ArrowLeft className="h-4 w-4 text-white/60 group-hover:text-white transition-colors" />
              <img src={simturaLogo} alt="Simtura" className="h-9" />
            </div>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-white/70">
            <Link href="/ems" className="hover:text-white transition-colors">EMS</Link>
            <Link href="/nursing" className="hover:text-white transition-colors">Nursing</Link>
            <Link href="/organizations" className="text-white">For Organizations</Link>
          </div>
          <Button
            size="sm"
            onClick={scrollToBuy}
            className="h-9 rounded-full bg-white text-black hover:bg-white/90 font-medium px-5"
            data-testid="button-get-started"
          >
            Get started
          </Button>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative pt-40 pb-20 px-6 sm:px-10 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[11px] uppercase tracking-[0.25em] text-white/70 mb-6">
            <Building2 className="h-3.5 w-3.5" />
            For Organizations
          </div>
          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight mb-6 leading-[1.05]">
            Built around how<br />your program runs.
          </h1>
          <p className="text-lg sm:text-xl text-white/60 max-w-2xl leading-relaxed mb-10">
            Cohort-based licensing for EMS programs, nursing schools, and healthcare agencies.
            Pay per seat, per cohort — not per year.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              size="lg"
              onClick={scrollToBuy}
              className="h-12 rounded-full bg-white text-black hover:bg-white/90 font-medium px-7"
              data-testid="button-hero-cta"
            >
              Get started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <a href="#pricing">
              <Button
                size="lg"
                variant="outline"
                className="h-12 rounded-full border-white/20 bg-transparent text-white hover:bg-white/10 font-medium px-7"
              >
                See pricing
              </Button>
            </a>
          </div>
        </motion.div>
      </section>

      {/* VALUE PROPS */}
      <section className="px-6 sm:px-10 max-w-6xl mx-auto py-12">
        <div className="grid gap-5 sm:grid-cols-2">
          {VALUE_PROPS.map((v, i) => (
            <motion.div
              key={v.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.55, delay: i * 0.08 }}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
              data-testid={`card-value-${i}`}
            >
              <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-white/[0.06] text-white/85 mb-4">
                {v.icon}
              </div>
              <h3 className="text-lg font-semibold mb-2">{v.title}</h3>
              <p className="text-sm text-white/60 leading-relaxed">{v.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="px-6 sm:px-10 max-w-6xl mx-auto py-20 scroll-mt-24">
        <div className="mb-12">
          <p className="text-[11px] uppercase tracking-[0.4em] text-white/50 mb-3">Pricing</p>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight mb-3">
            Pay for your course, not the calendar year.
          </h2>
          <p className="text-white/60 max-w-2xl">
            Seats priced by how long your program actually runs — a 4-week course pays
            less than a 6-month one.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[...PRICING_TIERS].reverse().map((t) => {
            const isPopular = !!t.popular;
            return (
              <div
                key={t.minSeats}
                className={`relative rounded-2xl p-6 flex flex-col ${
                  isPopular
                    ? "border-2 border-white/40 bg-white/[0.06]"
                    : "border border-white/10 bg-white/[0.03]"
                }`}
                data-testid={`pricing-tier-${t.minSeats}`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-6 inline-flex items-center gap-1.5 rounded-full bg-white text-black text-[10px] font-semibold uppercase tracking-[0.2em] px-3 py-1">
                    <Star className="h-3 w-3 fill-black" />
                    Most popular
                  </div>
                )}
                <p className="text-xs uppercase tracking-[0.2em] text-white/50 mb-2">
                  {t.name}
                </p>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-4xl font-bold">${(t.pricePerSeatCents / 100).toFixed(0)}</span>
                  <span className="text-sm text-white/50">/seat/month</span>
                </div>
                <p className="text-sm text-white/70 mb-2 leading-relaxed">{t.description}</p>
                <p className="text-xs text-white/40 mb-5 leading-relaxed italic">{t.bestFor}</p>
                <ul className="text-sm text-white/70 space-y-2 mt-auto">
                  {t.features.map((f, fi) => (
                    <li key={fi} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-emerald-300 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <p className="mt-8 text-sm text-white/50 text-center max-w-2xl mx-auto">
          Payment is collected upfront for the full course duration. Access automatically
          ends when your course does.
        </p>
      </section>

      {/* GET STARTED FORM */}
      <section
        id="get-started"
        className="px-6 sm:px-10 max-w-6xl mx-auto py-20 scroll-mt-24"
      >
        <div className="grid gap-10 lg:grid-cols-[1fr_440px] items-start">
          <div>
            <p className="text-[11px] uppercase tracking-[0.4em] text-white/50 mb-3">Get started</p>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight mb-6">
              Tell us about your organization.
            </h2>
            <p className="text-white/60 max-w-xl mb-10 leading-relaxed">
              We'll generate your seat codes immediately so you can start distributing
              them. You'll be able to download them as CSV or copy individually.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5" data-testid="form-org">
              <div>
                <Label className="text-white/70 text-xs uppercase tracking-wider mb-2 block">
                  Organization name
                </Label>
                <Input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Houston FD EMS Academy"
                  className="h-12 bg-white/[0.04] border-white/10 text-white placeholder:text-white/30"
                  data-testid="input-org-name"
                />
              </div>
              <div>
                <Label className="text-white/70 text-xs uppercase tracking-wider mb-2 block">
                  Organization type
                </Label>
                <Select
                  value={form.orgType}
                  onValueChange={(v) => setForm({ ...form, orgType: v as any })}
                >
                  <SelectTrigger
                    className="h-12 bg-white/[0.04] border-white/10 text-white"
                    data-testid="select-org-type"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ORG_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <Label className="text-white/70 text-xs uppercase tracking-wider mb-2 block">
                    Contact name
                  </Label>
                  <Input
                    required
                    value={form.contactName}
                    onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                    placeholder="Jane Smith"
                    className="h-12 bg-white/[0.04] border-white/10 text-white placeholder:text-white/30"
                    data-testid="input-contact-name"
                  />
                </div>
                <div>
                  <Label className="text-white/70 text-xs uppercase tracking-wider mb-2 block">
                    Contact email
                  </Label>
                  <Input
                    required
                    type="email"
                    value={form.contactEmail}
                    onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                    placeholder="jane@hfd.gov"
                    className="h-12 bg-white/[0.04] border-white/10 text-white placeholder:text-white/30"
                    data-testid="input-contact-email"
                  />
                </div>
              </div>
              <div>
                <Label className="text-white/70 text-xs uppercase tracking-wider mb-2 block">
                  Billing email
                </Label>
                <Input
                  required
                  type="email"
                  value={form.billingEmail}
                  onChange={(e) => setForm({ ...form, billingEmail: e.target.value })}
                  placeholder="ap@hfd.gov"
                  className="h-12 bg-white/[0.04] border-white/10 text-white placeholder:text-white/30"
                  data-testid="input-billing-email"
                />
              </div>
              <div>
                <Label className="text-white/70 text-xs uppercase tracking-wider mb-2 block">
                  Notes (optional)
                </Label>
                <Textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Anything we should know about your program?"
                  className="bg-white/[0.04] border-white/10 text-white placeholder:text-white/30"
                  data-testid="input-notes"
                />
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={createMutation.isPending}
                className="w-full h-12 rounded-full bg-white text-black hover:bg-white/90 font-medium"
                data-testid="button-submit-org"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {createMutation.isPending
                  ? "Generating codes..."
                  : `Activate ${seats} seats — ${formatMoney(totalCents)}`}
              </Button>
              <p className="text-xs text-white/40 text-center">
                Mock checkout for development. Production billing handled at invoice
                or via Stripe.
              </p>
            </form>
          </div>

          {/* Sticky calculator */}
          <div className="lg:sticky lg:top-28 self-start">
            <div className="rounded-2xl border border-white/15 bg-gradient-to-b from-white/[0.05] to-white/[0.02] p-6">
              <p className="text-[11px] uppercase tracking-[0.25em] text-white/50 mb-4">
                Seat calculator
              </p>
              <div className="flex items-baseline gap-2 mb-1">
                <span
                  className="text-5xl font-bold tabular-nums"
                  data-testid="text-seat-count"
                >
                  {seats}
                </span>
                <span className="text-white/50">seats</span>
              </div>
              <p className="text-sm text-white/50 mb-6">
                {formatMoney(ppsc)} per seat / month
              </p>

              <Slider
                min={5}
                max={500}
                step={5}
                value={[seats]}
                onValueChange={(v) => setSeats(v[0])}
                className="mb-3"
                data-testid="slider-seats"
              />
              <div className="flex justify-between text-[11px] text-white/40 mb-6 tabular-nums">
                <span>5</span>
                <span>500</span>
              </div>

              <Input
                type="number"
                min={5}
                max={10000}
                value={seats}
                onChange={(e) =>
                  setSeats(Math.max(5, Math.min(10000, Number(e.target.value) || 5)))
                }
                className="h-10 mb-6 bg-white/[0.04] border-white/10 text-white"
                data-testid="input-seats"
              />

              <div className="pt-5 border-t border-white/10">
                <Label className="text-[11px] uppercase tracking-[0.2em] text-white/50 mb-3 flex items-center gap-2">
                  <CalendarClock className="h-3.5 w-3.5" />
                  Course duration
                </Label>
                <Select
                  value={String(courseMonths)}
                  onValueChange={(v) => setCourseMonths(Number(v))}
                >
                  <SelectTrigger
                    className="h-11 bg-white/[0.04] border-white/10 text-white mb-2"
                    data-testid="select-course-months"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 month (~4 weeks)</SelectItem>
                    <SelectItem value="2">2 months</SelectItem>
                    <SelectItem value="3">3 months</SelectItem>
                    <SelectItem value="4">4 months (a semester)</SelectItem>
                    <SelectItem value="6">6 months</SelectItem>
                    <SelectItem value="9">9 months (academic year)</SelectItem>
                    <SelectItem value="12">12 months</SelectItem>
                    <SelectItem value="18">18 months</SelectItem>
                    <SelectItem value="24">24 months</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-white/40 mb-1">
                  Access ends automatically when the course does.
                </p>
              </div>

              <div className="space-y-3 pt-5 border-t border-white/10 mt-5">
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">{seats} seats × {formatMoney(ppsc)}/mo</span>
                  <span className="tabular-nums">{formatMoney(monthlyTotalCents)}/mo</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">× {courseMonths} month{courseMonths === 1 ? "" : "s"}</span>
                  <span className="tabular-nums">{formatMoney(totalCents)}</span>
                </div>

                <div className="flex justify-between items-baseline pt-3 border-t border-white/10">
                  <span className="text-white/60 text-sm">Total upfront</span>
                  <span
                    className="text-2xl font-bold tabular-nums"
                    data-testid="text-total"
                  >
                    {formatMoney(totalCents)}
                  </span>
                </div>
              </div>

              <div className="mt-6 rounded-xl bg-white/[0.04] p-4 text-xs text-white/60 leading-relaxed flex gap-3">
                <Mail className="h-4 w-4 shrink-0 mt-0.5 text-white/40" />
                Need 1,000+ seats or a custom term? Email{" "}
                <a href="/contact" className="text-white underline">
                  radwan@simtura.ai
                </a>
                .
              </div>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
      </div>
    </div>
  );
}
