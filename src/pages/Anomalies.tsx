import { AppLayout } from '@/components/layout/AppLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, CheckCircle, X, Info, Download, Users, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { exportAnomaliestoCSV } from '@/lib/export-utils';
import { Button } from '@/components/ui/button';

export default function Anomalies() {
  const [filtreSeverite, setFiltreSeverite] = useState<string>('all');
  const [filtreStatut, setFiltreStatut] = useState<string>('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: anomalies, refetch } = useQuery({
    queryKey: ['anomalies', filtreSeverite, filtreStatut],
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    queryFn: async () => {
      let query = supabase
        .from('anomalies')
        .select(`
          *,
          dossiers_scolarite (
            eleve_id,
            eleves (nom, prenom, email)
          )
        `)
        .order('created_at', { ascending: false });

      if (filtreSeverite !== 'all') {
        query = query.eq('severite', filtreSeverite);
      }
      
      if (filtreStatut !== 'all') {
        query = query.eq('statut', filtreStatut);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const detecterDoublons = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('detecter_doublons_eleves');
      if (error) throw error;
      return data;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['anomalies'] });
      toast({
        title: 'Détection terminée',
        description: `${count} doublon(s) potentiel(s) détecté(s)`,
      });
    },
    onError: () => {
      toast({
        title: 'Erreur',
        description: 'Impossible de détecter les doublons',
        variant: 'destructive',
      });
    },
  });

  const resoudreAnomalie = async (id: string) => {
    const { error } = await supabase
      .from('anomalies')
      .update({ statut: 'resolue', resolved_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de résoudre l\'anomalie',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Anomalie résolue',
        description: 'L\'anomalie a été marquée comme résolue',
      });
      refetch();
    }
  };

  const ignorerAnomalie = async (id: string) => {
    const { error } = await supabase
      .from('anomalies')
      .update({ statut: 'ignoree' })
      .eq('id', id);

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'ignorer l\'anomalie',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Anomalie ignorée',
        description: 'L\'anomalie a été marquée comme ignorée',
      });
      refetch();
    }
  };

  const getSeveriteColor = (severite: string) => {
    switch (severite) {
      case 'critique': return 'bg-red-200 border-red-600';
      case 'alerte': return 'bg-yellow-200 border-yellow-600';
      case 'info': return 'bg-blue-200 border-blue-600';
      default: return 'bg-gray-200 border-gray-600';
    }
  };

  const getSeveriteIcon = (severite: string) => {
    switch (severite) {
      case 'critique': return <AlertTriangle className="w-6 h-6 text-red-600" />;
      case 'alerte': return <AlertTriangle className="w-6 h-6 text-yellow-600" />;
      case 'info': return <Info className="w-6 h-6 text-blue-600" />;
      default: return <Info className="w-6 h-6" />;
    }
  };

  const handleExport = () => {
    if (!anomalies || anomalies.length === 0) {
      toast({
        title: 'Aucune donnée',
        description: 'Il n\'y a aucune anomalie à exporter',
        variant: 'destructive',
      });
      return;
    }
    exportAnomaliestoCSV(anomalies);
    toast({
      title: 'Export réussi',
      description: `${anomalies.length} anomalie(s) exportée(s)`,
    });
  };

  const nbCritiques = anomalies?.filter(a => a.severite === 'critique' && a.statut === 'ouverte').length || 0;
  const nbAlertes = anomalies?.filter(a => a.severite === 'alerte' && a.statut === 'ouverte').length || 0;
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
<div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-4xl sm:text-6xl font-black mb-2">ALERTES & SURVEILLANCE</h1>
            <p className="text-lg sm:text-2xl font-bold text-muted-foreground">Détection intelligente des incohérences et doublons</p>
          </div>
          <div className="flex gap-3 sm:gap-4 flex-wrap">
            <div className="brutal-card p-3 sm:p-4 bg-gradient-to-br from-red-100 to-red-50">
              <p className="text-xs sm:text-sm font-bold uppercase">Critiques</p>
              <p className="text-2xl sm:text-4xl font-black">{nbCritiques}</p>
            </div>
            <div className="brutal-card p-3 sm:p-4 bg-gradient-to-br from-yellow-100 to-yellow-50">
              <p className="text-xs sm:text-sm font-bold uppercase">Alertes</p>
              <p className="text-2xl sm:text-4xl font-black">{nbAlertes}</p>
            </div>
            <Button
              onClick={() => detecterDoublons.mutate()}
              disabled={detecterDoublons.isPending}
              className="brutal-button bg-purple-500 flex items-center gap-2 h-fit"
            >
              <Users className="w-5 h-5" />
              <span className="hidden sm:inline">DOUBLONS</span>
            </Button>
            <button 
              onClick={handleExport}
              className="brutal-button bg-secondary text-secondary-foreground flex items-center gap-2 h-fit"
            >
              <Download className="w-5 h-5" />
              <span className="hidden sm:inline">EXPORTER</span>
            </button>
          </div>
        </div>

        <div className="brutal-card p-6 mb-6">
          <div className="flex gap-4">
            <div>
              <label className="block text-sm font-black uppercase mb-2">Sévérité</label>
              <select
                value={filtreSeverite}
                onChange={(e) => setFiltreSeverite(e.target.value)}
                className="h-12 px-6 border-4 border-black rounded-2xl font-bold text-lg"
              >
                <option value="all">Toutes</option>
                <option value="critique">Critiques</option>
                <option value="alerte">Alertes</option>
                <option value="info">Info</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-black uppercase mb-2">Statut</label>
              <select
                value={filtreStatut}
                onChange={(e) => setFiltreStatut(e.target.value)}
                className="h-12 px-6 border-4 border-black rounded-2xl font-bold text-lg"
              >
                <option value="all">Tous</option>
                <option value="ouverte">Ouvertes</option>
                <option value="en_cours">En cours</option>
                <option value="resolue">Résolues</option>
                <option value="ignoree">Ignorées</option>
              </select>
            </div>
          </div>
        </div>

        {!anomalies || anomalies.length === 0 ? (
          <div className="brutal-card p-12 text-center bg-gradient-to-br from-green-100 to-green-50">
            <div className="text-6xl mb-4">✅</div>
            <p className="text-3xl font-black mb-2">AUCUNE ANOMALIE</p>
            <p className="text-xl font-bold text-muted-foreground">Toutes les données sont cohérentes</p>
          </div>
        ) : (
          <div className="space-y-4">
            {anomalies.map((anomalie) => (
              <div
                key={anomalie.id}
                className={`brutal-card p-6 ${getSeveriteColor(anomalie.severite)}`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    {getSeveriteIcon(anomalie.severite)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-2xl font-black mb-1">{anomalie.description}</h3>
                        {anomalie.dossiers_scolarite?.eleves && (
                          <p className="text-lg font-bold text-muted-foreground">
                            {(anomalie.dossiers_scolarite.eleves as any).nom} {(anomalie.dossiers_scolarite.eleves as any).prenom}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <span className="px-4 py-2 rounded-xl border-2 border-black font-black text-sm bg-white uppercase">
                          {anomalie.type_anomalie.replace('_', ' ')}
                        </span>
                        <span className="px-4 py-2 rounded-xl border-2 border-black font-black text-sm bg-white uppercase">
                          {anomalie.statut}
                        </span>
                      </div>
                    </div>

                    {anomalie.details && (
                      <div className="mb-4 p-4 bg-white/50 rounded-xl border-2 border-black">
                        <pre className="text-sm font-mono">
                          {JSON.stringify(anomalie.details, null, 2)}
                        </pre>
                      </div>
                    )}

                    {anomalie.action_proposee && (
                      <div className="mb-4 p-4 bg-cyan-100 rounded-xl border-2 border-black">
                        <p className="font-bold">💡 Action proposée:</p>
                        <p className="font-medium">{anomalie.action_proposee}</p>
                      </div>
                    )}

                    {anomalie.statut === 'ouverte' && (
                      <div className="flex gap-3 mt-4">
                        <button
                          onClick={() => resoudreAnomalie(anomalie.id)}
                          className="brutal-button bg-green-400 text-black h-12 px-6 flex items-center gap-2"
                        >
                          <CheckCircle className="w-5 h-5" />
                          RÉSOUDRE
                        </button>
                        <button
                          onClick={() => ignorerAnomalie(anomalie.id)}
                          className="brutal-button bg-white text-black h-12 px-6 flex items-center gap-2"
                        >
                          <X className="w-5 h-5" />
                          IGNORER
                        </button>
                      </div>
                    )}

                    {anomalie.resolved_at && (
                      <p className="text-sm font-bold text-muted-foreground mt-4">
                        Résolue le {new Date(anomalie.resolved_at).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
    </AppLayout>
  );
}
