import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Download, FileText, AlertCircle } from 'lucide-react';
import { formaterMontant, formaterDate } from '@/lib/calculs';
import { useToast } from '@/hooks/use-toast';

export const RecusSection = ({ eleveId }: { eleveId: string }) => {
  const { toast } = useToast();

  const { data: recus, isLoading } = useQuery({
    queryKey: ['recus-eleve', eleveId],
    queryFn: async () => {
      // Récupérer tous les reçus valides liés aux règlements de l'élève
      const { data, error } = await supabase
        .from('recus')
        .select(`
          *,
          reglements (
            id,
            montant,
            date_reglement,
            moyen_paiement,
            statut,
            dossiers_scolarite (
              annee_scolaire,
              eleve_id
            )
          )
        `)
        .eq('statut', 'valide')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filtrer uniquement les reçus de cet élève
      return data?.filter(
        (recu: any) => recu.reglements?.dossiers_scolarite?.eleve_id === eleveId
      ) || [];
    },
  });

  const handleDownloadRecu = async (reglementId: string, numeroRecu: string) => {
    try {
      toast({
        title: 'Génération en cours',
        description: 'Préparation de votre reçu...',
      });

      const { data, error } = await supabase.functions.invoke('generer-recu-pdf', {
        body: { reglementId },
      });

      if (error) throw error;

      // Open print dialog with the generated HTML
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(data.html);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.print();
        }, 250);
      }

      toast({
        title: 'Reçu prêt',
        description: 'Vous pouvez maintenant imprimer ou sauvegarder votre reçu en PDF',
      });
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de générer le reçu',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!recus || recus.length === 0) {
    return (
      <div className="brutal-card p-12 text-center">
        <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <p className="text-2xl font-black mb-2">AUCUN REÇU</p>
        <p className="text-lg font-medium text-muted-foreground">
          Vos reçus de paiement apparaîtront ici après validation de vos règlements
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="brutal-card p-6 bg-gradient-to-br from-blue-50 to-cyan-50">
        <div className="flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
          <div>
            <p className="font-black text-lg mb-2">CONSERVATION DES REÇUS</p>
            <p className="font-medium text-sm">
              Conservez précieusement vos reçus de paiement. Ils constituent des preuves officielles de vos règlements.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {recus.map((recu: any) => {
          const reglement = recu.reglements;
          return (
            <div
              key={recu.id}
              className="brutal-card p-6 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <FileText className="w-8 h-8" />
                    <div>
                      <p className="text-xl font-black">{recu.numero_recu}</p>
                      <p className="text-sm font-medium text-muted-foreground">
                        Année {reglement.dossiers_scolarite?.annee_scolaire}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div>
                      <p className="text-xs font-bold uppercase text-muted-foreground mb-1">
                        Date de paiement
                      </p>
                      <p className="font-black">
                        {formaterDate(reglement.date_reglement)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase text-muted-foreground mb-1">
                        Moyen de paiement
                      </p>
                      <span className="inline-block px-3 py-1 rounded-lg border-2 border-black font-bold text-sm bg-cyan-200">
                        {reglement.moyen_paiement}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase text-muted-foreground mb-1">
                        Montant réglé
                      </p>
                      <p className="font-black text-xl text-green-600">
                        {formaterMontant(reglement.montant)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                    <span className="text-sm font-bold text-green-600">REÇU VALIDE</span>
                  </div>
                </div>

                <button
                  onClick={() => handleDownloadRecu(reglement.id, recu.numero_recu)}
                  className="brutal-button bg-primary text-primary-foreground flex items-center gap-2 ml-4"
                >
                  <Download className="w-5 h-5" />
                  TÉLÉCHARGER
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
