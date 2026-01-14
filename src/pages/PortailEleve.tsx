import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Download, LogOut, FileText, Calendar, CreditCard, User, MessageSquare, Upload, Receipt } from 'lucide-react';
import { formaterMontant, formaterDate, calculerSoldeDossier } from '@/lib/calculs';
import { SoldeCard } from '@/components/eleves/SoldeCard';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import type { SoldeCalcule } from '@/lib/calculs';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DocumentsSection } from '@/components/portail-eleve/DocumentsSection';
import { JustificatifsSection } from '@/components/portail-eleve/JustificatifsSection';
import { TicketsSection } from '@/components/portail-eleve/TicketsSection';
import { ProfilSection } from '@/components/portail-eleve/ProfilSection';
import { RecusSection } from '@/components/portail-eleve/RecusSection';

export default function PortailEleve() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [eleve, setEleve] = useState<any>(null);
  const [solde, setSolde] = useState<SoldeCalcule | null>(null);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate('/login-eleve');
      return;
    }

    setUser(user);

    // Récupérer les infos de l'élève
    const { data: eleveData } = await supabase
      .from('eleves')
      .select(`
        *,
        dossiers_scolarite (
          id,
          annee_scolaire,
          tarif_scolarite,
          impaye_anterieur,
          campus (nom),
          filieres (nom),
          annees_scolaires (libelle)
        )
      `)
      .eq('user_id', user.id)
      .single();

    if (eleveData) {
      setEleve(eleveData);
      
      // Calculer le solde si un dossier existe
      if (eleveData.dossiers_scolarite && eleveData.dossiers_scolarite.length > 0) {
        const dossierId = eleveData.dossiers_scolarite[0].id;
        const soldeData = await calculerSoldeDossier(dossierId);
        setSolde(soldeData);
      }
    }
  };

  const { data: reglements } = useQuery({
    queryKey: ['eleve-reglements', eleve?.id],
    enabled: !!eleve?.dossiers_scolarite?.[0]?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reglements')
        .select('*')
        .eq('dossier_id', eleve.dossiers_scolarite[0].id)
        .eq('statut', 'valide')
        .order('date_reglement', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: echeances } = useQuery({
    queryKey: ['eleve-echeances', eleve?.id],
    enabled: !!eleve?.dossiers_scolarite?.[0]?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('echeances')
        .select('*')
        .eq('dossier_id', eleve.dossiers_scolarite[0].id)
        .order('date_echeance', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login-eleve');
  };

  const handleDownloadRecu = async (reglementId: string) => {
    try {
      toast({
        title: 'Génération en cours',
        description: 'Préparation du reçu...',
      });

      const { data, error } = await supabase.functions.invoke('generer-recu-pdf', {
        body: { reglementId },
      });

      if (error) throw error;

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(data.html);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.print();
        }, 250);
      }

      toast({
        title: 'Reçu généré',
        description: 'Utilisez Ctrl+P ou Cmd+P pour imprimer ou sauvegarder en PDF',
      });
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'payee': return 'bg-green-200 border-green-600';
      case 'en_retard': return 'bg-red-200 border-red-600';
      case 'a_venir': return 'bg-yellow-200 border-yellow-600';
      default: return 'bg-white border-black';
    }
  };

  if (!eleve) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-50 to-blue-50">
        <div className="text-6xl animate-spin">⏳</div>
      </div>
    );
  }

  const dossier = eleve.dossiers_scolarite?.[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="brutal-card p-6 mb-6 bg-gradient-to-r from-cyan-400 to-blue-400 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-black mb-2">PORTAIL ÉLÈVE</h1>
              <p className="text-xl font-bold">
                {eleve.prenom} {eleve.nom}
              </p>
              {dossier && (
                <p className="text-sm font-bold opacity-90 mt-1">
                  {dossier.campus?.nom} - {dossier.filieres?.nom} - {dossier.annee_scolaire}
                </p>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="brutal-button bg-white text-black flex items-center gap-2"
            >
              <LogOut className="w-5 h-5" />
              DÉCONNEXION
            </button>
          </div>
        </div>

        {/* Solde Card */}
        {solde && (
          <div className="mb-6">
            <SoldeCard solde={solde} />
          </div>
        )}

        {/* Tabs Navigation */}
        <Tabs defaultValue="paiements" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 gap-2 mb-6 h-auto p-2 bg-white border-4 border-black rounded-2xl">
            <TabsTrigger
              value="paiements"
              className="brutal-tab data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <CreditCard className="w-5 h-5 mr-2" />
              <span className="hidden sm:inline">PAIEMENTS</span>
            </TabsTrigger>
            <TabsTrigger
              value="recus"
              className="brutal-tab data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Receipt className="w-5 h-5 mr-2" />
              <span className="hidden sm:inline">REÇUS</span>
            </TabsTrigger>
            <TabsTrigger
              value="documents"
              className="brutal-tab data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <FileText className="w-5 h-5 mr-2" />
              <span className="hidden sm:inline">DOCUMENTS</span>
            </TabsTrigger>
            <TabsTrigger
              value="justificatifs"
              className="brutal-tab data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Upload className="w-5 h-5 mr-2" />
              <span className="hidden sm:inline">JUSTIFICATIFS</span>
            </TabsTrigger>
            <TabsTrigger
              value="tickets"
              className="brutal-tab data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <MessageSquare className="w-5 h-5 mr-2" />
              <span className="hidden sm:inline">SUPPORT</span>
            </TabsTrigger>
            <TabsTrigger
              value="profil"
              className="brutal-tab data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <User className="w-5 h-5 mr-2" />
              <span className="hidden sm:inline">PROFIL</span>
            </TabsTrigger>
          </TabsList>

          {/* Paiements */}
          <TabsContent value="paiements" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Règlements */}
              <div className="brutal-card overflow-hidden">
                <div className="bg-black text-white p-4">
                  <h2 className="text-2xl font-black flex items-center gap-2">
                    <CreditCard className="w-6 h-6" />
                    MES RÈGLEMENTS
                  </h2>
                </div>
                <div className="p-4 max-h-96 overflow-y-auto">
                  {!reglements || reglements.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 mx-auto mb-2 opacity-20" />
                      <p className="text-sm font-bold text-muted-foreground">
                        Aucun règlement enregistré
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {reglements.map((reglement) => (
                        <div
                          key={reglement.id}
                          className="brutal-card p-4 bg-gradient-to-br from-green-100 to-green-50"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-black">
                              {formaterDate(reglement.date_reglement)}
                            </span>
                            <span className="text-lg font-black text-green-600">
                              {formaterMontant(reglement.montant)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold px-3 py-1 rounded-lg border-2 border-black bg-white">
                              {reglement.moyen_paiement}
                            </span>
                            <button
                              onClick={() => handleDownloadRecu(reglement.id)}
                              className="p-2 rounded-lg border-2 border-black hover:bg-black hover:text-white transition-colors"
                              title="Télécharger le reçu"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Échéances */}
              <div className="brutal-card overflow-hidden">
                <div className="bg-black text-white p-4">
                  <h2 className="text-2xl font-black flex items-center gap-2">
                    <Calendar className="w-6 h-6" />
                    MES ÉCHÉANCES
                  </h2>
                </div>
                <div className="p-4 max-h-96 overflow-y-auto">
                  {!echeances || echeances.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="w-12 h-12 mx-auto mb-2 opacity-20" />
                      <p className="text-sm font-bold text-muted-foreground">
                        Aucune échéance planifiée
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {echeances.map((echeance) => (
                        <div
                          key={echeance.id}
                          className={`brutal-card p-4 ${
                            echeance.statut === 'payee'
                              ? 'bg-gradient-to-br from-green-100 to-green-50'
                              : echeance.statut === 'en_retard'
                              ? 'bg-gradient-to-br from-red-100 to-red-50'
                              : 'bg-gradient-to-br from-yellow-100 to-yellow-50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-black">
                              {formaterDate(echeance.date_echeance)}
                            </span>
                            <span className="text-lg font-black">
                              {formaterMontant(echeance.montant)}
                            </span>
                          </div>
                          <span
                            className={`inline-block px-3 py-1 rounded-lg text-xs font-black border-2 ${getStatutColor(echeance.statut)}`}
                          >
                            {echeance.statut.toUpperCase().replace('_', ' ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Reçus */}
          <TabsContent value="recus">
            <RecusSection eleveId={eleve.id} />
          </TabsContent>

          {/* Documents */}
          <TabsContent value="documents">
            <DocumentsSection eleveId={eleve.id} dossierId={dossier?.id} />
          </TabsContent>

          {/* Justificatifs */}
          <TabsContent value="justificatifs">
            <JustificatifsSection eleveId={eleve.id} />
          </TabsContent>

          {/* Tickets */}
          <TabsContent value="tickets">
            <TicketsSection eleveId={eleve.id} userId={user.id} />
          </TabsContent>

          {/* Profil */}
          <TabsContent value="profil">
            <ProfilSection eleve={eleve} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
