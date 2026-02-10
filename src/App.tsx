import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Guards from "./pages/Guards";
import Sites from "./pages/Sites";
import Checkpoints from "./pages/Checkpoints";
import Shifts from "./pages/Shifts";
import Schedule from "./pages/Schedule";
import Alerts from "./pages/Alerts";
import Cameras from "./pages/Cameras";
import Reports from "./pages/Reports";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import Users from "./pages/Users";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Map from "./pages/Map";
// Guard Mobile Interface
import GuardHome from "./pages/guard/GuardHome";
import GuardScan from "./pages/guard/GuardScan";
import GuardPatrol from "./pages/guard/GuardPatrol";
import GuardIncidents from "./pages/guard/GuardIncidents";
import GuardProfile from "./pages/guard/GuardProfile";
import GuardMessages from "./pages/guard/GuardMessages";
// Supervisor Mobile Interface
import SupervisorHome from "./pages/supervisor/SupervisorHome";
import SupervisorGuards from "./pages/supervisor/SupervisorGuards";
import SupervisorAlerts from "./pages/supervisor/SupervisorAlerts";
import SupervisorSites from "./pages/supervisor/SupervisorSites";
import SupervisorMessages from "./pages/supervisor/SupervisorMessages";
import SupervisorSettings from "./pages/supervisor/SupervisorSettings";
import Messages from "./pages/Messages";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/guards" element={<ProtectedRoute><Guards /></ProtectedRoute>} />
            <Route path="/sites" element={<ProtectedRoute><Sites /></ProtectedRoute>} />
            <Route path="/checkpoints" element={<ProtectedRoute><Checkpoints /></ProtectedRoute>} />
            <Route path="/shifts" element={<ProtectedRoute><Shifts /></ProtectedRoute>} />
            <Route path="/schedule" element={<ProtectedRoute><Schedule /></ProtectedRoute>} />
            <Route path="/alerts" element={<ProtectedRoute><Alerts /></ProtectedRoute>} />
            <Route path="/cameras" element={<ProtectedRoute><Cameras /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/map" element={<ProtectedRoute><Map /></ProtectedRoute>} />
            {/* Guard Mobile Interface */}
            <Route path="/guard" element={<ProtectedRoute requiredRole="guard"><GuardHome /></ProtectedRoute>} />
            <Route path="/guard/home" element={<ProtectedRoute requiredRole="guard"><GuardHome /></ProtectedRoute>} />
            <Route path="/guard/scan" element={<ProtectedRoute requiredRole="guard"><GuardScan /></ProtectedRoute>} />
            <Route path="/guard/patrol" element={<ProtectedRoute requiredRole="guard"><GuardPatrol /></ProtectedRoute>} />
            <Route path="/guard/incidents" element={<ProtectedRoute requiredRole="guard"><GuardIncidents /></ProtectedRoute>} />
            <Route path="/guard/profile" element={<ProtectedRoute requiredRole="guard"><GuardProfile /></ProtectedRoute>} />
            <Route path="/guard/messages" element={<ProtectedRoute requiredRole="guard"><GuardMessages /></ProtectedRoute>} />
            {/* Supervisor Mobile Interface */}
            <Route path="/supervisor" element={<ProtectedRoute requiredRole="supervisor"><SupervisorHome /></ProtectedRoute>} />
            <Route path="/supervisor/guards" element={<ProtectedRoute requiredRole="supervisor"><SupervisorGuards /></ProtectedRoute>} />
            <Route path="/supervisor/alerts" element={<ProtectedRoute requiredRole="supervisor"><SupervisorAlerts /></ProtectedRoute>} />
            <Route path="/supervisor/sites" element={<ProtectedRoute requiredRole="supervisor"><SupervisorSites /></ProtectedRoute>} />
            <Route path="/supervisor/messages" element={<ProtectedRoute requiredRole="supervisor"><SupervisorMessages /></ProtectedRoute>} />
            <Route path="/supervisor/settings" element={<ProtectedRoute requiredRole="supervisor"><SupervisorSettings /></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
