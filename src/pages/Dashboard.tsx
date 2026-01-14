import { AppLayout } from '@/components/layout/AppLayout';
import { StatsCard } from '@/components/ui/StatsCard';
import { Euro, Users, AlertTriangle, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formaterMontant, formaterNombre } from '@/lib/calculs';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('stats_dashboard');
      if (error) throw error;
      
      // Calculer le total attendu (somme de tous les tarifs + impayés)
      const { data: dossiersData } = await supabase
        .from('dossiers_scolarite')
        .select('tarif_scolarite, impaye_anterieur');
      
      const total_attendu = dossiersData?.reduce((sum, d) => 
        sum + Number(d.tarif_scolarite) + Number(d.impaye_anterieur || 0), 0) || 0;
      
      return {
        ...(data?.[0] || {
          nb_eleves: 0,
          total_encaissements: 0,
          nb_anomalies_ouvertes: 0,
          nb_reglements: 0,
          nb_echeances_retard: 0,
          taux_couverture: 0,
        }),
        total_attendu,
        reste_a_encaisser: total_attendu - (data?.[0]?.total_encaissements || 0),
      };
    },
  });

  const { data: recentReglements } = useQuery({
    queryKey: ['recent-reglements'],
    queryFn: async () => {
      const { data } = await supabase
        .from('reglements')
        .select(`
          id, montant, moyen_paiement, date_reglement,
          dossiers_scolarite (
            eleves (nom, prenom)
          )
        `)
        .eq('statut', 'valide')
        .order('created_at', { ascending: false })
        .limit(5);
      return data;
    },
  });

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl lg:text-6xl font-black mb-2 sm:mb-4">TABLEAU DE BORD</h1>
          <p className="text-base sm:text-xl lg:text-2xl font-bold text-muted-foreground">Vue d'ensemble de la gestion des paiements</p>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          <StatsCard
            title="Élèves"
            value={formaterNombre(stats?.nb_eleves || 0)}
            icon={Users}
            color="cyan"
            onClick={() => navigate('/eleves')}
          />
          <StatsCard
            title="Total Attendu"
            value={formaterMontant(stats?.total_attendu || 0)}
            icon={Euro}
            color="cyan"
            onClick={() => navigate('/reglements')}
          />
          <StatsCard
            title="Total Encaissé"
            value={formaterMontant(stats?.total_encaissements || 0)}
            icon={Euro}
            color="green"
            onClick={() => navigate('/reglements')}
          />
          <StatsCard
            title="Reste à Encaisser"
            value={formaterMontant(stats?.reste_a_encaisser || 0)}
            icon={Euro}
            color="red"
            onClick={() => navigate('/retards')}
          />
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          <StatsCard
            title="Anomalies"
            value={formaterNombre(stats?.nb_anomalies_ouvertes || 0)}
            icon={AlertTriangle}
            color="red"
            onClick={() => navigate('/anomalies')}
          />
          <StatsCard
            title="Taux de couverture"
            value={`${stats?.taux_couverture || 0}%`}
            icon={TrendingUp}
            color="yellow"
            onClick={() => navigate('/rapports')}
          />
          <StatsCard
            title="Échéances en retard"
            value={formaterNombre(stats?.nb_echeances_retard || 0)}
            icon={AlertTriangle}
            color="red"
            onClick={() => navigate('/retards')}
          />
        </div>

        <div className="brutal-card p-4 sm:p-8 bg-gradient-to-br from-yellow-100 to-yellow-50 mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-black mb-3 sm:mb-4">RÈGLEMENTS</h2>
          <div className="space-y-3 sm:space-y-4">
            <div>
              <p className="text-xs sm:text-sm font-bold uppercase">Total règlements</p>
              <p className="text-3xl sm:text-4xl lg:text-5xl font-black">{formaterNombre(stats?.nb_reglements || 0)}</p>
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold uppercase">Montant total</p>
              <p className="text-xl sm:text-2xl lg:text-3xl font-black">
                {formaterMontant(stats?.total_encaissements || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="brutal-card p-4 sm:p-8">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black mb-4 sm:mb-6">ACTIVITÉ RÉCENTE</h2>
          <div className="space-y-3 sm:space-y-4">
            {!recentReglements || recentReglements.length === 0 ? (
              <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-muted rounded-xl sm:rounded-2xl border-2 border-black">
                <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-green-500 flex-shrink-0" />
                <span className="font-bold text-sm sm:text-base">Système prêt - Aucune donnée importée</span>
              </div>
            ) : (
              recentReglements.map((reglement) => {
                const eleve = (reglement.dossiers_scolarite?.eleves as any);
                return (
                  <div
                    key={reglement.id}
                    className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-muted rounded-xl sm:rounded-2xl border-2 border-black hover:bg-green-100 transition-colors"
                  >
                    <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-green-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm sm:text-base truncate">
                        Règlement de {formaterMontant(reglement.montant)} - {eleve?.nom} {eleve?.prenom}
                      </p>
                      <p className="text-xs sm:text-sm font-bold text-muted-foreground">
                        {reglement.moyen_paiement} • {new Date(reglement.date_reglement).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
