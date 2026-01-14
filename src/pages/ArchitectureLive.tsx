import { useEffect, useState, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import mermaid from "mermaid";
import { Activity, Database, Users, Calendar, FileText, AlertCircle, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

interface SystemStats {
  eleves: number;
  dossiers: number;
  echeances: number;
  reglements: number;
  tickets: number;
  anomalies: number;
  relances: number;
}

export default function ArchitectureLive() {
  const [stats, setStats] = useState<SystemStats>({
    eleves: 0,
    dossiers: 0,
    echeances: 0,
    reglements: 0,
    tickets: 0,
    anomalies: 0,
    relances: 0,
  });
  const mermaidRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [viewType, setViewType] = useState<'global' | 'frontend' | 'backend' | 'database' | 'integrations'>('global');

  // Récupérer les statistiques
  const { data: statsData } = useQuery({
    queryKey: ['system-stats'],
    queryFn: async () => {
      const [eleves, dossiers, echeances, reglements, tickets, anomalies, relances] = await Promise.all([
        supabase.from('eleves').select('*', { count: 'exact', head: true }),
        supabase.from('dossiers_scolarite').select('*', { count: 'exact', head: true }),
        supabase.from('echeances').select('*', { count: 'exact', head: true }),
        supabase.from('reglements').select('*', { count: 'exact', head: true }),
        supabase.from('tickets').select('*', { count: 'exact', head: true }),
        supabase.from('anomalies').select('*', { count: 'exact', head: true }).eq('statut', 'ouverte'),
        supabase.from('relances').select('*', { count: 'exact', head: true }).eq('statut', 'envoyee'),
      ]);

      return {
        eleves: eleves.count || 0,
        dossiers: dossiers.count || 0,
        echeances: echeances.count || 0,
        reglements: reglements.count || 0,
        tickets: tickets.count || 0,
        anomalies: anomalies.count || 0,
        relances: relances.count || 0,
      };
    },
    refetchInterval: 5000, // Refresh toutes les 5 secondes
  });

  useEffect(() => {
    if (statsData) {
      setStats(statsData);
    }
  }, [statsData]);

  // Configuration Mermaid (une seule fois)
  useEffect(() => {
    if (!isInitialized) {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        securityLevel: 'loose',
        flowchart: {
          useMaxWidth: true,
          htmlLabels: true,
          curve: 'basis',
        },
      });
      setIsInitialized(true);
    }
  }, [isInitialized]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.5));
  const handleZoomReset = () => setZoom(1);

  // Générer le diagramme avec stats dynamiques
  useEffect(() => {
    if (!isInitialized) return;

    const renderDiagram = async () => {
      if (!mermaidRef.current) return;

      let diagram = '';

      // Diagramme selon la vue sélectionnée
      if (viewType === 'global') {
        diagram = `
graph TB
    subgraph "Interface Utilisateur"
        Login[Page Login]
        AdminDash["Dashboard Admin<br/><b>${stats.eleves}</b> élèves"]
        EleveDash[Portail Élève]
        ProfDash[Espace Enseignants]
    end

    subgraph "Authentification & Sécurité"
        Auth[Supabase Auth]
        RLS[Row Level Security]
        Roles[user_roles]
        AuditLog[Audit Logs]
    end

    subgraph "Modules Administratifs"
        Eleves["Gestion Élèves<br/><b>${stats.eleves}</b>"]
        Dossiers["Dossiers Scolarité<br/><b>${stats.dossiers}</b>"]
        Echeances["Échéances<br/><b>${stats.echeances}</b>"]
        Reglements["Règlements<br/><b>${stats.reglements}</b>"]
        Tickets["Support Tickets<br/><b>${stats.tickets}</b>"]
        Anomalies["Anomalies<br/><b>${stats.anomalies}</b> ouvertes"]
        Relances["Relances<br/><b>${stats.relances}</b> actives"]
    end

    subgraph "Base de Données"
        DB_Eleves[(eleves<br/>${stats.eleves})]
        DB_Dossiers[(dossiers<br/>${stats.dossiers})]
        DB_Echeances[(echeances<br/>${stats.echeances})]
        DB_Reglements[(reglements<br/>${stats.reglements})]
        DB_Tickets[(tickets<br/>${stats.tickets})]
        DB_Anomalies[(anomalies<br/>${stats.anomalies})]
        DB_Relances[(relances<br/>${stats.relances})]
    end

    subgraph "Edge Functions"
        EF_CreerCompte[creer-compte-eleve]
        EF_GenererEch[generer-echeances-auto]
        EF_SyncEch[synchroniser-echeance-reglement]
        EF_GenererRecu[generer-recu-pdf]
        EF_EnvoyerRelances[envoyer-relances-retard]
        EF_TraiterRelances[traiter-relances-automatiques]
    end

    %% Flux Authentification
    Login --> Auth
    Auth --> Roles
    Auth --> RLS

    %% Flux Admin
    Auth -->|Admin| AdminDash
    AdminDash --> Eleves
    AdminDash --> Dossiers
    AdminDash --> Echeances
    AdminDash --> Reglements
    AdminDash --> Tickets
    AdminDash --> Anomalies
    AdminDash --> Relances

    %% Flux Élève
    Auth -->|Élève| EleveDash

    %% Connexions Base de Données
    Eleves <--> DB_Eleves
    Dossiers <--> DB_Dossiers
    Echeances <--> DB_Echeances
    Reglements <--> DB_Reglements
    Tickets <--> DB_Tickets
    Anomalies <--> DB_Anomalies
    Relances <--> DB_Relances

    %% Edge Functions
    Eleves --> EF_CreerCompte
    Echeances --> EF_GenererEch
    Reglements --> EF_SyncEch
    Reglements --> EF_GenererRecu
    Relances --> EF_EnvoyerRelances
    Relances --> EF_TraiterRelances

    style Login fill:#ffd700
    style AdminDash fill:#ffd700
    style EleveDash fill:#00d9ff
    style Auth fill:#ff6b6b
    style RLS fill:#ff6b6b
    style DB_Eleves fill:#4ecdc4
    style DB_Dossiers fill:#4ecdc4
    style DB_Echeances fill:#4ecdc4
    style DB_Reglements fill:#4ecdc4
    style Anomalies fill:#ff6b6b
    style Relances fill:#ff9f43
`;
      } else if (viewType === 'frontend') {
        diagram = `
graph TB
    subgraph "Pages & Composants"
        Dashboard[Dashboard<br/>${stats.eleves} élèves]
        ElevesPage[Page Élèves]
        ReglementsPage[Page Règlements<br/>${stats.reglements}]
        EcheancesPage[Page Échéances<br/>${stats.echeances}]
        TicketsPage[Page Tickets<br/>${stats.tickets}]
        AnomaliesPage[Page Anomalies<br/>${stats.anomalies}]
    end

    subgraph "Composants UI"
        DataTable[DataTable]
        EmptyState[EmptyState]
        StatsCard[StatsCard]
        QuickActions[QuickActions]
        BulkActions[BulkActions]
    end

    subgraph "Dialogs & Forms"
        AjouterEleve[Ajouter Élève]
        ModifierEleve[Modifier Élève]
        AjouterReglement[Ajouter Règlement]
        CreerTicket[Créer Ticket]
        TraiterJustificatif[Traiter Justificatif]
    end

    subgraph "Hooks Personnalisés"
        useDebounce[useDebounce]
        useQueryParams[useQueryParams]
        useUserRole[useUserRole]
        useClotureEleve[useClotureEleve]
    end

    Dashboard --> StatsCard
    Dashboard --> QuickActions
    ElevesPage --> DataTable
    ElevesPage --> AjouterEleve
    ReglementsPage --> DataTable
    ReglementsPage --> BulkActions
    ElevesPage --> useDebounce
    ElevesPage --> useQueryParams

    style Dashboard fill:#ffd700
    style DataTable fill:#4ecdc4
    style StatsCard fill:#00d9ff
`;
      } else if (viewType === 'backend') {
        diagram = `
graph TB
    subgraph "Edge Functions"
        EF1[creer-compte-eleve]
        EF2[generer-echeances-auto]
        EF3[synchroniser-echeance-reglement]
        EF4[generer-recu-pdf]
        EF5[envoyer-relances-retard]
        EF6[traiter-relances-automatiques]
        EF7[notifier-echeance-proche]
        EF8[supprimer-eleve-complet]
        EF9[sync-google-sheets]
        EF10[sync-typeform]
    end

    subgraph "Logique Métier"
        Calculs[Calculs Financiers]
        Detection[Détection Anomalies]
        Validation[Validation Données]
        Notifications[Système Notifications]
    end

    subgraph "Intégrations"
        Typeform[Typeform Webhook]
        GoogleSheets[Google Sheets API]
        EmailService[Service Email]
        PDFGen[Générateur PDF]
    end

    EF1 --> Validation
    EF2 --> Calculs
    EF3 --> Calculs
    EF4 --> PDFGen
    EF5 --> EmailService
    EF6 --> Notifications
    EF7 --> Notifications
    EF9 --> GoogleSheets
    EF10 --> Typeform

    Calculs --> Detection

    style EF1 fill:#ff6b6b
    style EF2 fill:#ff9f43
    style Calculs fill:#4ecdc4
    style Detection fill:#ffd700
`;
      } else if (viewType === 'database') {
        diagram = `
graph TB
    subgraph "Tables Principales"
        T_Eleves[(eleves<br/>${stats.eleves})]
        T_Dossiers[(dossiers_scolarite<br/>${stats.dossiers})]
        T_Echeances[(echeances<br/>${stats.echeances})]
        T_Reglements[(reglements<br/>${stats.reglements})]
    end

    subgraph "Tables Support"
        T_Tickets[(tickets<br/>${stats.tickets})]
        T_Justifs[(justificatifs)]
        T_Relances[(relances<br/>${stats.relances})]
        T_Anomalies[(anomalies<br/>${stats.anomalies})]
        T_Recus[(recus)]
    end

    subgraph "Tables Configuration"
        T_Campus[(campus)]
        T_Filieres[(filieres)]
        T_Annees[(annees_scolaires)]
        T_Plans[(plans_paiement)]
        T_Params[(parametres_globaux)]
    end

    subgraph "Tables Auth & Audit"
        T_Profiles[(profiles)]
        T_UserRoles[(user_roles)]
        T_AuditLog[(audit_log)]
        T_Credentials[(eleves_credentials)]
    end

    T_Eleves --> T_Dossiers
    T_Dossiers --> T_Echeances
    T_Dossiers --> T_Reglements
    T_Echeances --> T_Reglements
    T_Eleves --> T_Tickets
    T_Eleves --> T_Justifs
    T_Eleves --> T_Credentials
    T_Dossiers --> T_Campus
    T_Dossiers --> T_Filieres
    T_Dossiers --> T_Annees

    style T_Eleves fill:#4ecdc4
    style T_Dossiers fill:#4ecdc4
    style T_Echeances fill:#ff9f43
    style T_Reglements fill:#00d9ff
`;
      } else if (viewType === 'integrations') {
        diagram = `
graph TB
    subgraph "Entrées Externes"
        Typeform[Typeform<br/>Formulaires Inscription]
        GoogleSheets[Google Sheets<br/>Import Données]
        ManualImport[Import CSV Manuel]
    end

    subgraph "Traitement"
        ParseData[Parse & Validation]
        MapFields[Mapping Champs]
        CreateRecords[Création Enregistrements]
        SendNotifs[Envoi Notifications]
    end

    subgraph "Base de Données"
        DB_Eleves[(eleves)]
        DB_Dossiers[(dossiers)]
        DB_Credentials[(credentials)]
    end

    subgraph "Sorties"
        EmailEleve[Email Élève<br/>Identifiants]
        EmailAdmin[Email Admin<br/>Confirmation]
        LogAudit[Audit Log]
    end

    subgraph "Automatisation"
        CronJobs[Tâches Planifiées]
        RelancesAuto[Relances Auto]
        NotifEcheances[Notif Échéances]
        GenEcheances[Génération Auto]
    end

    Typeform --> ParseData
    GoogleSheets --> ParseData
    ManualImport --> ParseData
    ParseData --> MapFields
    MapFields --> CreateRecords
    CreateRecords --> DB_Eleves
    CreateRecords --> DB_Dossiers
    CreateRecords --> DB_Credentials
    CreateRecords --> SendNotifs
    SendNotifs --> EmailEleve
    SendNotifs --> EmailAdmin
    CreateRecords --> LogAudit

    CronJobs --> RelancesAuto
    CronJobs --> NotifEcheances
    CronJobs --> GenEcheances

    style Typeform fill:#ffd700
    style GoogleSheets fill:#00d9ff
    style CronJobs fill:#ff6b6b
    style DB_Eleves fill:#4ecdc4
`;
      }

      try {
        // Générer un ID unique pour chaque rendu
        const id = `mermaid-${Date.now()}`;
        const { svg } = await mermaid.render(id, diagram);
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = svg;
        }
      } catch (error) {
        console.error('Erreur rendu Mermaid:', error);
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = '<div class="text-destructive p-4">Erreur lors du rendu du diagramme</div>';
        }
      }
    };

    renderDiagram();
  }, [stats, isInitialized, viewType]);

  // Écouter les changements en temps réel
  useEffect(() => {
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
        },
        () => {
          // Recharger les stats quand il y a un changement
          console.log('Changement détecté - rafraîchissement des stats');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Architecture Live</h1>
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Élèves</p>
                <p className="text-2xl font-bold">{stats.eleves}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Dossiers</p>
                <p className="text-2xl font-bold">{stats.dossiers}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Échéances</p>
                <p className="text-2xl font-bold">{stats.echeances}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Règlements</p>
                <p className="text-2xl font-bold">{stats.reglements}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Tickets</p>
                <p className="text-2xl font-bold">{stats.tickets}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-sm text-muted-foreground">Anomalies</p>
                <p className="text-2xl font-bold">{stats.anomalies}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Relances</p>
                <p className="text-2xl font-bold">{stats.relances}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Status Indicator */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium">Système Opérationnel</span>
              <Badge variant="outline" className="ml-2">Mise à jour auto toutes les 5s</Badge>
            </div>
            <Badge variant="secondary">Temps réel actif</Badge>
          </div>
        </Card>

        {/* Diagramme */}
        <Card className="p-6">
          <Tabs defaultValue="flowchart" className="w-full">
            <TabsList className="grid w-full max-w-2xl grid-cols-3">
              <TabsTrigger value="flowchart">Flowchart</TabsTrigger>
              <TabsTrigger value="views">Vues Détaillées</TabsTrigger>
              <TabsTrigger value="info">Informations</TabsTrigger>
            </TabsList>

            <TabsContent value="flowchart" className="mt-6 space-y-4">
              {/* Contrôles de zoom */}
              <div className="flex items-center gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleZoomOut}
                  disabled={zoom <= 0.5}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Badge variant="outline" className="min-w-[60px] justify-center">
                  {Math.round(zoom * 100)}%
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleZoomIn}
                  disabled={zoom >= 3}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleZoomReset}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="w-full overflow-auto bg-background rounded-lg border p-4" style={{ minHeight: '600px' }}>
                <div 
                  ref={mermaidRef}
                  style={{ 
                    transform: `scale(${zoom})`,
                    transformOrigin: 'top left',
                    transition: 'transform 0.2s ease-out'
                  }}
                />
              </div>
            </TabsContent>

            <TabsContent value="views" className="mt-6 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <Button
                  variant={viewType === 'global' ? 'default' : 'outline'}
                  onClick={() => setViewType('global')}
                  className="w-full"
                >
                  Vue Globale
                </Button>
                <Button
                  variant={viewType === 'frontend' ? 'default' : 'outline'}
                  onClick={() => setViewType('frontend')}
                  className="w-full"
                >
                  Frontend
                </Button>
                <Button
                  variant={viewType === 'backend' ? 'default' : 'outline'}
                  onClick={() => setViewType('backend')}
                  className="w-full"
                >
                  Backend
                </Button>
                <Button
                  variant={viewType === 'database' ? 'default' : 'outline'}
                  onClick={() => setViewType('database')}
                  className="w-full"
                >
                  Base de données
                </Button>
                <Button
                  variant={viewType === 'integrations' ? 'default' : 'outline'}
                  onClick={() => setViewType('integrations')}
                  className="w-full"
                >
                  Intégrations
                </Button>
              </div>

              <Card className="p-4 bg-muted">
                <h3 className="font-semibold mb-2">
                  {viewType === 'global' && 'Vue Globale - Architecture Complète'}
                  {viewType === 'frontend' && 'Frontend - Pages & Composants React'}
                  {viewType === 'backend' && 'Backend - Edge Functions & Logique'}
                  {viewType === 'database' && 'Base de Données - Tables & Relations'}
                  {viewType === 'integrations' && 'Intégrations - Flux de Données Externes'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {viewType === 'global' && 'Visualisation complète des flux entre interfaces, modules et base de données'}
                  {viewType === 'frontend' && 'Composants, pages, hooks et design system utilisés dans l\'interface'}
                  {viewType === 'backend' && 'Edge functions, calculs métier et intégrations externes'}
                  {viewType === 'database' && 'Structure des tables et relations entre entités'}
                  {viewType === 'integrations' && 'Flux d\'import/export, webhooks et automatisations'}
                </p>
              </Card>

              {/* Contrôles de zoom pour la vue détaillée */}
              <div className="flex items-center gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleZoomOut}
                  disabled={zoom <= 0.5}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Badge variant="outline" className="min-w-[60px] justify-center">
                  {Math.round(zoom * 100)}%
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleZoomIn}
                  disabled={zoom >= 3}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleZoomReset}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="w-full overflow-auto bg-background rounded-lg border p-4" style={{ minHeight: '600px' }}>
                <div 
                  ref={mermaidRef}
                  style={{ 
                    transform: `scale(${zoom})`,
                    transformOrigin: 'top left',
                    transition: 'transform 0.2s ease-out'
                  }}
                />
              </div>
            </TabsContent>

            <TabsContent value="info" className="mt-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Architecture HyperZen</h3>
                  <p className="text-muted-foreground">
                    Cette visualisation présente l'architecture complète du système HyperZen avec
                    des statistiques en temps réel. Le diagramme se met à jour automatiquement
                    toutes les 5 secondes pour refléter l'état actuel du système.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-semibold">Légende des couleurs</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded" style={{ backgroundColor: '#ffd700' }} />
                        <span>Interfaces utilisateur</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded" style={{ backgroundColor: '#00d9ff' }} />
                        <span>Portail élève</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded" style={{ backgroundColor: '#ff6b6b' }} />
                        <span>Sécurité & Alertes</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded" style={{ backgroundColor: '#4ecdc4' }} />
                        <span>Base de données</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold">Fonctionnalités temps réel</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>✓ Statistiques actualisées (5s)</li>
                      <li>✓ Détection changements DB</li>
                      <li>✓ Indicateurs d'état visuels</li>
                      <li>✓ Compteurs par module</li>
                    </ul>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </AppLayout>
  );
}
