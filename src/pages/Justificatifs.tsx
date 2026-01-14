import { AppLayout } from '@/components/layout/AppLayout';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FileCheck, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useState } from 'react';
import { TraiterJustificatifDialog } from '@/components/justificatifs/TraiterJustificatifDialog';

export default function Justificatifs() {
  const [selectedJustificatif, setSelectedJustificatif] = useState<any>(null);

  const { data: justificatifs, refetch } = useQuery({
    queryKey: ['justificatifs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('justificatifs')
        .select(`
          *,
          eleves (nom, prenom, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const stats = {
    enAttente: justificatifs?.filter(j => j.statut === 'en_attente').length || 0,
    acceptes: justificatifs?.filter(j => j.statut === 'accepte').length || 0,
    refuses: justificatifs?.filter(j => j.statut === 'refuse').length || 0,
    total: justificatifs?.length || 0,
  };

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'en_attente': return 'bg-yellow-200 border-yellow-600';
      case 'accepte': return 'bg-green-200 border-green-600';
      case 'refuse': return 'bg-red-200 border-red-600';
      default: return 'bg-gray-200 border-gray-600';
    }
  };

  const getStatutIcon = (statut: string) => {
    switch (statut) {
      case 'en_attente': return <Clock className="w-5 h-5" />;
      case 'accepte': return <CheckCircle className="w-5 h-5" />;
      case 'refuse': return <XCircle className="w-5 h-5" />;
      default: return null;
    }
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-6xl font-black mb-2">JUSTIFICATIFS</h1>
            <p className="text-2xl font-bold text-muted-foreground">Validation des documents élèves</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="brutal-card p-6 bg-gradient-to-br from-yellow-100 to-yellow-50">
            <p className="text-sm font-bold uppercase mb-2">En attente</p>
            <p className="text-4xl font-black">{stats.enAttente}</p>
          </div>
          <div className="brutal-card p-6 bg-gradient-to-br from-green-100 to-green-50">
            <p className="text-sm font-bold uppercase mb-2">Acceptés</p>
            <p className="text-4xl font-black">{stats.acceptes}</p>
          </div>
          <div className="brutal-card p-6 bg-gradient-to-br from-red-100 to-red-50">
            <p className="text-sm font-bold uppercase mb-2">Refusés</p>
            <p className="text-4xl font-black">{stats.refuses}</p>
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
                <th className="px-6 py-4 text-left font-black text-lg uppercase">Élève</th>
                <th className="px-6 py-4 text-left font-black text-lg uppercase">Type</th>
                <th className="px-6 py-4 text-left font-black text-lg uppercase">Message</th>
                <th className="px-6 py-4 text-center font-black text-lg uppercase">Date</th>
                <th className="px-6 py-4 text-center font-black text-lg uppercase">Statut</th>
                <th className="px-6 py-4 text-center font-black text-lg uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y-2 divide-black">
              {!justificatifs || justificatifs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="text-6xl">📄</div>
                      <p className="text-2xl font-black">AUCUN JUSTIFICATIF</p>
                      <p className="text-lg font-bold text-muted-foreground">
                        Les justificatifs apparaîtront ici
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                justificatifs.map((justificatif) => (
                  <tr key={justificatif.id} className="hover:bg-yellow-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-black">{justificatif.eleves?.nom} {justificatif.eleves?.prenom}</p>
                        <p className="text-sm font-medium text-muted-foreground">{justificatif.eleves?.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-block px-3 py-1 rounded-lg border-2 border-black font-bold text-sm bg-cyan-200">
                        {justificatif.type_justificatif || 'Document'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium line-clamp-2">{justificatif.message || '-'}</p>
                    </td>
                    <td className="px-6 py-4 text-center font-bold">
                      {new Date(justificatif.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 font-black text-sm ${getStatutColor(justificatif.statut)}`}>
                        {getStatutIcon(justificatif.statut)}
                        {justificatif.statut.toUpperCase().replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => setSelectedJustificatif(justificatif)}
                        className="p-2 rounded-xl border-2 border-black hover:bg-cyan-400 transition-colors"
                      >
                        <FileCheck className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedJustificatif && (
        <TraiterJustificatifDialog
          justificatif={selectedJustificatif}
          open={!!selectedJustificatif}
          onOpenChange={(open) => !open && setSelectedJustificatif(null)}
          onSuccess={() => refetch()}
        />
      )}
    </AppLayout>
  );
}
