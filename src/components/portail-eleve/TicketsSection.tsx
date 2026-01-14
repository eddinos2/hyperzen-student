import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MessageSquare, Send, Plus } from 'lucide-react';
import { formaterDate } from '@/lib/calculs';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface TicketsSectionProps {
  eleveId: string;
  userId: string;
}

export function TicketsSection({ eleveId, userId }: TicketsSectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [newTicketOpen, setNewTicketOpen] = useState(false);

  const { data: tickets } = useQuery({
    queryKey: ['eleve-tickets', eleveId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('eleve_id', eleveId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: messages } = useQuery({
    queryKey: ['ticket-messages', selectedTicket],
    enabled: !!selectedTicket,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages_ticket')
        .select('*')
        .eq('ticket_id', selectedTicket)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const createTicketMutation = useMutation({
    mutationFn: async (data: { sujet: string; message: string }) => {
      // Créer le ticket
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .insert({
          eleve_id: eleveId,
          sujet: data.sujet,
          statut: 'ouvert',
          priorite: 'normale',
        })
        .select()
        .single();

      if (ticketError) throw ticketError;

      // Ajouter le premier message
      const { error: messageError } = await supabase
        .from('messages_ticket')
        .insert({
          ticket_id: ticket.id,
          user_id: userId,
          message: data.message,
        });

      if (messageError) throw messageError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eleve-tickets'] });
      setNewTicketOpen(false);
      toast({
        title: 'Ticket créé',
        description: 'Votre demande sera traitée rapidement',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { ticketId: string; message: string }) => {
      const { error } = await supabase
        .from('messages_ticket')
        .insert({
          ticket_id: data.ticketId,
          user_id: userId,
          message: data.message,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-messages'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleCreateTicket = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const sujet = formData.get('sujet') as string;
    const message = formData.get('message') as string;

    if (!sujet || !message) return;

    await createTicketMutation.mutateAsync({ sujet, message });
    e.currentTarget.reset();
  };

  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedTicket) return;

    const formData = new FormData(e.currentTarget);
    const message = formData.get('message') as string;

    if (!message) return;

    await sendMessageMutation.mutateAsync({ ticketId: selectedTicket, message });
    e.currentTarget.reset();
  };

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'resolu':
        return 'from-green-100 to-green-50 border-green-600';
      case 'ferme':
        return 'from-gray-100 to-gray-50 border-gray-600';
      default:
        return 'from-yellow-100 to-yellow-50 border-yellow-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Bouton nouveau ticket */}
      <Dialog open={newTicketOpen} onOpenChange={setNewTicketOpen}>
        <DialogTrigger asChild>
          <button className="brutal-button bg-primary text-primary-foreground w-full flex items-center justify-center gap-2">
            <Plus className="w-5 h-5" />
            NOUVEAU TICKET
          </button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">CRÉER UN TICKET</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateTicket} className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-black uppercase mb-2">Sujet</label>
              <input
                type="text"
                name="sujet"
                required
                className="w-full h-12 px-4 border-4 border-black rounded-xl font-bold"
                placeholder="Ex: Question sur mon dossier"
              />
            </div>
            <div>
              <label className="block text-sm font-black uppercase mb-2">Message</label>
              <textarea
                name="message"
                required
                rows={4}
                className="w-full px-4 py-3 border-4 border-black rounded-xl font-bold resize-none"
                placeholder="Décrivez votre demande..."
              />
            </div>
            <button
              type="submit"
              disabled={createTicketMutation.isPending}
              className="brutal-button bg-primary text-primary-foreground w-full"
            >
              {createTicketMutation.isPending ? 'CRÉATION...' : 'CRÉER'}
            </button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Liste des tickets */}
      <div>
        {!tickets || tickets.length === 0 ? (
          <div className="text-center py-12 brutal-card bg-gradient-to-br from-gray-50 to-gray-100">
            <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-black">Aucun ticket</p>
            <p className="text-sm font-bold text-muted-foreground mt-2">
              Créez un ticket pour contacter l'administration
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <Dialog key={ticket.id}>
                <DialogTrigger asChild>
                  <button
                    className={`w-full text-left brutal-card p-6 bg-gradient-to-br border-4 ${getStatutColor(
                      ticket.statut
                    )} hover:shadow-lg transition-shadow`}
                    onClick={() => setSelectedTicket(ticket.id)}
                  >
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h3 className="text-lg font-black">{ticket.sujet}</h3>
                      <span className="text-sm font-bold text-muted-foreground whitespace-nowrap">
                        {formaterDate(ticket.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-lg border-2 border-black bg-white text-xs font-black">
                        {ticket.statut.toUpperCase()}
                      </span>
                      <span className="px-3 py-1 rounded-lg border-2 border-black bg-white text-xs font-black">
                        {ticket.priorite.toUpperCase()}
                      </span>
                    </div>
                  </button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-black">{ticket.sujet}</DialogTitle>
                  </DialogHeader>
                  
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto space-y-4 my-4">
                    {messages?.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-4 rounded-xl border-2 border-black ${
                          msg.user_id === userId
                            ? 'bg-cyan-100 ml-8'
                            : 'bg-white mr-8'
                        }`}
                      >
                        <p className="text-sm font-bold mb-1">{msg.message}</p>
                        <p className="text-xs font-bold text-muted-foreground">
                          {formaterDate(msg.created_at)}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Formulaire réponse */}
                  {ticket.statut === 'ouvert' && (
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                      <input
                        type="text"
                        name="message"
                        required
                        className="flex-1 h-12 px-4 border-4 border-black rounded-xl font-bold"
                        placeholder="Votre message..."
                      />
                      <button
                        type="submit"
                        disabled={sendMessageMutation.isPending}
                        className="brutal-button bg-primary text-primary-foreground flex items-center gap-2"
                      >
                        <Send className="w-4 h-4" />
                        ENVOYER
                      </button>
                    </form>
                  )}
                </DialogContent>
              </Dialog>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}