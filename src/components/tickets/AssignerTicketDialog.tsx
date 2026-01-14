import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

interface AssignerTicketDialogProps {
  ticket: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AssignerTicketDialog({ ticket, open, onOpenChange, onSuccess }: AssignerTicketDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [assigneA, setAssigneA] = useState(ticket.assigne_a || '');
  const [niveauEscalade, setNiveauEscalade] = useState(ticket.niveau_escalade || 1);

  // Récupérer les utilisateurs (admins et gestionnaires)
  const { data: users } = useQuery({
    queryKey: ['users-assignable'],
    queryFn: async () => {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, nom, prenom, email, role')
        .in('role', ['admin', 'gestionnaire'])
        .order('nom');

      return profiles || [];
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updateData: any = {
        assigne_a: assigneA || null,
        niveau_escalade: niveauEscalade,
      };

      // Si on escalade, mettre à jour la date
      if (niveauEscalade > (ticket.niveau_escalade || 1)) {
        updateData.date_escalade = new Date().toISOString();
      }

      // Si on assigne, changer le statut en "en_cours"
      if (assigneA && ticket.statut === 'ouvert') {
        updateData.statut = 'en_cours';
      }

      const { error } = await supabase
        .from('tickets')
        .update(updateData)
        .eq('id', ticket.id);

      if (error) throw error;

      toast({
        title: 'Ticket assigné',
        description: 'Le ticket a été assigné avec succès',
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
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black">Assigner le ticket</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Assigner à</Label>
            <Select value={assigneA} onValueChange={setAssigneA}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un utilisateur" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Non assigné</SelectItem>
                {users?.map((user) => (
                  <SelectItem key={user.user_id} value={user.user_id}>
                    {user.nom} {user.prenom} ({user.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Niveau d'escalade</Label>
            <Select
              value={niveauEscalade.toString()}
              onValueChange={(v) => setNiveauEscalade(parseInt(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Niveau 1 - Campus</SelectItem>
                <SelectItem value="2">Niveau 2 - Administration</SelectItem>
                <SelectItem value="3">Niveau 3 - Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading} className="brutal-button">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Assigner
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}