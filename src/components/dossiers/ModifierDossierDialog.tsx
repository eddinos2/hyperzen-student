import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface Dossier {
  id: string;
  tarif_scolarite: number;
  impaye_anterieur: number;
  rythme?: string;
  commentaire?: string;
  campus_id?: string;
  filiere_id?: string;
  annee_id?: string;
}

interface ModifierDossierDialogProps {
  dossier: Dossier;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ModifierDossierDialog({ dossier, open, onOpenChange, onSuccess }: ModifierDossierDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    tarif_scolarite: dossier.tarif_scolarite.toString(),
    impaye_anterieur: dossier.impaye_anterieur?.toString() || '0',
    rythme: dossier.rythme || '',
    commentaire: dossier.commentaire || '',
    campus_id: dossier.campus_id || '',
    filiere_id: dossier.filiere_id || '',
    annee_id: dossier.annee_id || '',
  });

  const { data: campus } = useQuery({
    queryKey: ['campus'],
    queryFn: async () => {
      const { data } = await supabase.from('campus').select('*').eq('actif', true);
      return data || [];
    },
  });

  const { data: filieres } = useQuery({
    queryKey: ['filieres'],
    queryFn: async () => {
      const { data } = await supabase.from('filieres').select('*').eq('actif', true);
      return data || [];
    },
  });

  const { data: annees } = useQuery({
    queryKey: ['annees'],
    queryFn: async () => {
      const { data } = await supabase.from('annees_scolaires').select('*').order('ordre', { ascending: true });
      return data || [];
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('dossiers_scolarite')
        .update({
          tarif_scolarite: parseFloat(formData.tarif_scolarite),
          impaye_anterieur: parseFloat(formData.impaye_anterieur),
          rythme: formData.rythme || null,
          commentaire: formData.commentaire || null,
          campus_id: formData.campus_id || null,
          filiere_id: formData.filiere_id || null,
          annee_id: formData.annee_id || null,
        })
        .eq('id', dossier.id);

      if (error) throw error;

      toast({
        title: 'Dossier modifié',
        description: 'Les modifications ont été enregistrées avec succès',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de modifier le dossier',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl font-black">MODIFIER LE DOSSIER</DialogTitle>
          <DialogDescription>
            Modifiez les informations du dossier de scolarité
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-bold uppercase">Tarif de scolarité (€)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.tarif_scolarite}
                onChange={(e) => setFormData({ ...formData, tarif_scolarite: e.target.value })}
                className="brutal-input"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="font-bold uppercase">Impayé antérieur (€)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.impaye_anterieur}
                onChange={(e) => setFormData({ ...formData, impaye_anterieur: e.target.value })}
                className="brutal-input"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="font-bold uppercase">Campus</Label>
              <Select
                value={formData.campus_id}
                onValueChange={(value) => setFormData({ ...formData, campus_id: value })}
              >
                <SelectTrigger className="brutal-input">
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {campus?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="font-bold uppercase">Filière</Label>
              <Select
                value={formData.filiere_id}
                onValueChange={(value) => setFormData({ ...formData, filiere_id: value })}
              >
                <SelectTrigger className="brutal-input">
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {filieres?.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="font-bold uppercase">Année scolaire</Label>
              <Select
                value={formData.annee_id}
                onValueChange={(value) => setFormData({ ...formData, annee_id: value })}
              >
                <SelectTrigger className="brutal-input">
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {annees?.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.libelle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="font-bold uppercase">Rythme</Label>
              <Input
                type="text"
                value={formData.rythme}
                onChange={(e) => setFormData({ ...formData, rythme: e.target.value })}
                className="brutal-input"
                placeholder="Initial, Continu, Alternance..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="font-bold uppercase">Commentaire</Label>
            <Textarea
              value={formData.commentaire}
              onChange={(e) => setFormData({ ...formData, commentaire: e.target.value })}
              className="brutal-input min-h-[100px]"
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
