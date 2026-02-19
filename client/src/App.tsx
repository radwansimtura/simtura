import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import ScenariosPage from "@/pages/scenarios";
import ScenarioTrainerPage from "@/pages/scenario-trainer";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/scenarios" component={ScenariosPage} />
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
