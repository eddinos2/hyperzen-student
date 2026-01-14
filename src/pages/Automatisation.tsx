import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Bell, Send, Calendar, CheckCircle2, XCircle, Clock, Plus, Edit, Trash2, Power, PowerOff } from 'lucide-react';
import { GererTacheDialog } from '@/components/automatisation/GererTacheDialog';
import { IntegrationGoogleSheets } from '@/components/automatisation/IntegrationGoogleSheets';
import { IntegrationHubSpot } from '@/components/automatisation/IntegrationHubSpot';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface TaskResult {
  success: boolean;
  count: number;
  details?: any;
  error?: string;
}

export default function Automatisation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isRunningRelances, setIsRunningRelances] = useState(false);
  const [isRunningEcheances, setIsRunningEcheances] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTache, setSelectedTache] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tacheToDelete, setTacheToDelete] = useState<any>(null);
  const [lastResults, setLastResults] = useState<{
    relances?: TaskResult;
    echeances?: TaskResult;
  }>({});

  // Récupérer les tâches planifiées
  const { data: tachesPlanifiees, isLoading: loadingTaches } = useQuery({
    queryKey: ['taches-planifiees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('taches_planifiees')
        .select('*')
        .order('heure_execution', { ascending: true });
      
      if (error) throw error;
      return data;
    }
  });

  const executerRelancesAutomatiques = async () => {
    setIsRunningRelances(true);
    try {
      const { data, error } = await supabase.functions.invoke('traiter-relances-automatiques');
      
      if (error) throw error;

      const result = {
        success: true,
        count: data.relancesCreees,
        details: data.details
      };

      setLastResults(prev => ({ ...prev, relances: result }));

      toast({
        title: 'Relances automatiques exécutées',
        description: `${data.relancesCreees} relances ont été envoyées`
      });
    } catch (error: any) {
      const result = {
        success: false,
        count: 0,
        error: error.message
      };

      setLastResults(prev => ({ ...prev, relances: result }));

      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsRunningRelances(false);
    }
  };

  const executerNotificationsEcheances = async () => {
    setIsRunningEcheances(true);
    try {
      const { data, error } = await supabase.functions.invoke('notifier-echeance-proche');
      
      if (error) throw error;

      const result = {
        success: true,
        count: data.notificationsEnvoyees,
        details: data.details
      };

      setLastResults(prev => ({ ...prev, echeances: result }));

      toast({
        title: 'Notifications d\'échéances envoyées',
        description: `${data.notificationsEnvoyees} notifications ont été envoyées`
      });
    } catch (error: any) {
      const result = {
        success: false,
        count: 0,
        error: error.message
      };

      setLastResults(prev => ({ ...prev, echeances: result }));

      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsRunningEcheances(false);
    }
  };

  const handleToggleActif = async (tache: any) => {
    try {
      const { error } = await supabase
        .from('taches_planifiees')
        .update({ actif: !tache.actif })
        .eq('id', tache.id);

      if (error) throw error;

      toast({
        title: tache.actif ? 'Tâche désactivée' : 'Tâche activée',
        description: `La tâche "${tache.nom}" a été ${tache.actif ? 'désactivée' : 'activée'}`
      });

      queryClient.invalidateQueries({ queryKey: ['taches-planifiees'] });
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleDeleteTache = async () => {
    if (!tacheToDelete) return;

    try {
      const { error } = await supabase
        .from('taches_planifiees')
        .delete()
        .eq('id', tacheToDelete.id);

      if (error) throw error;

      toast({
        title: 'Tâche supprimée',
        description: `La tâche "${tacheToDelete.nom}" a été supprimée`
      });

      queryClient.invalidateQueries({ queryKey: ['taches-planifiees'] });
      setDeleteDialogOpen(false);
      setTacheToDelete(null);
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const getTypeTacheLabel = (type: string) => {
    const types: Record<string, string> = {
      'relances_automatiques': 'Relances automatiques',
      'notifications_echeances': 'Notifications d\'échéances',
      'mise_a_jour_risques': 'Mise à jour des risques'
    };
    return types[type] || type;
  };

  const getJoursSemaineLabel = (jours: number[] | null) => {
    if (!jours || jours.length === 0) return 'Tous les jours';
    
    const joursLabels: Record<number, string> = {
      1: 'Lun', 2: 'Mar', 3: 'Mer', 4: 'Jeu', 5: 'Ven', 6: 'Sam', 7: 'Dim'
    };
    
    return jours.map(j => joursLabels[j]).join(', ');
  };

  const TaskCard = ({ 
    title, 
    description, 
    icon: Icon, 
    isRunning, 
    onExecute, 
    result 
  }: { 
    title: string; 
    description: string; 
    icon: any; 
    isRunning: boolean; 
    onExecute: () => void; 
    result?: TaskResult;
  }) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {result && (
          <div className="p-4 rounded-lg border bg-muted/50">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold">Dernière exécution:</span>
              {result.success ? (
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Succès
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  Échec
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {result.success 
                ? `${result.count} tâche(s) traitée(s)`
                : `Erreur: ${result.error}`
              }
            </p>
          </div>
        )}
        
        <Button 
          onClick={onExecute} 
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? (
            <>
              <Clock className="h-4 w-4 mr-2 animate-spin" />
              Exécution en cours...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Exécuter maintenant
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Automatisation</h1>
          <p className="text-muted-foreground mt-1">
            Gérez les tâches automatiques et les notifications
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-1">Intégrations externes</h2>
          <p className="text-muted-foreground mb-4">
            Connectez vos sources de données externes
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <IntegrationGoogleSheets />
          <IntegrationHubSpot />
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-1">Tâches automatiques</h2>
          <p className="text-muted-foreground mb-4">
            Exécutez des actions de manière ponctuelle
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <TaskCard
            title="Relances automatiques"
            description="Envoie des relances aux étudiants avec des dossiers à risque"
            icon={Send}
            isRunning={isRunningRelances}
            onExecute={executerRelancesAutomatiques}
            result={lastResults.relances}
          />

          <TaskCard
            title="Notifications d'échéances"
            description="Envoie des rappels 7 jours avant chaque échéance"
            icon={Bell}
            isRunning={isRunningEcheances}
            onExecute={executerNotificationsEcheances}
            result={lastResults.echeances}
          />
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Tâches planifiées
                </CardTitle>
                <CardDescription>
                  Configurez l'exécution automatique des tâches
                </CardDescription>
              </div>
              <Button onClick={() => {
                setSelectedTache(null);
                setDialogOpen(true);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter une tâche
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingTaches ? (
              <div className="text-center py-8 text-muted-foreground">
                Chargement...
              </div>
            ) : tachesPlanifiees && tachesPlanifiees.length > 0 ? (
              <div className="space-y-3">
                {tachesPlanifiees.map((tache) => (
                  <div
                    key={tache.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="font-semibold">{tache.nom}</p>
                        <Badge variant={tache.actif ? 'default' : 'secondary'}>
                          {tache.actif ? 'Actif' : 'Inactif'}
                        </Badge>
                        <Badge variant="outline">
                          {getTypeTacheLabel(tache.type_tache)}
                        </Badge>
                      </div>
                      {tache.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {tache.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>
                          <Clock className="h-3 w-3 inline mr-1" />
                          {tache.heure_execution}
                        </span>
                        <span>{getJoursSemaineLabel(tache.jours_semaine)}</span>
                        {tache.prochaine_execution && (
                          <span>
                            Prochaine: {format(new Date(tache.prochaine_execution), 'dd/MM/yyyy HH:mm', { locale: fr })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleActif(tache)}
                        title={tache.actif ? 'Désactiver' : 'Activer'}
                      >
                        {tache.actif ? (
                          <Power className="h-4 w-4 text-green-600" />
                        ) : (
                          <PowerOff className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedTache(tache);
                          setDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setTacheToDelete(tache);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-semibold mb-2">Aucune tâche planifiée</p>
                <p className="text-sm">
                  Ajoutez votre première tâche automatique pour commencer
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <GererTacheDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          tache={selectedTache}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['taches-planifiees'] })}
        />

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
              <AlertDialogDescription>
                Êtes-vous sûr de vouloir supprimer la tâche "{tacheToDelete?.nom}" ?
                Cette action est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteTache} className="bg-destructive text-destructive-foreground">
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
