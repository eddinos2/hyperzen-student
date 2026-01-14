import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface MarquerPayeeDialogProps {
  echeance: {
    id: string;
    montant: number;
    date_echeance: string;
    dossier_id: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const MarquerPayeeDialog = ({
  echeance,
  open,
  onOpenChange,
  onSuccess,
}: MarquerPayeeDialogProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [moyenPaiement, setMoyenPaiement] = useState('Virement');
  const [dateReglement, setDateReglement] = useState(
    new Date().toISOString().split('T')[0]
  );

  const handleMarquerPayee = async () => {
    setIsLoading(true);
    try {
      // 1. Créer le règlement
      const { data: reglement, error: reglementError } = await supabase
        .from('reglements')
        .insert({
          dossier_id: echeance.dossier_id,
          montant: echeance.montant,
          date_reglement: dateReglement,
          moyen_paiement: moyenPaiement,
          statut: 'valide',
          commentaire: `Règlement lié à échéance du ${format(new Date(echeance.date_echeance), 'dd/MM/yyyy', { locale: fr })}`,
        })
        .select()
        .single();

      if (reglementError) throw reglementError;

      // 2. Marquer l'échéance comme payée et lier au règlement
      const { error: echeanceError } = await supabase
        .from('echeances')
        .update({
          statut: 'payee',
          reglement_id: reglement.id,
        })
        .eq('id', echeance.id);

      if (echeanceError) throw echeanceError;

      toast({
        title: 'Échéance marquée payée',
        description: 'Un règlement a été créé et lié à cette échéance',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="brutal-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black">
            MARQUER COMME PAYÉE
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="p-4 bg-cyan-50 rounded-xl border-2 border-black">
            <p className="text-sm font-bold uppercase text-muted-foreground mb-1">
              Montant de l'échéance
            </p>
            <p className="text-3xl font-black">
              {new Intl.NumberFormat('fr-FR', {
                style: 'currency',
                currency: 'EUR',
              }).format(echeance.montant)}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-black uppercase text-muted-foreground">
              <Calendar className="inline w-4 h-4 mr-2" />
              Date du règlement
            </label>
            <input
              type="date"
              value={dateReglement}
              onChange={(e) => setDateReglement(e.target.value)}
              className="w-full h-12 px-4 border-4 border-black rounded-2xl font-bold focus:ring-4 focus:ring-primary"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-black uppercase text-muted-foreground">
              <CreditCard className="inline w-4 h-4 mr-2" />
              Moyen de paiement
            </label>
            <select
              value={moyenPaiement}
              onChange={(e) => setMoyenPaiement(e.target.value)}
              className="w-full h-12 px-4 border-4 border-black rounded-2xl font-bold focus:ring-4 focus:ring-primary"
            >
              <option value="Virement">Virement</option>
              <option value="Chèque">Chèque</option>
              <option value="Espèces">Espèces</option>
              <option value="Carte bancaire">Carte bancaire</option>
              <option value="Prélèvement">Prélèvement</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
              className="flex-1 brutal-button bg-white"
            >
              ANNULER
            </Button>
            <Button
              onClick={handleMarquerPayee}
              disabled={isLoading}
              className="flex-1 brutal-button bg-green-500 text-white"
            >
              {isLoading ? 'TRAITEMENT...' : 'CONFIRMER'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
