import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface Reglement {
  id: string;
  montant: number;
  date_reglement: string;
  moyen_paiement: string;
  statut: string;
  numero_piece?: string;
  commentaire?: string;
}

interface ModifierReglementDialogProps {
  reglement: Reglement;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ModifierReglementDialog({ reglement, open, onOpenChange, onSuccess }: ModifierReglementDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    montant: reglement.montant.toString(),
    date_reglement: reglement.date_reglement,
    moyen_paiement: reglement.moyen_paiement,
    statut: reglement.statut,
    numero_piece: reglement.numero_piece || '',
    commentaire: reglement.commentaire || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const oldStatut = reglement.statut;
      const newStatut = formData.statut;

      // Mettre à jour le règlement
      const { error } = await supabase
        .from('reglements')
        .update({
          montant: parseFloat(formData.montant),
          date_reglement: formData.date_reglement,
          moyen_paiement: formData.moyen_paiement,
          statut: formData.statut,
          numero_piece: formData.numero_piece || null,
          commentaire: formData.commentaire || null,
        })
        .eq('id', reglement.id);

      if (error) throw error;

      // Synchroniser avec les échéances
      if (oldStatut === 'valide' && newStatut !== 'valide') {
        // Le règlement n'est plus valide → réinitialiser l'échéance liée
        await supabase.functions.invoke('synchroniser-echeance-reglement', {
          body: { 
            action: 'supprimer_reglement',
            reglementId: reglement.id,
          },
        });
      }

      toast({
        title: 'Règlement modifié',
        description: 'Les modifications ont été enregistrées avec succès',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de modifier le règlement',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-3xl font-black">MODIFIER LE RÈGLEMENT</DialogTitle>
          <DialogDescription>
            Modifiez les informations du règlement
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-bold uppercase">Montant (€)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.montant}
                onChange={(e) => setFormData({ ...formData, montant: e.target.value })}
                className="brutal-input"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="font-bold uppercase">Date de règlement</Label>
              <Input
                type="date"
                value={formData.date_reglement}
                onChange={(e) => setFormData({ ...formData, date_reglement: e.target.value })}
                className="brutal-input"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="font-bold uppercase">Moyen de paiement</Label>
              <Select
                value={formData.moyen_paiement}
                onValueChange={(value) => setFormData({ ...formData, moyen_paiement: value })}
              >
                <SelectTrigger className="brutal-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Chèque">Chèque</SelectItem>
                  <SelectItem value="CB">CB</SelectItem>
                  <SelectItem value="Virement">Virement</SelectItem>
                  <SelectItem value="Prélèvement">Prélèvement</SelectItem>
                  <SelectItem value="Espèce">Espèce</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="font-bold uppercase">Statut</Label>
              <Select
                value={formData.statut}
                onValueChange={(value) => setFormData({ ...formData, statut: value })}
              >
                <SelectTrigger className="brutal-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="valide">Valide</SelectItem>
                  <SelectItem value="en_attente">En attente</SelectItem>
                  <SelectItem value="impaye">Impayé</SelectItem>
                  <SelectItem value="refuse">Refusé</SelectItem>
                  <SelectItem value="annule">Annulé</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="font-bold uppercase">Numéro de pièce</Label>
              <Input
                type="text"
                value={formData.numero_piece}
                onChange={(e) => setFormData({ ...formData, numero_piece: e.target.value })}
                className="brutal-input"
                placeholder="Numéro de chèque, transaction..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="font-bold uppercase">Commentaire</Label>
            <Input
              type="text"
              value={formData.commentaire}
              onChange={(e) => setFormData({ ...formData, commentaire: e.target.value })}
              className="brutal-input"
              placeholder="Notes additionnelles..."
            />
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="brutal-button bg-white text-black"
            >
              ANNULER
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="brutal-button bg-primary text-primary-foreground"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  ENREGISTREMENT...
                </>
              ) : (
                'ENREGISTRER'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
