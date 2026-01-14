import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useClotureEleve() {
  const { toast } = useToast();

  const cloturerDossier = async (eleveId: string, motif: 'Désinscrit' | 'Diplômé') => {
    try {
      // 1. Récupérer le dossier de scolarité actif
      const { data: dossiers } = await supabase
        .from('dossiers_scolarite')
        .select('*')
        .eq('eleve_id', eleveId)
        .eq('statut_dossier', 'en_cours');
      
      if (!dossiers || dossiers.length === 0) {
        console.log('Aucun dossier actif trouvé pour cet élève');
        return;
      }
      
      const dossier = dossiers[0];
      
      // 2. Mettre à jour le statut du dossier
      const commentaireClotureDate = new Date().toLocaleDateString('fr-FR');
      const nouveauCommentaire = `${dossier.commentaire || ''}\nClôturé le ${commentaireClotureDate} - Motif: ${motif}`.trim();
      
      await supabase
        .from('dossiers_scolarite')
        .update({
          statut_dossier: 'termine',
          commentaire: nouveauCommentaire
        })
        .eq('id', dossier.id);
      
      // 3. ANNULER toutes les échéances futures (a_venir)
      const today = new Date().toISOString().split('T')[0];
      await supabase
        .from('echeances')
        .update({
          statut: 'annulee',
          commentaire: `Annulée automatiquement - ${motif}`
        })
        .eq('dossier_id', dossier.id)
        .eq('statut', 'a_venir')
        .gte('date_echeance', today);
      
      // 4. Créer une anomalie si impayé restant
      const { data: solde } = await supabase
        .rpc('calculer_solde_dossier', { dossier_uuid: dossier.id });
      
      if (solde && solde[0]?.reste_a_payer > 10) {
        await supabase
          .from('anomalies')
          .insert({
            dossier_id: dossier.id,
            type_anomalie: motif === 'Diplômé' ? 'solde_important' : 'solde_important',
            severite: 'alerte',
            description: `${motif} avec impayé de ${Math.round(solde[0].reste_a_payer)}€`,
            statut: 'ouverte',
            action_proposee: 'Relancer pour récupération des impayés'
          });
      }
      
      toast({
        title: `✅ Dossier clôturé`,
        description: `Le dossier a été marqué comme terminé - ${motif}`
      });
      
      console.log(`✅ Dossier clôturé pour élève ${eleveId} - ${motif}`);
    } catch (error: any) {
      console.error('Erreur lors de la clôture du dossier:', error);
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive'
      });
    }
  };
  
  return { cloturerDossier };
}
