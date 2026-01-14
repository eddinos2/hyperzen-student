import { AppLayout } from '@/components/layout/AppLayout';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, FileText, Calendar, AlertTriangle, Download, Edit, Settings, Trash2, AlertCircle, Home, ChevronRight } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { SoldeCard } from '@/components/eleves/SoldeCard';
import { RisqueScore } from '@/components/finance/RisqueScore';
import { GenerateurEcheances } from '@/components/echeances/GenerateurEcheances';
import { calculerSoldeDossier, formaterMontant, formaterDate } from '@/lib/calculs';
import { ModifierEleveDialogEnrichi as ModifierEleveDialog } from '@/components/eleves/ModifierEleveDialogEnrichi';
import { ModifierDossierDialog } from '@/components/dossiers/ModifierDossierDialog';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function EleveDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showEditDossierDialog, setShowEditDossierDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: allData, refetch: refetchAll } = useQuery({
    queryKey: ['eleve-details', id],
    queryFn: async () => {
      // Requêtes parallèles pour optimiser le chargement
      const [eleveResult, reglementsResult, echeancesResult, anomaliesResult] = await Promise.all([
        supabase
          .from('eleves')
          .select(`
            id, nom, prenom, email, telephone, immatriculation, statut_inscription,
            dossiers_scolarite (
              id, tarif_scolarite, impaye_anterieur, statut_dossier, rythme, commentaire,
              campus (nom),
              filieres (nom),
              annees_scolaires (libelle)
            )
          `)
          .eq('id', id)
          .single(),
        
        // Récupérer tous les règlements en même temps (on les filtrera après)
        supabase
          .from('reglements')
          .select('id, montant, moyen_paiement, date_reglement, dossier_id')
          .order('date_reglement', { ascending: false }),
        
        // Récupérer toutes les échéances en même temps (on les filtrera après)
        supabase
          .from('echeances')
          .select('id, montant, date_echeance, statut, dossier_id')
          .order('date_echeance', { ascending: true }),
        
        // Récupérer toutes les anomalies
        supabase
          .from('anomalies')
          .select('*')
          .eq('statut', 'ouverte')
          .order('created_at', { ascending: false }),
      ]);

      if (eleveResult.error) throw eleveResult.error;
      
      const eleve = eleveResult.data;
      const dossierId = eleve?.dossiers_scolarite?.[0]?.id;
      
      // Filtrer les règlements et échéances pour ce dossier
      const reglements = dossierId 
        ? (reglementsResult.data || []).filter(r => r.dossier_id === dossierId)
        : [];
      
      const echeances = dossierId
        ? (echeancesResult.data || []).filter(e => e.dossier_id === dossierId)
        : [];
      
      const anomalies = dossierId
        ? (anomaliesResult.data || []).filter(a => a.dossier_id === dossierId)
        : [];
      
      // Calculer le solde en parallèle si on a un dossier
      const solde = dossierId ? await calculerSoldeDossier(dossierId) : null;

      return {
        eleve,
        reglements,
        echeances,
        anomalies,
        solde,
      };
    },
  });

  const eleve = allData?.eleve;
  const dossier = eleve?.dossiers_scolarite?.[0];
  const solde = allData?.solde;
  const reglements = allData?.reglements;
  const echeances = allData?.echeances;
  const anomalies = allData?.anomalies;

  const refetchEleve = refetchAll;
  const refetchSolde = refetchAll;
  const refetchEcheances = refetchAll;

  const handleSupprimerEleve = async () => {
    if (!id) return;

    setIsDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('supprimer-eleve-complet', {
        body: { eleveId: id },
      });

      if (error) throw error;

      toast({
        title: 'Élève supprimé',
        description: data.compteAuthSupprime 
          ? 'Élève et compte utilisateur supprimés complètement'
          : 'Élève supprimé (pas de compte utilisateur)',
      });

      navigate('/eleves');
    } catch (error: any) {
      console.error('Erreur suppression:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de supprimer l\'élève',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!eleve) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto text-center py-20">
          <div className="text-6xl mb-4">⏳</div>
          <p className="text-2xl font-black">CHARGEMENT...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumbs */}
        <div className="mb-6">
          <Breadcrumb>
            <BreadcrumbList className="text-base sm:text-lg">
              <BreadcrumbItem>
                <BreadcrumbLink 
                  onClick={() => navigate('/')}
                  className="flex items-center gap-2 font-bold hover:text-primary cursor-pointer"
                >
                  <Home className="w-4 h-4" />
                  Accueil
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="w-5 h-5" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbLink 
                  onClick={() => navigate('/eleves')}
                  className="font-bold hover:text-primary cursor-pointer"
                >
                  Élèves
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="w-5 h-5" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbPage className="font-black">
                  {eleve.nom} {eleve.prenom}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-6xl font-black mb-2">
                {eleve.nom} {eleve.prenom}
              </h1>
              <p className="text-2xl font-bold text-muted-foreground">{eleve.email}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowEditDialog(true)}
                className="brutal-button bg-cyan-400 text-black flex items-center gap-2"
              >
                <Edit className="w-5 h-5" />
                MODIFIER
              </button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    className="brutal-button bg-red-500 text-white flex items-center gap-2"
                  >
                    <Trash2 className="w-5 h-5" />
                    SUPPRIMER
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent className="brutal-card">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-2xl font-black">
                      Supprimer l'élève ?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-base font-bold">
                      Cette action va supprimer définitivement :
                      <ul className="mt-2 space-y-1 list-disc list-inside">
                        <li>L'élève et toutes ses informations</li>
                        <li>Tous ses dossiers de scolarité</li>
                        <li>Tous les règlements associés</li>
                        <li>Toutes les échéances</li>
                        <li>Son compte utilisateur (s'il existe)</li>
                      </ul>
                      <p className="mt-3 text-red-600 font-black">
                        ⚠️ Cette action est irréversible !
                      </p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="brutal-button bg-white">
                      Annuler
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleSupprimerEleve}
                      disabled={isDeleting}
                      className="brutal-button bg-red-500 text-white"
                    >
                      {isDeleting ? 'Suppression...' : 'Supprimer définitivement'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>

        {/* Alertes anomalies */}
        {anomalies && anomalies.length > 0 && (
          <div className="brutal-card p-6 mb-6 bg-gradient-to-br from-red-100 to-red-50 border-2 border-red-500">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-8 h-8 text-red-600 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-2xl font-black mb-3 text-red-900">⚠️ ANOMALIES DÉTECTÉES</h3>
                <div className="space-y-3">
                  {anomalies.map((anomalie: any) => (
                    <div key={anomalie.id} className="p-4 bg-white rounded-xl border-2 border-black">
                      <p className="font-black text-lg mb-1">{anomalie.description}</p>
                      {anomalie.action_proposee && (
                        <p className="text-sm font-bold text-muted-foreground">
                          → {anomalie.action_proposee}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {solde && <SoldeCard solde={solde} />}
          
          {dossier?.id && (
            <div className="lg:col-span-2">
              <RisqueScore dossierId={dossier.id} />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="brutal-card bg-gradient-to-br from-cyan-100 to-cyan-50 p-8">
            <h3 className="text-2xl font-black mb-4">INFORMATIONS</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-bold opacity-70 uppercase">Campus</p>
                <p className="text-xl font-black">{dossier?.campus?.nom || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-bold opacity-70 uppercase">Filière</p>
                <p className="text-xl font-black">{dossier?.filieres?.nom || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-bold opacity-70 uppercase">Année</p>
                <p className="text-xl font-black">{dossier?.annees_scolaires?.libelle || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-bold opacity-70 uppercase">Rythme</p>
                <p className="text-xl font-black">{dossier?.rythme || '-'}</p>
              </div>
            </div>
          </div>

          <div className="brutal-card bg-gradient-to-br from-pink-100 to-pink-50 p-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-black">SCOLARITÉ</h3>
              <Button
                onClick={() => setShowEditDossierDialog(true)}
                size="sm"
                className="brutal-button bg-white text-black h-10 px-4"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-bold opacity-70 uppercase">Tarif</p>
                <p className="text-3xl font-black">{formaterMontant(dossier?.tarif_scolarite || 0)}</p>
              </div>
              <div>
                <p className="text-sm font-bold opacity-70 uppercase">
                  {(dossier?.impaye_anterieur || 0) < 0 ? 'Crédit antérieur' : 'Impayé antérieur'}
                </p>
                <p className={`text-2xl font-black ${
                  (dossier?.impaye_anterieur || 0) < 0 ? 'text-green-600' : 
                  (dossier?.impaye_anterieur || 0) > 0 ? 'text-red-600' : ''
                }`}>
                  {formaterMontant(Math.abs(dossier?.impaye_anterieur || 0))}
                  {(dossier?.impaye_anterieur || 0) < 0 && ' (en sa faveur)'}
                </p>
              </div>
              <div>
                <p className="text-sm font-bold opacity-70 uppercase">Statut</p>
                <span className="inline-block px-4 py-2 rounded-xl border-2 border-black font-black text-sm bg-white mt-2">
                  {eleve.statut_inscription || 'INCONNU'}
                </span>
              </div>
              {dossier?.commentaire && (
                <div>
                  <p className="text-sm font-bold opacity-70 uppercase">Commentaire</p>
                  <p className="text-base font-medium mt-2 p-3 bg-white border-2 border-black rounded-lg">
                    {dossier.commentaire}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="brutal-card p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-black flex items-center gap-3">
                  <FileText className="w-8 h-8" />
                  RÈGLEMENTS
                </h2>
                <span className="px-4 py-2 rounded-xl border-2 border-black font-black text-lg bg-primary">
                  {reglements?.length || 0}
                </span>
              </div>

              {!reglements || reglements.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">💰</div>
                  <p className="text-xl font-black">AUCUN RÈGLEMENT</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reglements.map((reglement) => (
                    <div
                      key={reglement.id}
                      className="p-4 bg-muted rounded-2xl border-2 border-black hover:bg-yellow-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-lg font-black">{formaterMontant(reglement.montant)}</p>
                          <p className="text-sm font-bold text-muted-foreground">
                            {reglement.moyen_paiement} • {formaterDate(reglement.date_reglement)}
                          </p>
                        </div>
                        <button className="p-2 rounded-xl border-2 border-black hover:bg-black hover:text-white transition-colors">
                          <Download className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {dossier && (!echeances || echeances.length === 0) && (
              <GenerateurEcheances
                dossierId={dossier.id}
                onSuccess={() => refetchEcheances()}
              />
            )}
          </div>

          <div className="brutal-card p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-black flex items-center gap-3">
                <Calendar className="w-8 h-8" />
                ÉCHÉANCES
              </h2>
              <span className="px-4 py-2 rounded-xl border-2 border-black font-black text-lg bg-secondary">
                {echeances?.length || 0}
              </span>
            </div>

            {!echeances || echeances.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📅</div>
                <p className="text-xl font-black">AUCUNE ÉCHÉANCE</p>
                <p className="text-sm font-bold text-muted-foreground mt-2">
                  Utilisez le générateur ci-contre
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {echeances.map((echeance) => (
                  <div
                    key={echeance.id}
                    className={`p-4 rounded-2xl border-2 border-black ${
                      echeance.statut === 'payee' ? 'bg-green-100' :
                      echeance.statut === 'en_retard' ? 'bg-red-100' :
                      'bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg font-black">{formaterMontant(echeance.montant)}</p>
                        <p className="text-sm font-bold text-muted-foreground">
                          {formaterDate(echeance.date_echeance)}
                        </p>
                      </div>
                      <span className={`px-4 py-2 rounded-xl border-2 border-black font-black text-xs ${
                        echeance.statut === 'payee' ? 'bg-green-400' :
                        echeance.statut === 'en_retard' ? 'bg-red-400' :
                        'bg-yellow-200'
                      }`}>
                        {echeance.statut.toUpperCase().replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showEditDialog && (
        <ModifierEleveDialog
          eleve={eleve}
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          onSuccess={() => refetchEleve()}
        />
      )}

      {showEditDossierDialog && dossier && (
        <ModifierDossierDialog
          dossier={dossier}
          open={showEditDossierDialog}
          onOpenChange={setShowEditDossierDialog}
          onSuccess={() => {
            refetchEleve();
            refetchSolde();
          }}
        />
      )}
    </AppLayout>
  );
}
