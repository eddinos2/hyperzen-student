import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Shield, TrendingUp, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface RisqueScoreProps {
  dossierId: string;
  compact?: boolean;
}

export const RisqueScore = ({ dossierId, compact = false }: RisqueScoreProps) => {
  const { data: risque, isLoading } = useQuery({
    queryKey: ['risque-score', dossierId],
    queryFn: async () => {
      // D'abord, calculer le score
      const { data: scoreData, error: scoreError } = await supabase
        .rpc('calculer_score_risque', { p_dossier_id: dossierId })
        .single();

      if (scoreError) throw scoreError;

      // Vérifier si un risque existe déjà pour aujourd'hui
      const today = new Date().toISOString().split('T')[0];
      const { data: existingRisque } = await supabase
        .from('risques_financiers')
        .select('*')
        .eq('dossier_id', dossierId)
        .gte('date_evaluation', today)
        .maybeSingle();

      // Si pas de risque aujourd'hui, en créer un
      if (!existingRisque && scoreData) {
        await supabase.from('risques_financiers').insert({
          dossier_id: dossierId,
          score_risque: scoreData.score,
          niveau_risque: scoreData.niveau,
          facteurs_risque: scoreData.facteurs,
          recommandations: genererRecommandations(scoreData.niveau)
        });
      }

      return scoreData;
    },
    enabled: !!dossierId
  });

  if (isLoading) {
    return <div className="animate-pulse bg-muted h-8 rounded"></div>;
  }

  if (!risque) {
    return null;
  }

  const getVariant = (niveau: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (niveau) {
      case 'critique': return 'destructive';
      case 'eleve': return 'destructive';
      case 'moyen': return 'secondary';
      default: return 'default';
    }
  };

  const getIcon = (niveau: string) => {
    switch (niveau) {
      case 'critique': return <AlertTriangle className="h-4 w-4" />;
      case 'eleve': return <AlertCircle className="h-4 w-4" />;
      case 'moyen': return <TrendingUp className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  const getColor = (niveau: string) => {
    switch (niveau) {
      case 'critique': return 'hsl(0 84% 60%)';
      case 'eleve': return 'hsl(25 95% 53%)';
      case 'moyen': return 'hsl(48 96% 53%)';
      default: return 'hsl(142 76% 36%)';
    }
  };

  const getLabelNiveau = (niveau: string) => {
    switch (niveau) {
      case 'critique': return 'Critique';
      case 'eleve': return 'Élevé';
      case 'moyen': return 'Moyen';
      default: return 'Faible';
    }
  };

  if (compact) {
    return (
      <Badge variant={getVariant(risque.niveau)} className="flex items-center gap-1">
        {getIcon(risque.niveau)}
        Risque {getLabelNiveau(risque.niveau)} ({risque.score}/100)
      </Badge>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Score de Risque</span>
          <Badge variant={getVariant(risque.niveau)} className="flex items-center gap-1">
            {getIcon(risque.niveau)}
            {getLabelNiveau(risque.niveau)}
          </Badge>
        </CardTitle>
        <CardDescription>
          Évaluation du risque de non-paiement
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Score global</span>
            <span className="text-2xl font-bold" style={{ color: getColor(risque.niveau) }}>
              {risque.score}/100
            </span>
          </div>
          <Progress 
            value={risque.score} 
            className="h-3"
            style={{
              background: 'hsl(var(--muted))'
            }}
          />
        </div>

        {risque.facteurs && Array.isArray(risque.facteurs) && risque.facteurs.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Facteurs de risque détectés:</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {risque.facteurs.map((facteur: any, index: number) => (
                <li key={index} className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>
                    {facteur.facteur} <span className="font-medium text-foreground">(+{facteur.points} pts)</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {risque.niveau === 'critique' && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
            <p className="text-sm font-medium text-destructive">
              ⚠️ Action urgente requise : Ce dossier nécessite une relance immédiate
            </p>
          </div>
        )}

        {risque.niveau === 'eleve' && (
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
            <p className="text-sm text-orange-700 dark:text-orange-400">
              📊 Recommandation : Planifier une relance dans les prochains jours
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

function genererRecommandations(niveau: string): string {
  switch (niveau) {
    case 'critique':
      return 'Action immédiate requise. Contacter l\'élève et sa famille rapidement. Envisager un plan de paiement échelonné.';
    case 'eleve':
      return 'Envoyer une relance formelle. Proposer un entretien pour discuter des modalités de paiement.';
    case 'moyen':
      return 'Surveillance recommandée. Envoyer un rappel amical de paiement.';
    default:
      return 'Situation saine. Continuer le suivi normal.';
  }
}
