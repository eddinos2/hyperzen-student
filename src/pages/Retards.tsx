import { AppLayout } from '@/components/layout/AppLayout';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Mail, Phone, AlertCircle, History, FileText, Send, Download } from 'lucide-react';
import { useState } from 'react';
import { formaterMontant } from '@/lib/calculs';
import { useToast } from '@/hooks/use-toast';
import { exportRetardsToCSV } from '@/lib/export-utils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ListeModelesEmail } from '@/components/relances/ListeModelesEmail';

export default function Retards() {
  const [selectedEleves, setSelectedEleves] = useState<string[]>([]);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('retards');

  const { data: elevesEnRetard } = useQuery({
    queryKey: ['eleves-retard'],
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    queryFn: async () => {
      // Récupérer tous les dossiers avec leur solde
      const { data: dossiers } = await supabase
        .from('dossiers_scolarite')
        .select(`
          *,
          eleves (
            id,
            nom,
            prenom,
            email,
            telephone
          )
        `);

      if (!dossiers) return [];

      // Pour chaque dossier, calculer le solde
      const dossiersAvecSolde = await Promise.all(
        dossiers.map(async (dossier) => {
          const { data: reglements } = await supabase
            .from('reglements')
            .select('montant')
            .eq('dossier_id', dossier.id)
            .eq('statut', 'valide');

          const totalVerse = reglements?.reduce((sum, r) => sum + Number(r.montant), 0) || 0;
          const resteAPayer = (dossier.tarif_scolarite + (dossier.impaye_anterieur || 0)) - totalVerse;

          // Vérifier s'il y a des échéances en retard
          const { data: echeancesRetard } = await supabase
            .from('echeances')
            .select('*')
            .eq('dossier_id', dossier.id)
            .eq('statut', 'en_retard');

          return {
            ...dossier,
            resteAPayer,
            totalVerse,
            nbEcheancesRetard: echeancesRetard?.length || 0,
          };
        })
      );

      // Filtrer ceux qui ont un reste à payer > 0 ou des échéances en retard
      return dossiersAvecSolde.filter(
        (d) => d.resteAPayer > 100 || d.nbEcheancesRetard > 0
      );
    },
  });

  // Récupérer l'historique des relances
  const { data: relances } = useQuery({
    queryKey: ['relances-historique'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('relances')
        .select(`
          *,
          dossiers_scolarite(
            eleves(nom, prenom, immatriculation)
          )
        `)
        .order('date_envoi', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    }
  });

  const handleSelectEleve = (eleveId: string) => {
    setSelectedEleves((prev) =>
      prev.includes(eleveId)
        ? prev.filter((id) => id !== eleveId)
        : [...prev, eleveId]
    );
  };

  const handleSelectAll = () => {
    if (selectedEleves.length === elevesEnRetard?.length) {
      setSelectedEleves([]);
    } else {
      setSelectedEleves(elevesEnRetard?.map((d) => (d.eleves as any).id) || []);
    }
  };

  const handleEnvoyerRelance = async (type: 'email' | 'sms') => {
    if (selectedEleves.length === 0) {
      toast({
        title: 'Aucun élève sélectionné',
        description: 'Veuillez sélectionner au moins un élève',
        variant: 'destructive',
      });
      return;
    }

    if (type === 'sms') {
      toast({
        title: 'SMS',
        description: 'ECD',
      });
      return;
    }

    try {
      // Récupérer les infos complètes des élèves sélectionnés
      const elevesAEnvoyer = elevesEnRetard
        ?.filter((d) => selectedEleves.includes((d.eleves as any).id))
        .map((d) => {
          const eleve = d.eleves as any;
          return {
            id: eleve.id,
            email: eleve.email,
            nom: eleve.nom,
            prenom: eleve.prenom,
            telephone: eleve.telephone,
            resteAPayer: d.resteAPayer,
            nbEcheancesRetard: d.nbEcheancesRetard,
          };
        }) || [];

      toast({
        title: 'Envoi en cours...',
        description: `Envoi de ${elevesAEnvoyer.length} email(s) de relance`,
      });

      // Appeler la fonction edge
      const { data, error } = await supabase.functions.invoke('envoyer-relances-retard', {
        body: {
          eleves: elevesAEnvoyer,
          type,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: '✅ Relances envoyées',
          description: data.message || `${data.results.success} email(s) envoyé(s) avec succès`,
        });
        setSelectedEleves([]);
      } else {
        throw new Error(data?.error || 'Erreur lors de l\'envoi');
      }
    } catch (error: any) {
      console.error('Erreur envoi relance:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible d\'envoyer les relances',
        variant: 'destructive',
      });
    }
  };

  const getStatutBadge = (statut: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive'; label: string }> = {
      envoyee: { variant: 'default', label: 'Envoyée' },
      planifiee: { variant: 'secondary', label: 'Planifiée' },
      repondue: { variant: 'default', label: 'Répondue' },
      ignoree: { variant: 'destructive', label: 'Ignorée' }
    };
    const config = variants[statut] || { variant: 'default', label: statut };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getCanalIcon = (canal: string) => {
    switch (canal) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'sms': return <Phone className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const handleExport = () => {
    if (!elevesEnRetard || elevesEnRetard.length === 0) {
      toast({
        title: 'Aucune donnée',
        description: 'Il n\'y a aucun retard à exporter',
        variant: 'destructive',
      });
      return;
    }
    exportRetardsToCSV(elevesEnRetard);
    toast({
      title: 'Export réussi',
      description: `${elevesEnRetard.length} élève(s) en retard exporté(s)`,
    });
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-3 sm:px-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
          <div className="flex-1">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black mb-3">RETARDS & RELANCES</h1>
            <p className="text-sm sm:text-lg lg:text-xl font-bold text-muted-foreground">
              Gestion des retards et relances de paiement
            </p>
          </div>
          <div className="flex flex-row gap-3 items-center">
            <div className="brutal-card p-4 sm:p-5 bg-gradient-to-br from-red-100 to-red-50 min-w-[140px] sm:min-w-[160px]">
              <p className="text-xs font-bold uppercase mb-2">Élèves en retard</p>
              <p className="text-3xl sm:text-4xl font-black">{elevesEnRetard?.length || 0}</p>
            </div>
            <button 
              onClick={handleExport}
              className="brutal-button bg-secondary text-secondary-foreground flex items-center gap-2 px-4 py-3 sm:px-6 sm:py-4"
            >
              <Download className="w-5 h-5" />
              <span className="hidden lg:inline">EXPORTER</span>
            </button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="brutal-card p-3 flex flex-wrap gap-2 w-full justify-center">
            <TabsTrigger value="retards" className="brutal-button py-3 px-4 flex-1 min-w-[100px] sm:min-w-[140px] flex items-center justify-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <span className="hidden sm:inline font-bold">Retards & Envoi</span>
            </TabsTrigger>
            <TabsTrigger value="historique" className="brutal-button py-3 px-4 flex-1 min-w-[100px] sm:min-w-[140px] flex items-center justify-center gap-2">
              <History className="h-5 w-5" />
              <span className="hidden sm:inline font-bold">Historique</span>
            </TabsTrigger>
            <TabsTrigger value="modeles" className="brutal-button py-3 px-4 flex-1 min-w-[100px] sm:min-w-[140px] flex items-center justify-center gap-2">
              <FileText className="h-5 w-5" />
              <span className="hidden sm:inline font-bold">Modèles</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="retards" className="space-y-4 sm:space-y-6">

        {selectedEleves.length > 0 && (
          <div className="brutal-card p-5 sm:p-6 mb-6 bg-gradient-to-br from-yellow-100 to-yellow-50">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <p className="text-lg sm:text-xl font-black">
                {selectedEleves.length} élève(s) sélectionné(s)
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={() => handleEnvoyerRelance('email')}
                  className="brutal-button bg-cyan-400 text-black flex items-center gap-2 flex-1 lg:flex-none px-5 py-3"
                >
                  <Mail className="w-5 h-5" />
                  <span>ENVOYER EMAIL</span>
                </Button>
                <Button
                  onClick={() => handleEnvoyerRelance('sms')}
                  className="brutal-button bg-green-400 text-black flex items-center gap-2 flex-1 lg:flex-none px-5 py-3"
                >
                  <Phone className="w-5 h-5" />
                  <span>ENVOYER SMS</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {!elevesEnRetard || elevesEnRetard.length === 0 ? (
          <div className="brutal-card p-12 sm:p-16 text-center bg-gradient-to-br from-green-100 to-green-50">
            <div className="text-6xl mb-6">✅</div>
            <p className="text-2xl sm:text-3xl font-black mb-3">AUCUN RETARD</p>
            <p className="text-lg sm:text-xl font-bold text-muted-foreground">
              Tous les élèves sont à jour
            </p>
          </div>
        ) : (
          <>
            <div className="brutal-card p-5 mb-6">
              <Button
                onClick={handleSelectAll}
                variant="outline"
                className="brutal-button bg-white text-black px-6 py-3"
              >
                {selectedEleves.length === elevesEnRetard?.length
                  ? 'TOUT DÉSÉLECTIONNER'
                  : 'TOUT SÉLECTIONNER'}
              </Button>
            </div>

            <div className="space-y-5">
              {elevesEnRetard.map((dossier) => {
                const eleve = dossier.eleves as any;
                const isSelected = selectedEleves.includes(eleve.id);

                return (
                  <div
                    key={dossier.id}
                    className={`brutal-card p-5 sm:p-7 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-gradient-to-br from-yellow-200 to-yellow-100 border-4'
                        : 'bg-white hover:bg-gray-50'
                    }`}
                    onClick={() => handleSelectEleve(eleve.id)}
                  >
                    <div className="flex items-start gap-4 sm:gap-6">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectEleve(eleve.id)}
                        className="mt-1.5 w-6 h-6 rounded border-4 border-black flex-shrink-0"
                      />

                      <div className="flex-1 min-w-0 space-y-5">
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <h3 className="text-xl sm:text-2xl font-black mb-2">
                              {eleve.nom} {eleve.prenom}
                            </h3>
                            <p className="text-sm sm:text-base font-bold text-muted-foreground mb-1.5 break-all">
                              {eleve.email}
                            </p>
                            {eleve.telephone && (
                              <p className="text-sm sm:text-base font-bold text-muted-foreground">
                                📱 {eleve.telephone}
                              </p>
                            )}
                          </div>

                          <div className="text-left lg:text-right flex-shrink-0 bg-red-50 p-4 rounded-xl border-2 border-red-200">
                            <p className="text-xs font-bold uppercase text-muted-foreground mb-2">
                              Reste à payer
                            </p>
                            <p className="text-3xl sm:text-4xl font-black text-red-600">
                              {formaterMontant(dossier.resteAPayer)}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                          <div className="p-4 bg-cyan-100 rounded-xl border-2 border-black">
                            <p className="text-xs font-bold uppercase mb-2 text-cyan-900">Tarif total</p>
                            <p className="text-xl sm:text-2xl font-black text-cyan-900">
                              {formaterMontant(
                                dossier.tarif_scolarite + (dossier.impaye_anterieur || 0)
                              )}
                            </p>
                          </div>

                          <div className="p-4 bg-green-100 rounded-xl border-2 border-black">
                            <p className="text-xs font-bold uppercase mb-2 text-green-900">Déjà versé</p>
                            <p className="text-xl sm:text-2xl font-black text-green-900">
                              {formaterMontant(dossier.totalVerse)}
                            </p>
                          </div>

                          <div className="p-4 bg-red-100 rounded-xl border-2 border-black">
                            <p className="text-xs font-bold uppercase mb-2 text-red-900">
                              Échéances en retard
                            </p>
                            <p className="text-xl sm:text-2xl font-black text-red-900">{dossier.nbEcheancesRetard}</p>
                          </div>
                        </div>

                        {dossier.nbEcheancesRetard > 0 && (
                          <div className="p-4 bg-yellow-100 rounded-xl border-2 border-black flex items-center gap-3">
                            <AlertCircle className="w-6 h-6 text-yellow-700 flex-shrink-0" />
                            <p className="font-bold text-yellow-900">
                              ⚠️ {dossier.nbEcheancesRetard} échéance(s) en retard
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
          </TabsContent>

          <TabsContent value="historique" className="space-y-6">
            <Card className="brutal-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl sm:text-3xl font-black">
                  <History className="h-6 w-6" />
                  HISTORIQUE DES RELANCES
                </CardTitle>
                <CardDescription className="text-base sm:text-lg font-bold">
                  100 dernières relances envoyées
                </CardDescription>
              </CardHeader>
              <CardContent>
                {relances && relances.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Élève</TableHead>
                          <TableHead>Niveau</TableHead>
                          <TableHead>Canal</TableHead>
                          <TableHead>Montant</TableHead>
                          <TableHead>Statut</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {relances.map((relance) => (
                          <TableRow key={relance.id}>
                            <TableCell className="text-xs sm:text-sm">
                              {format(new Date(relance.date_envoi), 'dd/MM/yyyy HH:mm', { locale: fr })}
                            </TableCell>
                            <TableCell className="font-bold text-sm sm:text-base">
                              {relance.dossiers_scolarite?.eleves?.nom} {relance.dossiers_scolarite?.eleves?.prenom}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-bold">
                                Niveau {relance.niveau_relance}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getCanalIcon(relance.canal)}
                                <span className="hidden sm:inline">{relance.canal}</span>
                              </div>
                            </TableCell>
                            <TableCell className="font-black text-sm sm:text-base">
                              {formaterMontant(relance.montant_du)}
                            </TableCell>
                            <TableCell>{getStatutBadge(relance.statut)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <History className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-xl font-bold">Aucune relance envoyée</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="modeles" className="space-y-6">
            <ListeModelesEmail />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
