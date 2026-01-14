import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, XCircle, FileCheck } from 'lucide-react';
import { formaterMontant, formaterDate } from '@/lib/calculs';

export default function SuiviDocuments() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [moyenFilter, setMoyenFilter] = useState<string>('all');

  const { data: reglements, isLoading } = useQuery({
    queryKey: ['reglements-en-attente', moyenFilter],
    queryFn: async () => {
      let query = supabase
        .from('reglements')
        .select(`
          *,
          dossiers_scolarite!inner(
            eleves!inner(nom, prenom, email, immatriculation)
          )
        `)
        .eq('statut', 'en_attente')
        .order('date_reglement', { ascending: true });

      if (moyenFilter !== 'all') {
        query = query.eq('moyen_paiement', moyenFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const validerReglement = useMutation({
    mutationFn: async (reglementId: string) => {
      const { error } = await supabase
        .from('reglements')
        .update({ statut: 'valide' })
        .eq('id', reglementId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reglements-en-attente'] });
      toast({
        title: '✅ Document validé',
        description: 'Le règlement a été marqué comme reçu',
      });
    },
  });

  const rejeterReglement = useMutation({
    mutationFn: async (reglementId: string) => {
      const { error } = await supabase
        .from('reglements')
        .update({ statut: 'refuse' })
        .eq('id', reglementId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reglements-en-attente'] });
      toast({
        title: '❌ Document rejeté',
        description: 'Le règlement a été marqué comme refusé',
        variant: 'destructive',
      });
    },
  });

  const stats = {
    total: reglements?.length || 0,
    cheques: reglements?.filter(r => r.moyen_paiement === 'Chèque').length || 0,
    prelevements: reglements?.filter(r => r.moyen_paiement === 'Prélèvement').length || 0,
    totalMontant: reglements?.reduce((sum, r) => sum + Number(r.montant), 0) || 0,
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-black">📋 SUIVI DES DOCUMENTS</h1>
          <p className="text-muted-foreground mt-2">
            Règlements en attente de réception (chèques, mandats de prélèvement...)
          </p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="brutal-card bg-yellow-50">
            <div className="text-3xl font-black mb-1">{stats.total}</div>
            <div className="text-sm text-muted-foreground font-bold">Documents en attente</div>
          </div>
          <div className="brutal-card bg-blue-50">
            <div className="text-3xl font-black mb-1">{stats.cheques}</div>
            <div className="text-sm text-muted-foreground font-bold">Chèques attendus</div>
          </div>
          <div className="brutal-card bg-green-50">
            <div className="text-3xl font-black mb-1">{stats.prelevements}</div>
            <div className="text-sm text-muted-foreground font-bold">Mandats attendus</div>
          </div>
          <div className="brutal-card bg-purple-50">
            <div className="text-3xl font-black mb-1">{formaterMontant(stats.totalMontant)}</div>
            <div className="text-sm text-muted-foreground font-bold">Montant total</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <span className="font-bold">Filtrer par moyen:</span>
            <Select value={moyenFilter} onValueChange={setMoyenFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les moyens</SelectItem>
                <SelectItem value="Chèque">Chèque</SelectItem>
                <SelectItem value="Prélèvement">Prélèvement</SelectItem>
                <SelectItem value="Virement">Virement</SelectItem>
                <SelectItem value="CB">CB</SelectItem>
                <SelectItem value="Espèces">Espèces</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <div className="brutal-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-black">
                  <th className="text-left p-3 font-black">Élève</th>
                  <th className="text-left p-3 font-black">Immatriculation</th>
                  <th className="text-left p-3 font-black">Moyen</th>
                  <th className="text-left p-3 font-black">Montant</th>
                  <th className="text-left p-3 font-black">Date prévue</th>
                  <th className="text-left p-3 font-black">N° Pièce</th>
                  <th className="text-left p-3 font-black">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={7} className="text-center p-8">
                      Chargement...
                    </td>
                  </tr>
                )}
                {!isLoading && reglements?.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center p-8 text-muted-foreground">
                      <FileCheck className="w-12 h-12 mx-auto mb-2 text-green-600" />
                      <p className="font-bold">Aucun document en attente</p>
                      <p className="text-sm">Tous les règlements ont été validés 🎉</p>
                    </td>
                  </tr>
                )}
                {reglements?.map((reglement: any) => (
                  <tr key={reglement.id} className="border-b border-border hover:bg-muted/50">
                    <td className="p-3">
                      <div className="font-bold">
                        {reglement.dossiers_scolarite.eleves.prenom}{' '}
                        {reglement.dossiers_scolarite.eleves.nom}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {reglement.dossiers_scolarite.eleves.email}
                      </div>
                    </td>
                    <td className="p-3 font-mono text-sm">
                      {reglement.dossiers_scolarite.eleves.immatriculation}
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className="font-bold">
                        {reglement.moyen_paiement}
                      </Badge>
                    </td>
                    <td className="p-3 font-black text-lg">
                      {formaterMontant(reglement.montant)}
                    </td>
                    <td className="p-3">{formaterDate(reglement.date_reglement)}</td>
                    <td className="p-3 font-mono text-sm">
                      {reglement.numero_piece || '-'}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-green-600 text-green-600 hover:bg-green-50"
                          onClick={() => validerReglement.mutate(reglement.id)}
                          disabled={validerReglement.isPending}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Reçu
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-600 text-red-600 hover:bg-red-50"
                          onClick={() => rejeterReglement.mutate(reglement.id)}
                          disabled={rejeterReglement.isPending}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Rejeté
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
