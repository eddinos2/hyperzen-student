import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Users, TrendingUp, AlertTriangle } from 'lucide-react';
import { formaterMontant } from '@/lib/calculs';

interface TableauMigrationProps {
  anneeCourante: string;
  anneeSuivante: string;
}

export function TableauMigration({ anneeCourante, anneeSuivante }: TableauMigrationProps) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['migration-stats', anneeCourante],
    queryFn: async () => {
      // Récupérer tous les élèves actifs avec leurs dossiers
      const { data: eleves } = await supabase
        .from('eleves')
        .select(`
          id,
          nom,
          prenom,
          statut_inscription,
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

      if (!eleves) return null;

      // Classifier par année d'étude
      const eleves1A = eleves.filter(e => {
        const dossier = (e.dossiers_scolarite as any)?.[0];
        return dossier?.annees_scolaires?.ordre === 1;
      });

      const eleves2A = eleves.filter(e => {
        const dossier = (e.dossiers_scolarite as any)?.[0];
        return dossier?.annees_scolaires?.ordre === 2;
      });

      // Calculer les impayés
      let totalImpayesReportes = 0;
      for (const eleve of eleves1A) {
        const dossier = (eleve.dossiers_scolarite as any)?.[0];
        if (dossier) {
          const { data: solde } = await supabase
            .rpc('calculer_solde_dossier', { dossier_uuid: dossier.id });
          if (solde?.[0]?.reste_a_payer > 0) {
            totalImpayesReportes += solde[0].reste_a_payer;
          }
        }
      }

      return {
        eleves1A: eleves1A.length,
        eleves2A: eleves2A.length,
        totalEleves: eleves.length,
        impayesReportes: totalImpayesReportes
      };
    }
  });

  if (isLoading) {
    return (
      <div className="brutal-card p-8 text-center">
        <div className="text-4xl mb-4 animate-pulse">📊</div>
        <p className="font-bold">Analyse en cours...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="brutal-card p-8 bg-gradient-to-br from-yellow-50 to-white">
        <h2 className="text-3xl font-black mb-6">📊 ANALYSE - ANNÉE {anneeCourante}</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 1ère année */}
          <div className="brutal-card p-6 bg-white border-4 border-cyan-400">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-8 h-8 text-cyan-600" />
              <h3 className="text-2xl font-black">ÉLÈVES 1A</h3>
            </div>
            <p className="text-5xl font-black mb-4">{stats?.eleves1A || 0}</p>
            <div className="space-y-2 text-sm font-bold">
              <p className="flex items-center justify-between">
                <span>→ À faire passer en 2ème année</span>
                <span className="px-3 py-1 bg-green-200 rounded-xl border-2 border-black">
                  {stats?.eleves1A || 0}
                </span>
              </p>
            </div>
          </div>

          {/* 2ème année */}
          <div className="brutal-card p-6 bg-white border-4 border-green-400">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="w-8 h-8 text-green-600" />
              <h3 className="text-2xl font-black">ÉLÈVES 2A</h3>
            </div>
            <p className="text-5xl font-black mb-4">{stats?.eleves2A || 0}</p>
            <div className="space-y-2 text-sm font-bold">
              <p className="flex items-center justify-between">
                <span>🎓 À diplômer (clôturer)</span>
                <span className="px-3 py-1 bg-purple-200 rounded-xl border-2 border-black">
                  {stats?.eleves2A || 0}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Impayés */}
        {stats && stats.impayesReportes > 0 && (
          <div className="mt-6 brutal-card p-6 bg-red-50 border-4 border-red-400">
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <h3 className="text-xl font-black">IMPAYÉS À REPORTER</h3>
            </div>
            <p className="text-3xl font-black text-red-600">
              {formaterMontant(stats.impayesReportes)}
            </p>
            <p className="text-sm font-bold text-muted-foreground mt-2">
              Ces montants seront automatiquement reportés dans les nouveaux dossiers {anneeSuivante}
            </p>
          </div>
        )}
      </div>

      {/* Récapitulatif total */}
      <div className="brutal-card p-6 bg-gradient-to-br from-purple-50 to-white">
        <h3 className="text-2xl font-black mb-4">RÉCAPITULATIF</h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center font-bold">
            <span>Total élèves actifs {anneeCourante}</span>
            <span className="text-2xl font-black">{stats?.totalEleves || 0}</span>
          </div>
          <div className="flex justify-between items-center font-bold text-green-600">
            <span>→ Nouveaux dossiers {anneeSuivante} à créer</span>
            <span className="text-2xl font-black">{stats?.eleves1A || 0}</span>
          </div>
          <div className="flex justify-between items-center font-bold text-purple-600">
            <span>→ Diplômés à clôturer</span>
            <span className="text-2xl font-black">{stats?.eleves2A || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
