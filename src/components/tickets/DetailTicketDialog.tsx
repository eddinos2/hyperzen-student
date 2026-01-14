import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Send } from 'lucide-react';

interface DetailTicketDialogProps {
  ticket: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const DetailTicketDialog = ({ ticket, open, onOpenChange, onSuccess }: DetailTicketDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [statut, setStatut] = useState(ticket.statut);

  const { data: messages, refetch: refetchMessages } = useQuery({
    queryKey: ['ticket-messages', ticket.id],
    enabled: !!ticket.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages_ticket')
        .select('*')
        .eq('ticket_id', ticket.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from('messages_ticket').insert({
        ticket_id: ticket.id,
        user_id: user?.id,
        message: message.trim(),
      });

      if (error) throw error;

      setMessage('');
      refetchMessages();
      
      toast({
        title: 'Message envoyé',
        description: 'Votre message a été ajouté au ticket',
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

  const handleUpdateStatut = async () => {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ statut, updated_at: new Date().toISOString() })
        .eq('id', ticket.id);

      if (error) throw error;

      toast({
        title: 'Statut mis à jour',
        description: 'Le statut du ticket a été modifié',
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl border-4 border-black rounded-3xl bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl font-black">{ticket.sujet}</DialogTitle>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-sm font-bold">
              {ticket.eleves?.nom} {ticket.eleves?.prenom}
            </span>
            <span className="text-xs font-bold px-3 py-1 rounded-lg border-2 border-black bg-yellow-200">
              {ticket.priorite.toUpperCase()}
            </span>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Changement de statut */}
          <div className="brutal-card p-4 bg-gradient-to-br from-cyan-100 to-cyan-50">
            <div className="flex items-center gap-4">
              <label className="text-sm font-black uppercase">Statut :</label>
              <select
                value={statut}
                onChange={(e) => setStatut(e.target.value)}
                className="h-10 px-4 border-4 border-black rounded-xl font-bold text-sm"
              >
                <option value="ouvert">Ouvert</option>
                <option value="en_cours">En cours</option>
                <option value="ferme">Fermé</option>
              </select>
              <Button
                onClick={handleUpdateStatut}
                className="brutal-button bg-primary text-primary-foreground"
              >
                METTRE À JOUR
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="brutal-card p-4 bg-white">
            <h3 className="text-xl font-black mb-4">MESSAGES</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto mb-4">
              {!messages || messages.length === 0 ? (
                <p className="text-center text-sm font-bold text-muted-foreground py-8">
                  Aucun message pour le moment
                </p>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className="brutal-card p-3 bg-gradient-to-br from-yellow-50 to-yellow-100">
                    <p className="text-sm font-bold">{msg.message}</p>
                    <p className="text-xs font-medium text-muted-foreground mt-1">
                      {new Date(msg.created_at).toLocaleString('fr-FR')}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Nouveau message */}
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Votre message..."
                className="flex-1 min-h-20 px-4 py-3 border-4 border-black rounded-xl font-bold text-base resize-none"
              />
              <Button
                type="submit"
                disabled={loading || !message.trim()}
                className="brutal-button bg-primary text-primary-foreground"
              >
                <Send className="w-5 h-5" />
              </Button>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
