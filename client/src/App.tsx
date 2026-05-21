import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import LandingPageV2 from "@/pages/landing-v2";

function LandingRouter() {
  return <LandingPageV2 />;
}
import DisciplineScenariosPage from "@/pages/discipline-scenarios";
import ScenarioTrainerPage from "@/pages/scenario-trainer";
import SignInPage from "@/pages/signin";
import SignUpPage from "@/pages/signup";
import ForgotPasswordPage from "@/pages/forgot-password";
import ProfilePage from "@/pages/profile";
import ContactPage from "@/pages/contact";
import LegalPage from "@/pages/legal";
import OrganizationsPage from "@/pages/organizations";
import OrganizationDashboardPage from "@/pages/organization-dashboard";
import LearnPage from "@/pages/learn";
import PrivacyPolicyPage from "@/pages/privacy-policy";
import SecurityPage from "@/pages/security";
import WhyItWorksPage from "@/pages/why-it-works";
import DrillScenario1APage from "@/pages/drill-scenario-1a";
import CookieBanner from "@/components/cookie-banner";
import ComingSoonPage from "@/pages/coming-soon";
import WelcomeBackPage from "@/pages/welcome-back";
import OrgDashboardPage from "@/pages/org-dashboard";
import OnboardingPage from "@/pages/onboarding";

function EMSPage() {
  return (
    <DisciplineScenariosPage
      discipline="EMS"
      heroWord="EMS."
      heroSubtitle="Field response, primary assessments, and critical decisions for EMRs through Paramedics."
      heroImage="/images/ems-hero-background.jpg"
      heroVideo="/videos/ems-hero-paramedic-iv.mp4"
      accentColor="blue"
      certLevels={["EMR", "EMT", "AEMT", "Paramedic"]}
    />
  );
}

function FirePage() {
  return (
    <ComingSoonPage
      discipline="Fire"
      accentColor="orange"
      subtitle="Fire suppression, rescue operations, and hazmat scenarios for firefighters and fire medics. We're building it now."
    />
  );
}

function PolicePage() {
  return (
    <ComingSoonPage
      discipline="Police"
      accentColor="violet"
      subtitle="Use-of-force decisions, crisis intervention, and de-escalation scenarios for law enforcement. We're building it now."
    />
  );
}

function NursingPage() {
  return (
    <DisciplineScenariosPage
      discipline="Nursing"
      heroWord="Nursing."
      heroSubtitle="Bedside care, neuro checks, and clinical reasoning for LPNs, RNs, and BSNs."
      heroImage="/images/nursing-hero-background.jpg"
      heroVideo="/videos/hospital-transport.mp4"
      accentColor="emerald"
      certLevels={["RN", "LPN", "BSN"]}
    />
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingRouter} />
      <Route path="/ems" component={EMSPage} />
      <Route path="/nursing" component={NursingPage} />
      <Route path="/fire" component={FirePage} />
      <Route path="/police" component={PolicePage} />
      <Route path="/scenarios" component={EMSPage} />
      <Route path="/scenario/:id" component={ScenarioTrainerPage} />
      <Route path="/signin" component={SignInPage} />
      <Route path="/signup" component={SignUpPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/contact" component={ContactPage} />
      <Route path="/legal" component={LegalPage} />
      <Route path="/organizations" component={OrganizationsPage} />
      <Route path="/organizations/:id" component={OrganizationDashboardPage} />
      <Route path="/org-dashboard/:id" component={OrgDashboardPage} />
      <Route path="/welcome-back" component={WelcomeBackPage} />
      <Route path="/onboarding" component={OnboardingPage} />
      <Route path="/learn" component={LearnPage} />
      <Route path="/privacy" component={PrivacyPolicyPage} />
      <Route path="/security" component={SecurityPage} />
      <Route path="/why-it-works" component={WhyItWorksPage} />
      <Route path="/drill/scenario-1a" component={DrillScenario1APage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
            <CookieBanner />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
