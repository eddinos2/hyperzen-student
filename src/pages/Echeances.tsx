import { AppLayout } from '@/components/layout/AppLayout';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Plus, CheckCircle, Download } from 'lucide-react';
import { formaterMontant, formaterDate } from '@/lib/calculs';
import { SelectionEleveDialog } from '@/components/echeances/SelectionEleveDialog';
import { MarquerPayeeDialog } from '@/components/echeances/MarquerPayeeDialog';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { exportEcheancesToCSV } from '@/lib/export-utils';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { useQueryParams } from '@/hooks/useQueryParams';
import { TableSkeleton } from '@/components/ui/TableSkeleton';

export default function Echeances() {
  const { toast } = useToast();
  const { getParam, setParams } = useQueryParams();
  
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(Number(getParam('page', '1')));
  const [pageSize, setPageSize] = useState(Number(getParam('size', '50')));
  const [echeanceToMark, setEcheanceToMark] = useState<any>(null);

  useEffect(() => {
    setParams({ page: currentPage, size: pageSize });
  }, [currentPage, pageSize]);
  
  const { data: result, isLoading, refetch } = useQuery({
    queryKey: ['echeances', currentPage, pageSize],
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    queryFn: async () => {
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await supabase
        .from('echeances')
        .select(`
          id, montant, date_echeance, statut, dossier_id,
          dossiers_scolarite (
            eleve_id,
            eleves (nom, prenom, email)
          )
        `, { count: 'exact' })
        .order('date_echeance', { ascending: true })
        .range(from, to);

      if (error) throw error;
      return { data: data || [], count: count || 0 };
    },
  });

  const echeances = result?.data;
  const totalPages = Math.ceil((result?.count || 0) / pageSize);

  // Requête séparée pour les stats (optimisée avec agrégation SQL)
  const { data: statsData } = useQuery({
    queryKey: ['echeances-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('calculer_stats_echeances');
      if (error) throw error;
      
      const result = data?.[0];
      return {
        aVenir: result?.a_venir || 0,
        enRetard: result?.en_retard || 0,
        payees: result?.payees || 0,
        montantAVenir: result?.montant_a_venir || 0,
        total: result?.total_count || 0,
      };
    },
  });

  const stats = statsData || {
    aVenir: 0,
    enRetard: 0,
    payees: 0,
    montantAVenir: 0,
    total: 0,
  };

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'payee': return 'bg-green-200 border-green-600';
      case 'en_retard': return 'bg-red-200 border-red-600';
      case 'a_venir': return 'bg-yellow-200 border-yellow-600';
      case 'annulee': return 'bg-gray-200 border-gray-600';
      default: return 'bg-white border-black';
    }
  };

  const handleMarquerPayee = (echeance: any) => {
    setEcheanceToMark(echeance);
  };

  const handleExportPage = () => {
    if (!echeances || echeances.length === 0) {
      toast({
        title: 'Aucune donnée',
        description: 'Il n\'y a aucune échéance à exporter',
        variant: 'destructive',
      });
      return;
    }
    exportEcheancesToCSV(echeances);
    toast({
      title: 'Export réussi',
      description: `${echeances.length} échéance(s) exportée(s)`,
    });
  };

  const handleExportAll = async () => {
    try {
      toast({
        title: 'Export en cours...',
        description: 'Récupération de toutes les échéances',
      });

      const { data, error } = await supabase
        .from('echeances')
        .select(`
          id, montant, date_echeance, statut, dossier_id,
          dossiers_scolarite (
            eleve_id,
            eleves (nom, prenom, email)
          )
        `)
        .order('date_echeance', { ascending: true });

      if (error) throw error;

      exportEcheancesToCSV(data || []);
      toast({
        title: 'Export complet réussi',
        description: `${data?.length || 0} échéance(s) exportée(s)`,
      });
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    }
  };
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
<div>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-6xl font-black mb-2">ÉCHÉANCES</h1>
            <p className="text-2xl font-bold text-muted-foreground">Planification et suivi des paiements</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button 
              onClick={() => setShowGenerateDialog(true)}
              className="brutal-button bg-primary text-primary-foreground flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              GÉNÉRER
            </button>
            <button
              onClick={handleExportPage}
              className="brutal-button bg-secondary text-secondary-foreground flex items-center gap-2"
            >
              <Download className="w-5 h-5" />
              <span className="hidden sm:inline">EXPORTER PAGE</span>
              <span className="sm:hidden">PAGE</span>
            </button>
            <button 
              onClick={handleExportAll}
              className="brutal-button bg-accent text-accent-foreground flex items-center gap-2"
            >
              <Download className="w-5 h-5" />
              <span className="hidden sm:inline">EXPORTER TOUT</span>
              <span className="sm:hidden">TOUT</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="brutal-card p-6 bg-gradient-to-br from-yellow-100 to-yellow-50">
            <p className="text-sm font-bold uppercase mb-2">À venir</p>
            <p className="text-4xl font-black">{stats.aVenir}</p>
            <p className="text-lg font-bold mt-2">{formaterMontant(stats.montantAVenir)}</p>
          </div>
          <div className="brutal-card p-6 bg-gradient-to-br from-red-100 to-red-50">
            <p className="text-sm font-bold uppercase mb-2">En retard</p>
            <p className="text-4xl font-black">{stats.enRetard}</p>
          </div>
          <div className="brutal-card p-6 bg-gradient-to-br from-green-100 to-green-50">
            <p className="text-sm font-bold uppercase mb-2">Payées</p>
            <p className="text-4xl font-black">{stats.payees}</p>
          </div>
          <div className="brutal-card p-6 bg-gradient-to-br from-cyan-100 to-cyan-50">
            <p className="text-sm font-bold uppercase mb-2">Total</p>
            <p className="text-4xl font-black">{stats.total}</p>
          </div>
        </div>

        <div className="brutal-card overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-black text-white">
              <tr>
                <th className="px-4 sm:px-6 py-3 sm:py-4 text-left font-black text-sm sm:text-lg uppercase">Élève</th>
                <th className="px-4 sm:px-6 py-3 sm:py-4 text-left font-black text-sm sm:text-lg uppercase">Date échéance</th>
                <th className="px-4 sm:px-6 py-3 sm:py-4 text-right font-black text-sm sm:text-lg uppercase">Montant</th>
                <th className="px-4 sm:px-6 py-3 sm:py-4 text-center font-black text-sm sm:text-lg uppercase">Statut</th>
                <th className="px-4 sm:px-6 py-3 sm:py-4 text-center font-black text-sm sm:text-lg uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y-2 divide-black">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-6">
                    <TableSkeleton rows={pageSize} columns={5} />
                  </td>
                </tr>
              ) : !echeances || echeances.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="text-6xl">📅</div>
                      <p className="text-2xl font-black">AUCUNE ÉCHÉANCE</p>
                      <p className="text-lg font-bold text-muted-foreground">
                        Générez des échéances pour vos élèves
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                echeances.map((echeance) => {
                  const eleve = (echeance.dossiers_scolarite?.eleves as any);
                  return (
                    <tr key={echeance.id} className="hover:bg-yellow-50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-black">{eleve?.nom} {eleve?.prenom}</p>
                          <p className="text-sm font-medium text-muted-foreground">{eleve?.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold">{formaterDate(echeance.date_echeance)}</td>
                      <td className="px-6 py-4 text-right font-black text-xl">
                        {formaterMontant(echeance.montant)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-block px-4 py-2 rounded-xl border-2 font-black text-sm ${getStatutColor(echeance.statut)}`}>
                          {echeance.statut.toUpperCase().replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {echeance.statut === 'a_venir' && (
                          <button 
                            onClick={() => handleMarquerPayee(echeance)}
                            className="p-2 rounded-xl border-2 border-black hover:bg-green-400 transition-colors"
                            title="Marquer comme payée"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="font-bold">Afficher:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="brutal-input h-10 px-3"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        onClick={() => setCurrentPage(pageNum)}
                        isActive={currentPage === pageNum}
                        className="cursor-pointer"
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
            <div className="font-bold">
              Page {currentPage} sur {totalPages}
            </div>
          </div>
        )}
      </div>
      </div>

      <SelectionEleveDialog
        open={showGenerateDialog}
        onOpenChange={setShowGenerateDialog}
        onSuccess={() => refetch()}
      />
      
      {echeanceToMark && (
        <MarquerPayeeDialog
          echeance={echeanceToMark}
          open={!!echeanceToMark}
          onOpenChange={(open) => !open && setEcheanceToMark(null)}
          onSuccess={() => {
            refetch();
            setEcheanceToMark(null);
          }}
        />
      )}
    </AppLayout>
  );
}
