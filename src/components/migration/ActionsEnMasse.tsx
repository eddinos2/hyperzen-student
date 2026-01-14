import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useClotureEleve } from '@/hooks/useClotureEleve';
import { GraduationCap, ArrowRight, AlertTriangle } from 'lucide-react';
import { EtapeMigration } from '@/pages/MigrationAnnee';

interface ActionsEnMasseProps {
  anneeCourante: string;
  anneeSuivante: string;
  onEtapeChange: (etape: EtapeMigration) => void;
}

export function ActionsEnMasse({ anneeCourante, anneeSuivante, onEtapeChange }: ActionsEnMasseProps) {
  const { toast } = useToast();
  const { cloturerDossier } = useClotureEleve();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  // Récupérer les paramètres de tarif
  const { data: parametres } = useQuery({
    queryKey: ['parametres-migration'],
    queryFn: async () => {
      const { data } = await supabase
        .from('parametres_globaux')
        .select('*')
        .in('cle', ['tarif_2025_2026_2A', 'tarif_2025_2026_1A']);
      
      const params: Record<string, number> = {};
      data?.forEach(p => {
        params[p.cle] = Number(p.valeur) || 8500;
      });
      return params;
    }
  });

  const cloturerDiplomes = useMutation({
    mutationFn: async () => {
      setLoading(true);
      
      // Récupérer tous les élèves de 2A
      const { data: eleves } = await supabase
        .from('eleves')
        .select(`
          id,
          nom,
          prenom,
          dossiers_scolarite!inner (
            id,
            annee_scolaire,
            annee_id,
            statut_dossier,
            annees_scolaires (libelle, ordre)
          )
        `)
        .eq('dossiers_scolarite.annee_scolaire', anneeCourante)
        .eq('dossiers_scolarite.statut_dossier', 'en_cours')
        .in('statut_inscription', ['Inscrit', 'Redoublant']);

      if (!eleves) return { total: 0, success: 0, errors: 0 };

      const eleves2A = eleves.filter(e => {
        const dossier = (e.dossiers_scolarite as any)?.[0];
        return dossier?.annees_scolaires?.ordre === 2;
      });

      let success = 0;
      for (const eleve of eleves2A) {
        try {
          // Marquer comme diplômé
          await supabase
            .from('eleves')
            .update({ statut_inscription: 'Diplômé' })
            .eq('id', eleve.id);
          
          // Clôturer le dossier
          await cloturerDossier(eleve.id, 'Diplômé');
          success++;
        } catch (error) {
          console.error(`Erreur pour ${eleve.nom}:`, error);
        }
      }

      return { total: eleves2A.length, success, errors: eleves2A.length - success };
    },
    onSuccess: (result) => {
      toast({
        title: '🎓 Diplômés clôturés',
        description: `${result.success}/${result.total} élèves diplômés avec succès`
      });
      queryClient.invalidateQueries({ queryKey: ['migration-stats'] });
      setLoading(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive'
      });
      setLoading(false);
    }
  });

  const creerDossiers2025 = useMutation({
    mutationFn: async () => {
      setLoading(true);
      
      // Récupérer tous les élèves de 1A
      const { data: eleves } = await supabase
        .from('eleves')
        .select(`
          id,
          nom,
          prenom,
          dossiers_scolarite!inner (
            id,
            campus_id,
            filiere_id,
            annee_id,
            annee_scolaire,
            rythme,
            statut_dossier,
            annees_scolaires (libelle, ordre)
          )
        `)
        .eq('dossiers_scolarite.annee_scolaire', anneeCourante)
        .eq('dossiers_scolarite.statut_dossier', 'en_cours')
        .in('statut_inscription', ['Inscrit', 'Redoublant']);

      if (!eleves) return { total: 0, success: 0, errors: 0 };

      const eleves1A = eleves.filter(e => {
        const dossier = (e.dossiers_scolarite as any)?.[0];
        return dossier?.annees_scolaires?.ordre === 1;
      });

      // Récupérer l'ID de "2ème année"
      const { data: annee2A } = await supabase
        .from('annees_scolaires')
        .select('id')
        .eq('ordre', 2)
        .single();

      let success = 0;
      for (const eleve of eleves1A) {
        try {
          const ancienDossier = (eleve.dossiers_scolarite as any)?.[0];
          if (!ancienDossier) continue;

          // 1. Clôturer l'ancien dossier
          await supabase
            .from('dossiers_scolarite')
            .update({ statut_dossier: 'termine' })
            .eq('id', ancienDossier.id);

          // 2. Calculer l'impayé à reporter
          const { data: solde } = await supabase
            .rpc('calculer_solde_dossier', { dossier_uuid: ancienDossier.id });
          
          const impayeAReporter = Math.max(0, solde?.[0]?.reste_a_payer || 0);

          // 3. Créer le nouveau dossier 2025-2026
          const tarifNouveau = parametres?.['tarif_2025_2026_2A'] || 8500;
          
          await supabase
            .from('dossiers_scolarite')
            .insert({
              eleve_id: eleve.id,
              annee_scolaire: anneeSuivante,
              campus_id: ancienDossier.campus_id,
              filiere_id: ancienDossier.filiere_id,
              annee_id: annee2A?.id,
              tarif_scolarite: tarifNouveau,
              impaye_anterieur: impayeAReporter,
              rythme: ancienDossier.rythme,
              statut_dossier: 'en_cours',
              commentaire: `Dossier créé automatiquement lors de la migration ${anneeCourante} → ${anneeSuivante}${
                impayeAReporter > 0 ? `\nImpayé reporté: ${Math.round(impayeAReporter)}€` : ''
              }`
            });

          success++;
        } catch (error) {
          console.error(`Erreur pour ${eleve.nom}:`, error);
        }
      }

      return { total: eleves1A.length, success, errors: eleves1A.length - success };
    },
    onSuccess: (result) => {
      toast({
        title: '📚 Dossiers créés',
        description: `${result.success}/${result.total} dossiers ${anneeSuivante} créés avec succès`
      });
      queryClient.invalidateQueries({ queryKey: ['migration-stats'] });
      setLoading(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive'
      });
      setLoading(false);
    }
  });

  return (
    <div className="brutal-card p-8 bg-gradient-to-br from-orange-50 to-white">
      <h2 className="text-3xl font-black mb-6">⚡ ACTIONS DE MIGRATION</h2>

      <div className="space-y-4">
        {/* Action 1: Clôturer les diplômés */}
        <div className="brutal-card p-6 bg-white">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <GraduationCap className="w-6 h-6 text-purple-600" />
                <h3 className="text-xl font-black">1. CLÔTURER LES DIPLÔMÉS (2A)</h3>
              </div>
              <p className="text-sm font-bold text-muted-foreground mb-4">
                Marque tous les élèves de 2ème année comme "Diplômé" et clôture leurs dossiers.
                Les échéances futures seront annulées automatiquement.
              </p>
              <ul className="text-sm font-bold space-y-1 mb-4">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                  Statut élève → "Diplômé"
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                  Statut dossier → "Terminé"
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                  Échéances futures annulées
                </li>
              </ul>
            </div>
            <button
              onClick={() => cloturerDiplomes.mutate()}
              disabled={loading}
              className="brutal-button bg-purple-400 hover:bg-purple-500 whitespace-nowrap"
            >
              {loading ? 'EN COURS...' : 'EXÉCUTER'}
            </button>
          </div>
        </div>

        {/* Action 2: Créer les dossiers 2025-2026 */}
        <div className="brutal-card p-6 bg-white">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <ArrowRight className="w-6 h-6 text-cyan-600" />
                <h3 className="text-xl font-black">2. CRÉER DOSSIERS {anneeSuivante} (1A → 2A)</h3>
              </div>
              <p className="text-sm font-bold text-muted-foreground mb-4">
                Clôture les dossiers {anneeCourante} des 1A et crée automatiquement leurs nouveaux
                dossiers {anneeSuivante} en 2ème année. Les impayés sont reportés.
              </p>
              <ul className="text-sm font-bold space-y-1 mb-4">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-cyan-500 rounded-full" />
                  Ancien dossier → "Terminé"
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-cyan-500 rounded-full" />
                  Nouveau dossier → Année suivante + 2ème année
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-cyan-500 rounded-full" />
                  Tarif: {parametres?.['tarif_2025_2026_2A'] || 8500}€
                </li>
              </ul>
            </div>
            <button
              onClick={() => creerDossiers2025.mutate()}
              disabled={loading}
              className="brutal-button bg-cyan-400 hover:bg-cyan-500 whitespace-nowrap"
            >
              {loading ? 'EN COURS...' : 'EXÉCUTER'}
            </button>
          </div>
        </div>

        {/* Avertissement */}
        <div className="brutal-card p-4 bg-red-50 border-4 border-red-400">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm font-bold">
              <p className="font-black mb-1">⚠️ ATTENTION</p>
              <p>Ces actions sont irréversibles. Assurez-vous d'avoir une sauvegarde de la base de données avant d'exécuter.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
