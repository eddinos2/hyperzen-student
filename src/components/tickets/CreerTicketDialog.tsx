import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface CreerTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const CreerTicketDialog = ({ open, onOpenChange, onSuccess }: CreerTicketDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    eleve_id: '',
    sujet: '',
    priorite: 'normale',
  });

  const { data: eleves } = useQuery({
    queryKey: ['eleves-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('eleves')
        .select('id, nom, prenom, email')
        .order('nom', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from('tickets').insert({
        eleve_id: formData.eleve_id,
        sujet: formData.sujet,
        priorite: formData.priorite,
        statut: 'ouvert',
      });

      if (error) throw error;

      toast({
        title: 'Ticket créé',
        description: 'Le ticket a été créé avec succès',
      });

      onSuccess();
      onOpenChange(false);
      setFormData({
        eleve_id: '',
        sujet: '',
        priorite: 'normale',
      });
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-4 border-black rounded-3xl bg-white">
        <DialogHeader>
          <DialogTitle className="text-3xl font-black">CRÉER UN TICKET</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-black uppercase mb-2">Élève *</label>
            <select
              required
              value={formData.eleve_id}
              onChange={(e) => setFormData({ ...formData, eleve_id: e.target.value })}
              className="h-12 px-4 border-4 border-black rounded-xl font-bold text-base w-full"
            >
              <option value="">Sélectionner un élève</option>
              {eleves?.map((eleve) => (
                <option key={eleve.id} value={eleve.id}>
                  {eleve.nom} {eleve.prenom} - {eleve.email}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-black uppercase mb-2">Sujet *</label>
            <input
              type="text"
              required
              value={formData.sujet}
              onChange={(e) => setFormData({ ...formData, sujet: e.target.value })}
              className="h-12 px-4 border-4 border-black rounded-xl font-bold text-base w-full"
              placeholder="Résumé du problème"
            />
          </div>

          <div>
            <label className="block text-sm font-black uppercase mb-2">Priorité *</label>
            <select
              required
              value={formData.priorite}
              onChange={(e) => setFormData({ ...formData, priorite: e.target.value })}
              className="h-12 px-4 border-4 border-black rounded-xl font-bold text-base w-full"
            >
              <option value="basse">Basse</option>
              <option value="normale">Normale</option>
              <option value="haute">Haute</option>
              <option value="urgente">Urgente</option>
            </select>
          </div>

          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 brutal-button bg-primary text-primary-foreground"
            >
              {loading ? 'CRÉATION...' : 'CRÉER'}
            </Button>
            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex-1 brutal-button bg-secondary text-secondary-foreground"
            >
              ANNULER
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
