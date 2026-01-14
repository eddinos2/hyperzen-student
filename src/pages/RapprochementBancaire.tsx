import { AppLayout } from '@/components/layout/AppLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Download, CheckCircle2, XCircle, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function RapprochementBancaire() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedReglements, setSelectedReglements] = useState<Set<string>>(new Set());
  const [moyenFilter, setMoyenFilter] = useState<'Chèque' | 'Prélèvement' | 'all'>('all');

  const { data: reglements, isLoading } = useQuery({
    queryKey: ['reglements-en-attente', moyenFilter],
    queryFn: async () => {
      let query = supabase
        .from('reglements')
        .select(`
          *,
          dossiers_scolarite!inner(
            eleves!inner(nom, prenom, email)
          )
        `)
        .eq('statut', 'en_attente')
        .order('date_reglement', { ascending: false });

      if (moyenFilter !== 'all') {
        query = query.eq('moyen_paiement', moyenFilter);
      } else {
        query = query.in('moyen_paiement', ['Chèque', 'Prélèvement']);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const validerReglements = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('reglements')
        .update({ statut: 'valide' })
        .in('id', ids);
      
      if (error) throw error;

      // Appeler la fonction de synchronisation pour chaque règlement
      for (const id of ids) {
        await supabase.functions.invoke('synchroniser-echeance-reglement', {
          body: { reglement_id: id }
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reglements-en-attente'] });
      setSelectedReglements(new Set());
      toast({
        title: 'Règlements validés',
        description: 'Les règlements ont été marqués comme encaissés',
      });
    },
  });

  const rejeterReglements = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('reglements')
        .update({ statut: 'refuse' })
        .in('id', ids);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reglements-en-attente'] });
      setSelectedReglements(new Set());
      toast({
        title: 'Règlements rejetés',
        description: 'Les règlements ont été marqués comme impayés',
        variant: 'destructive',
      });
    },
  });

  const handleSelectAll = () => {
    if (selectedReglements.size === reglements?.length) {
      setSelectedReglements(new Set());
    } else {
      setSelectedReglements(new Set(reglements?.map(r => r.id) || []));
    }
  };

  const handleSelectOne = (id: string) => {
    const newSelection = new Set(selectedReglements);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedReglements(newSelection);
  };

  const handleExportCSV = () => {
    if (!reglements || reglements.length === 0) return;

    const headers = ['Date', 'Élève', 'Moyen', 'N° Pièce', 'Montant', 'Statut'];
    const rows = reglements.map(r => [
      new Date(r.date_reglement).toLocaleDateString('fr-FR'),
      `${r.dossiers_scolarite.eleves.nom} ${r.dossiers_scolarite.eleves.prenom}`,
      r.moyen_paiement,
      r.numero_piece || '-',
      r.montant.toString(),
      r.statut,
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `rapprochement_${moyenFilter}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const stats = {
    total: reglements?.length || 0,
    montantTotal: reglements?.reduce((sum, r) => sum + r.montant, 0) || 0,
    selectionnes: selectedReglements.size,
    montantSelectionne: reglements
      ?.filter(r => selectedReglements.has(r.id))
      .reduce((sum, r) => sum + r.montant, 0) || 0,
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-6xl font-black mb-2">RAPPROCHEMENT BANCAIRE</h1>
          <p className="text-2xl font-bold text-muted-foreground">
            Validation des chèques et prélèvements en attente
          </p>
        </div>

        {/* Statistiques et filtres */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="brutal-card p-6 bg-gradient-to-br from-blue-100 to-blue-50">
            <p className="text-sm font-bold uppercase mb-2">En attente</p>
            <p className="text-4xl font-black">{stats.total}</p>
          </div>
          <div className="brutal-card p-6 bg-gradient-to-br from-green-100 to-green-50">
            <p className="text-sm font-bold uppercase mb-2">Montant total</p>
            <p className="text-3xl font-black">{stats.montantTotal.toLocaleString('fr-FR')} €</p>
          </div>
          <div className="brutal-card p-6 bg-gradient-to-br from-purple-100 to-purple-50">
            <p className="text-sm font-bold uppercase mb-2">Sélectionnés</p>
            <p className="text-4xl font-black">{stats.selectionnes}</p>
          </div>
          <div className="brutal-card p-6 bg-gradient-to-br from-orange-100 to-orange-50">
            <p className="text-sm font-bold uppercase mb-2">Montant sélectionné</p>
            <p className="text-3xl font-black">{stats.montantSelectionne.toLocaleString('fr-FR')} €</p>
          </div>
        </div>

        {/* Actions et filtres */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              <Select value={moyenFilter} onValueChange={(v: any) => setMoyenFilter(v)}>
                <SelectTrigger className="w-[200px] brutal-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="Chèque">Chèques</SelectItem>
                  <SelectItem value="Prélèvement">Prélèvements</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleExportCSV}
              disabled={!reglements || reglements.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Exporter CSV
            </Button>
            <Button
              onClick={() => rejeterReglements.mutate(Array.from(selectedReglements))}
              disabled={selectedReglements.size === 0}
              variant="destructive"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Rejeter ({selectedReglements.size})
            </Button>
            <Button
              onClick={() => validerReglements.mutate(Array.from(selectedReglements))}
              disabled={selectedReglements.size === 0}
              className="brutal-button bg-green-500"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Valider ({selectedReglements.size})
            </Button>
          </div>
        </div>

        {/* Tableau */}
        <div className="brutal-card">
          {isLoading ? (
            <div className="p-8 text-center">Chargement...</div>
          ) : !reglements || reglements.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Aucun règlement en attente
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-black">
                    <th className="p-3 text-left">
                      <Checkbox
                        checked={selectedReglements.size === reglements.length}
                        onCheckedChange={handleSelectAll}
                      />
                    </th>
                    <th className="text-left p-3 font-black">Date</th>
                    <th className="text-left p-3 font-black">Élève</th>
                    <th className="text-left p-3 font-black">Moyen</th>
                    <th className="text-left p-3 font-black">N° Pièce</th>
                    <th className="text-right p-3 font-black">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {reglements.map((reglement: any) => (
                    <tr
                      key={reglement.id}
                      className="border-b border-border hover:bg-muted/50 transition-colors"
                    >
                      <td className="p-3">
                        <Checkbox
                          checked={selectedReglements.has(reglement.id)}
                          onCheckedChange={() => handleSelectOne(reglement.id)}
                        />
                      </td>
                      <td className="p-3">
                        {new Date(reglement.date_reglement).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="p-3 font-bold">
                        {reglement.dossiers_scolarite.eleves.nom}{' '}
                        {reglement.dossiers_scolarite.eleves.prenom}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          reglement.moyen_paiement === 'Chèque' 
                            ? 'bg-blue-200' 
                            : 'bg-purple-200'
                        }`}>
                          {reglement.moyen_paiement}
                        </span>
                      </td>
                      <td className="p-3 font-mono">{reglement.numero_piece || '-'}</td>
                      <td className="p-3 text-right font-black">
                        {reglement.montant.toLocaleString('fr-FR')} €
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}