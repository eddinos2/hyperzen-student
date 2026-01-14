import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { PasswordGuard } from "./components/auth/PasswordGuard";
import { MaintenanceGuard } from "./components/auth/MaintenanceGuard";
import Login from "./pages/Login";

// Lazy loading des pages pour optimiser le bundle initial
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Eleves = lazy(() => import("./pages/Eleves"));
const EleveDetail = lazy(() => import("./pages/EleveDetail"));
const Reglements = lazy(() => import("./pages/Reglements"));
const Echeances = lazy(() => import("./pages/Echeances"));
const Anomalies = lazy(() => import("./pages/Anomalies"));
const Retards = lazy(() => import("./pages/Retards"));
const Import = lazy(() => import("./pages/Import"));
const Parametres = lazy(() => import("./pages/Parametres"));
const ParametresSecurite = lazy(() => import("./pages/ParametresSecurite"));

const GestionUtilisateurs = lazy(() => import("./pages/GestionUtilisateurs"));
const ComptesEleves = lazy(() => import("./pages/ComptesEleves"));
const PortailEleve = lazy(() => import("./pages/PortailEleve"));
const Tickets = lazy(() => import("./pages/Tickets"));
const Justificatifs = lazy(() => import("./pages/Justificatifs"));
const Rapports = lazy(() => import("./pages/Rapports"));
const AuditLogs = lazy(() => import("./pages/AuditLogs"));
const Automatisation = lazy(() => import("./pages/Automatisation"));
const MigrationAnnee = lazy(() => import("./pages/MigrationAnnee"));
const RapprochementBancaire = lazy(() => import("./pages/RapprochementBancaire"));
const SuiviDocuments = lazy(() => import("./pages/SuiviDocuments"));
const ArchitectureLive = lazy(() => import("./pages/ArchitectureLive"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Loading fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="text-6xl font-black mb-4 animate-pulse">⏳</div>
      <p className="text-2xl font-black">CHARGEMENT...</p>
    </div>
  </div>
);

// Configuration optimisée du QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes par défaut
      gcTime: 1000 * 60 * 10, // 10 minutes (anciennement cacheTime)
      refetchOnWindowFocus: false, // Évite les refetch inutiles
      retry: 1, // Une seule retry
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <MaintenanceGuard>
          <Suspense fallback={<PageLoader />}>
            <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/portail-eleve" element={<ProtectedRoute><PortailEleve /></ProtectedRoute>} />
          <Route path="/" element={<ProtectedRoute><PasswordGuard><Dashboard /></PasswordGuard></ProtectedRoute>} />
          <Route path="/eleves" element={<ProtectedRoute><PasswordGuard><Eleves /></PasswordGuard></ProtectedRoute>} />
          <Route path="/eleves/:id" element={<ProtectedRoute><PasswordGuard><EleveDetail /></PasswordGuard></ProtectedRoute>} />
          <Route path="/reglements" element={<ProtectedRoute><PasswordGuard><Reglements /></PasswordGuard></ProtectedRoute>} />
          <Route path="/echeances" element={<ProtectedRoute><PasswordGuard><Echeances /></PasswordGuard></ProtectedRoute>} />
          <Route path="/anomalies" element={<ProtectedRoute><PasswordGuard><Anomalies /></PasswordGuard></ProtectedRoute>} />
          <Route path="/retards" element={<ProtectedRoute><PasswordGuard><Retards /></PasswordGuard></ProtectedRoute>} />
          <Route path="/import" element={<ProtectedRoute><PasswordGuard><Import /></PasswordGuard></ProtectedRoute>} />
          <Route path="/parametres" element={<ProtectedRoute><PasswordGuard><Parametres /></PasswordGuard></ProtectedRoute>} />
          <Route path="/parametres-securite" element={<ProtectedRoute><PasswordGuard><ParametresSecurite /></PasswordGuard></ProtectedRoute>} />
          
          <Route path="/gestion-utilisateurs" element={<ProtectedRoute><PasswordGuard><GestionUtilisateurs /></PasswordGuard></ProtectedRoute>} />
          <Route path="/comptes-eleves" element={<ProtectedRoute><PasswordGuard><ComptesEleves /></PasswordGuard></ProtectedRoute>} />
          <Route path="/tickets" element={<ProtectedRoute><PasswordGuard><Tickets /></PasswordGuard></ProtectedRoute>} />
          <Route path="/justificatifs" element={<ProtectedRoute><PasswordGuard><Justificatifs /></PasswordGuard></ProtectedRoute>} />
          <Route path="/rapports" element={<ProtectedRoute><PasswordGuard><Rapports /></PasswordGuard></ProtectedRoute>} />
          <Route path="/audit-logs" element={<ProtectedRoute><PasswordGuard><AuditLogs /></PasswordGuard></ProtectedRoute>} />
          <Route path="/automatisation" element={<ProtectedRoute><PasswordGuard><Automatisation /></PasswordGuard></ProtectedRoute>} />
          <Route path="/rapprochement-bancaire" element={<ProtectedRoute><PasswordGuard><RapprochementBancaire /></PasswordGuard></ProtectedRoute>} />
          <Route path="/suivi-documents" element={<ProtectedRoute><PasswordGuard><SuiviDocuments /></PasswordGuard></ProtectedRoute>} />
          <Route path="/parametres/migration-annee" element={<ProtectedRoute><PasswordGuard><MigrationAnnee /></PasswordGuard></ProtectedRoute>} />
          <Route path="/architecture-live" element={<ProtectedRoute><PasswordGuard><ArchitectureLive /></PasswordGuard></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        </MaintenanceGuard>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
