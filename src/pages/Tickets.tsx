import { AppLayout } from '@/components/layout/AppLayout';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MessageSquare, Plus, AlertCircle, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { CreerTicketDialog } from '@/components/tickets/CreerTicketDialog';
import { DetailTicketDialog } from '@/components/tickets/DetailTicketDialog';
import { AssignerTicketDialog } from '@/components/tickets/AssignerTicketDialog';

export default function Tickets() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [assignTicket, setAssignTicket] = useState<any>(null);

  const { data: tickets, refetch } = useQuery({
    queryKey: ['tickets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          eleves (nom, prenom, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Récupérer les profiles pour les assignations
      if (data && data.length > 0) {
        const userIds = data.map(t => t.assigne_a).filter(Boolean);
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, nom, prenom')
            .in('user_id', userIds);

          // Mapper les profiles aux tickets
          return data.map(ticket => ({
            ...ticket,
            assigne_profile: profiles?.find((p: any) => p.user_id === ticket.assigne_a) as any,
          }));
        }
      }

      return data as any;
    },
  });

  const stats = {
    ouverts: tickets?.filter(t => t.statut === 'ouvert').length || 0,
    enCours: tickets?.filter(t => t.statut === 'en_cours').length || 0,
    fermes: tickets?.filter(t => t.statut === 'ferme').length || 0,
    total: tickets?.length || 0,
  };

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'ouvert': return 'bg-yellow-200 border-yellow-600';
      case 'en_cours': return 'bg-blue-200 border-blue-600';
      case 'ferme': return 'bg-green-200 border-green-600';
      default: return 'bg-gray-200 border-gray-600';
    }
  };

  const getPrioriteColor = (priorite: string) => {
    switch (priorite) {
      case 'urgente': return 'bg-red-200 border-red-600';
      case 'haute': return 'bg-orange-200 border-orange-600';
      case 'normale': return 'bg-blue-200 border-blue-600';
      case 'basse': return 'bg-gray-200 border-gray-600';
      default: return 'bg-gray-200 border-gray-600';
    }
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-6xl font-black mb-2">TICKETS DE SUPPORT</h1>
            <p className="text-2xl font-bold text-muted-foreground">Gestion des demandes élèves</p>
          </div>
          <button
            onClick={() => setShowCreateDialog(true)}
            className="brutal-button bg-primary text-primary-foreground flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            NOUVEAU TICKET
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="brutal-card p-6 bg-gradient-to-br from-yellow-100 to-yellow-50">
            <p className="text-sm font-bold uppercase mb-2">Ouverts</p>
            <p className="text-4xl font-black">{stats.ouverts}</p>
          </div>
          <div className="brutal-card p-6 bg-gradient-to-br from-blue-100 to-blue-50">
            <p className="text-sm font-bold uppercase mb-2">En cours</p>
            <p className="text-4xl font-black">{stats.enCours}</p>
          </div>
          <div className="brutal-card p-6 bg-gradient-to-br from-green-100 to-green-50">
            <p className="text-sm font-bold uppercase mb-2">Fermés</p>
            <p className="text-4xl font-black">{stats.fermes}</p>
          </div>
          <div className="brutal-card p-6 bg-gradient-to-br from-cyan-100 to-cyan-50">
            <p className="text-sm font-bold uppercase mb-2">Total</p>
            <p className="text-4xl font-black">{stats.total}</p>
          </div>
        </div>

        <div className="brutal-card overflow-hidden">
          <table className="w-full">
            <thead className="bg-black text-white">
              <tr>
                <th className="px-6 py-4 text-left font-black text-lg uppercase">Sujet</th>
                <th className="px-6 py-4 text-left font-black text-lg uppercase">Élève</th>
                <th className="px-6 py-4 text-left font-black text-lg uppercase">Assigné à</th>
                <th className="px-6 py-4 text-center font-black text-lg uppercase">Priorité</th>
                <th className="px-6 py-4 text-center font-black text-lg uppercase">Statut</th>
                <th className="px-6 py-4 text-center font-black text-lg uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y-2 divide-black">
              {!tickets || tickets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="text-6xl">💬</div>
                      <p className="text-2xl font-black">AUCUN TICKET</p>
                      <p className="text-lg font-bold text-muted-foreground">
                        Les tickets de support apparaîtront ici
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-yellow-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-black text-lg">{ticket.sujet}</p>
                      <p className="text-sm font-medium text-muted-foreground">
                        {new Date(ticket.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-black">{ticket.eleves?.nom} {ticket.eleves?.prenom}</p>
                        <p className="text-sm font-medium text-muted-foreground">{ticket.eleves?.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {(ticket as any).assigne_profile ? (
                        <div>
                          <p className="font-bold">{(ticket as any).assigne_profile.nom} {(ticket as any).assigne_profile.prenom}</p>
                          <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                            ticket.niveau_escalade === 3 ? 'bg-red-200' :
                            ticket.niveau_escalade === 2 ? 'bg-orange-200' :
                            'bg-blue-200'
                          }`}>
                            Niveau {ticket.niveau_escalade || 1}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Non assigné</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block px-4 py-2 rounded-xl border-2 font-black text-sm ${getPrioriteColor(ticket.priorite)}`}>
                        {ticket.priorite.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block px-4 py-2 rounded-xl border-2 font-black text-sm ${getStatutColor(ticket.statut)}`}>
                        {ticket.statut.toUpperCase().replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => setAssignTicket(ticket)}
                          className="p-2 rounded-xl border-2 border-black hover:bg-purple-400 transition-colors"
                          title="Assigner"
                        >
                          <UserPlus className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setSelectedTicket(ticket)}
                          className="p-2 rounded-xl border-2 border-black hover:bg-cyan-400 transition-colors"
                          title="Voir détails"
                        >
                          <MessageSquare className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CreerTicketDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => refetch()}
      />

      {selectedTicket && (
        <DetailTicketDialog
          ticket={selectedTicket}
          open={!!selectedTicket}
          onOpenChange={(open) => !open && setSelectedTicket(null)}
          onSuccess={() => refetch()}
        />
      )}

      {assignTicket && (
        <AssignerTicketDialog
          ticket={assignTicket}
          open={!!assignTicket}
          onOpenChange={(open) => !open && setAssignTicket(null)}
          onSuccess={() => refetch()}
        />
      )}
    </AppLayout>
  );
}
