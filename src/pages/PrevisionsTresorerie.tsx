import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, RefreshCw, Calendar } from 'lucide-react';
import { format, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function PrevisionsTresorerie() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dateDebut] = useState(startOfMonth(new Date()));
  const [dateFin] = useState(endOfMonth(addMonths(new Date(), 3)));

  // Récupérer les prévisions
  const { data: previsions, isLoading } = useQuery({
    queryKey: ['previsions-tresorerie', dateDebut, dateFin],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('previsions_tresorerie')
        .select('*')
        .gte('date_prevision', dateDebut.toISOString().split('T')[0])
        .lte('date_prevision', dateFin.toISOString().split('T')[0])
        .order('date_prevision');

      if (error) throw error;
      return data;
    }
  });

  // Récupérer les stats
  const { data: stats } = useQuery({
    queryKey: ['tresorerie-stats', dateDebut, dateFin],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('previsions_tresorerie')
        .select('type_flux, montant_prevu, montant_realise, statut')
        .gte('date_prevision', dateDebut.toISOString().split('T')[0])
        .lte('date_prevision', dateFin.toISOString().split('T')[0]);

      if (error) throw error;

      const entreesPrevues = data.filter(p => p.type_flux === 'entree').reduce((sum, p) => sum + Number(p.montant_prevu), 0);
      const entreesRealisees = data.filter(p => p.type_flux === 'entree').reduce((sum, p) => sum + Number(p.montant_realise), 0);
      const sortiesPrevues = data.filter(p => p.type_flux === 'sortie').reduce((sum, p) => sum + Number(p.montant_prevu), 0);

      return {
        entreesPrevues,
        entreesRealisees,
        sortiesPrevues,
        soldePrevu: entreesPrevues - sortiesPrevues,
        tauxRealisation: entreesPrevues > 0 ? (entreesRealisees / entreesPrevues) * 100 : 0
      };
    }
  });

  // Générer les prévisions
  const genererPrevisions = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('generer_previsions_tresorerie', {
        p_date_debut: dateDebut.toISOString().split('T')[0],
        p_date_fin: dateFin.toISOString().split('T')[0]
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (count) => {
      toast({
        title: 'Prévisions générées',
        description: `${count} prévision(s) créée(s) avec succès`
      });
      queryClient.invalidateQueries({ queryKey: ['previsions-tresorerie'] });
      queryClient.invalidateQueries({ queryKey: ['tresorerie-stats'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Préparer les données pour les graphiques
  const chartData = previsions?.reduce((acc, prev) => {
    const date = format(new Date(prev.date_prevision), 'dd/MM', { locale: fr });
    const existing = acc.find(d => d.date === date);
    
    if (existing) {
      if (prev.type_flux === 'entree') {
        existing.entrees += Number(prev.montant_prevu);
        existing.entreesRealisees += Number(prev.montant_realise || 0);
      } else {
        existing.sorties += Number(prev.montant_prevu);
      }
    } else {
      acc.push({
        date,
        entrees: prev.type_flux === 'entree' ? Number(prev.montant_prevu) : 0,
        entreesRealisees: prev.type_flux === 'entree' ? Number(prev.montant_realise || 0) : 0,
        sorties: prev.type_flux === 'sortie' ? Number(prev.montant_prevu) : 0
      });
    }
    return acc;
  }, [] as any[]) || [];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Prévisions de Trésorerie</h1>
            <p className="text-muted-foreground mt-1">
              Anticipez vos flux financiers sur les 3 prochains mois
            </p>
          </div>
          <Button 
            onClick={() => genererPrevisions.mutate()}
            disabled={genererPrevisions.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${genererPrevisions.isPending ? 'animate-spin' : ''}`} />
            Générer les prévisions
          </Button>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                Entrées prévues
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats?.entreesPrevues.toLocaleString('fr-FR')} MAD
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                Entrées réalisées
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats?.entreesRealisees.toLocaleString('fr-FR')} MAD
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {stats?.tauxRealisation.toFixed(1)}% du prévu
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-500" />
                Sorties prévues
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats?.sortiesPrevues.toLocaleString('fr-FR')} MAD
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Solde prévu
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${(stats?.soldePrevu || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats?.soldePrevu.toLocaleString('fr-FR')} MAD
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Graphique d'évolution */}
        <Card>
          <CardHeader>
            <CardTitle>Évolution de la trésorerie</CardTitle>
            <CardDescription>Comparaison entrées prévues vs réalisées</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => `${value.toLocaleString('fr-FR')} MAD`}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="entrees" 
                    stroke="hsl(142 76% 36%)" 
                    strokeWidth={2}
                    name="Entrées prévues"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="entreesRealisees" 
                    stroke="hsl(221 83% 53%)" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="Entrées réalisées"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="sorties" 
                    stroke="hsl(0 84% 60%)" 
                    strokeWidth={2}
                    name="Sorties prévues"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                Aucune donnée disponible. Cliquez sur "Générer les prévisions" pour commencer.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Graphique en barres */}
        <Card>
          <CardHeader>
            <CardTitle>Flux mensuels</CardTitle>
            <CardDescription>Entrées et sorties par période</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => `${value.toLocaleString('fr-FR')} MAD`}
                  />
                  <Legend />
                  <Bar dataKey="entrees" fill="hsl(142 76% 36%)" name="Entrées" />
                  <Bar dataKey="sorties" fill="hsl(0 84% 60%)" name="Sorties" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                Aucune donnée disponible
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
