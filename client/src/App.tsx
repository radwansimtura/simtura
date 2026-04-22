import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import DisciplineScenariosPage from "@/pages/discipline-scenarios";
import ScenarioTrainerPage from "@/pages/scenario-trainer";

function EMSPage() {
  return (
    <DisciplineScenariosPage
      discipline="EMS"
      heroWord="EMS."
      heroSubtitle="Field response, primary assessments, and critical decisions for EMRs through Paramedics."
      heroImage="/images/ems-hero-background.jpg"
      heroVideo="/videos/ambulance-driving.mp4"
      accentColor="blue"
      certLevels={["EMR", "EMT", "AEMT", "Paramedic"]}
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
      <Route path="/" component={LandingPage} />
      <Route path="/ems" component={EMSPage} />
      <Route path="/nursing" component={NursingPage} />
      <Route path="/scenarios" component={EMSPage} />
      <Route path="/scenario/:id" component={ScenarioTrainerPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
