import { AppLayout } from '@/components/layout/AppLayout';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Search, Download, FileText, Edit, Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { formaterMontant, formaterDate } from '@/lib/calculs';
import { ModifierReglementDialog } from '@/components/reglements/ModifierReglementDialog';
import { AjouterReglementDialog } from '@/components/reglements/AjouterReglementDialog';
import { exportReglementsToCSV } from '@/lib/export-utils';
import { useToast } from '@/hooks/use-toast';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { useDebounce } from '@/hooks/useDebounce';
import { useQueryParams } from '@/hooks/useQueryParams';
import { TableSkeleton } from '@/components/ui/TableSkeleton';

export default function Reglements() {
  const { toast } = useToast();
  const { getParam, setParams } = useQueryParams();
  
  const [searchTerm, setSearchTerm] = useState(getParam('search', ''));
  const [currentPage, setCurrentPage] = useState(Number(getParam('page', '1')));
  const [pageSize, setPageSize] = useState(Number(getParam('size', '50')));
  const [filtreMoyen, setFiltreMoyen] = useState<string>(getParam('moyen', 'all'));
  const [filtreStatut, setFiltreStatut] = useState<string>(getParam('statut', 'all'));
  const [dateDebut, setDateDebut] = useState<string>(getParam('dateDebut', ''));
  const [dateFin, setDateFin] = useState<string>(getParam('dateFin', ''));
  const [reglementToEdit, setReglementToEdit] = useState<any>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  
  const debouncedSearch = useDebounce(searchTerm, 300);
 
  // Quand on tape une nouvelle recherche, on revient toujours à la page 1
  useEffect(() => {
    if (debouncedSearch) {
      setCurrentPage(1);
    }
  }, [debouncedSearch]);
 
  useEffect(() => {
    setParams({ 
      search: debouncedSearch, 
      page: currentPage, 
      size: pageSize, 
      moyen: filtreMoyen,
      statut: filtreStatut,
      dateDebut,
      dateFin
    });
  }, [debouncedSearch, currentPage, pageSize, filtreMoyen, filtreStatut, dateDebut, dateFin]);

  const { data: result, isLoading, refetch } = useQuery({
    queryKey: ['reglements', debouncedSearch, filtreMoyen, filtreStatut, dateDebut, dateFin, currentPage, pageSize],
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    queryFn: async () => {
      // Si recherche active, récupérer TOUS les règlements puis filtrer et paginer
      if (debouncedSearch) {
        // Paginer pour récupérer TOUS les règlements (pas limité à 1000)
        let allData: any[] = [];
        let searchFrom = 0;
        const batchSize = 1000;
        let hasMore = true;

        while (hasMore) {
          let query = supabase
            .from('reglements')
            .select(`
              id, montant, moyen_paiement, date_reglement, statut, numero_piece, commentaire, dossier_id, type_operation,
              dossiers_scolarite (
                eleve_id,
                eleves (nom, prenom, email)
              )
            `)
            .order('date_reglement', { ascending: false })
            .range(searchFrom, searchFrom + batchSize - 1);

          if (filtreStatut !== 'all') query = query.eq('statut', filtreStatut);
          if (filtreMoyen !== 'all') query = query.eq('moyen_paiement', filtreMoyen);
          if (dateDebut) query = query.gte('date_reglement', dateDebut);
          if (dateFin) query = query.lte('date_reglement', dateFin);

          const { data, error } = await query;
          if (error) throw error;

          if (data && data.length > 0) {
            allData = [...allData, ...data];
            hasMore = data.length === batchSize;
            searchFrom += batchSize;
          } else {
            hasMore = false;
          }
        }

        // Filtrer par recherche
        const searchLower = debouncedSearch.toLowerCase();
        const filtered = allData.filter(r => {
          const dossier = r.dossiers_scolarite as any;
          const eleve = dossier?.eleves as any;
          
          const matchNom = eleve?.nom?.toLowerCase().includes(searchLower);
          const matchPrenom = eleve?.prenom?.toLowerCase().includes(searchLower);
          const matchEmail = eleve?.email?.toLowerCase().includes(searchLower);
          
          return matchNom || matchPrenom || matchEmail;
        });

        // Paginer les résultats filtrés
        const from = (currentPage - 1) * pageSize;
        const to = from + pageSize;
        const paginatedData = filtered.slice(from, to);

        return { data: paginatedData, count: filtered.length };
      }

      // Sans recherche, pagination côté serveur normale
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('reglements')
        .select(`
          id, montant, moyen_paiement, date_reglement, statut, numero_piece, commentaire, dossier_id, type_operation,
          dossiers_scolarite (
            eleve_id,
            eleves (nom, prenom, email)
          )
        `, { count: 'exact' })
        .order('date_reglement', { ascending: false })
        .range(from, to);

      if (filtreStatut !== 'all') query = query.eq('statut', filtreStatut);
      if (filtreMoyen !== 'all') query = query.eq('moyen_paiement', filtreMoyen);
      if (dateDebut) query = query.gte('date_reglement', dateDebut);
      if (dateFin) query = query.lte('date_reglement', dateFin);

      const { data, error, count } = await query;
      if (error) throw error;

      return { data: data || [], count: count || 0 };
    },
  });

  const reglements = result?.data;
  const totalPages = Math.ceil((result?.count || 0) / pageSize);

  const { data: stats } = useQuery({
    queryKey: ['reglements-stats', filtreMoyen],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('calculer_stats_reglements', { filtre_moyen: filtreMoyen });

      if (error) throw error;

      const result = data?.[0];
      return {
        total: result?.total_montant || 0,
        count: result?.nombre_reglements || 0,
        parMoyen: result?.par_moyen || {},
      };
    },
  });

  const filteredReglements = reglements;

  const handleExportPage = () => {
    if (!filteredReglements || filteredReglements.length === 0) {
      toast({
        title: 'Aucune donnée',
        description: 'Il n\'y a aucun règlement à exporter',
        variant: 'destructive',
      });
      return;
    }
    exportReglementsToCSV(filteredReglements);
    toast({
      title: 'Export réussi',
      description: `${filteredReglements.length} règlement(s) exporté(s)`,
    });
  };

  const handleExportAll = async () => {
    try {
      toast({
        title: 'Export en cours...',
        description: 'Récupération de tous les règlements',
      });

      let query = supabase
        .from('reglements')
        .select(`
          id, montant, moyen_paiement, date_reglement, statut, numero_piece, commentaire, dossier_id, type_operation,
          dossiers_scolarite (
            eleve_id,
            eleves (nom, prenom, email)
          )
        `)
        .order('date_reglement', { ascending: false });

      if (filtreStatut !== 'all') query = query.eq('statut', filtreStatut);
      if (filtreMoyen !== 'all') query = query.eq('moyen_paiement', filtreMoyen);
      if (dateDebut) query = query.gte('date_reglement', dateDebut);
      if (dateFin) query = query.lte('date_reglement', dateFin);

      const { data, error } = await query;
      if (error) throw error;

      let filteredData = data || [];
      if (debouncedSearch) {
        const searchLower = debouncedSearch.toLowerCase();
        filteredData = filteredData.filter(r => {
          const eleve = (r.dossiers_scolarite?.eleves as any);
          return (
            eleve?.nom?.toLowerCase().includes(searchLower) ||
            eleve?.prenom?.toLowerCase().includes(searchLower) ||
            eleve?.email?.toLowerCase().includes(searchLower)
          );
        });
      }

      exportReglementsToCSV(filteredData);
      toast({
        title: 'Export complet réussi',
        description: `${filteredData.length} règlement(s) exporté(s)`,
      });
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDownloadRecu = async (reglementId: string, reglementStatut: string) => {
    try {
      // Vérifier d'abord si le règlement est valide
      if (reglementStatut !== 'valide') {
        toast({
          title: 'Règlement non valide',
          description: 'Impossible de générer un reçu pour un règlement impayé, annulé ou en attente.',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Génération en cours',
        description: 'Préparation du reçu...',
      });

      const { data, error } = await supabase.functions.invoke('generer-recu-pdf', {
        body: { reglementId },
      });

      if (error) throw error;

      // Open print dialog with the generated HTML
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(data.html);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.print();
        }, 250);
      }

      toast({
        title: 'Reçu généré',
        description: 'Utilisez Ctrl+P ou Cmd+P pour imprimer ou sauvegarder en PDF',
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
            <h1 className="text-6xl font-black mb-2">RÈGLEMENTS</h1>
            <p className="text-2xl font-bold text-muted-foreground">Historique des paiements reçus</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button 
              onClick={() => setShowAddDialog(true)}
              className="brutal-button bg-primary text-primary-foreground flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              AJOUTER
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="brutal-card p-6 bg-gradient-to-br from-green-100 to-green-50">
            <p className="text-sm font-bold uppercase mb-2">Total encaissé</p>
            <p className="text-4xl font-black">{formaterMontant(stats?.total || 0)}</p>
          </div>
          <div className="brutal-card p-6 bg-gradient-to-br from-cyan-100 to-cyan-50">
            <p className="text-sm font-bold uppercase mb-2">Nombre de règlements</p>
            <p className="text-4xl font-black">{stats?.count || 0}</p>
          </div>
          <div className="brutal-card p-6 bg-gradient-to-br from-yellow-100 to-yellow-50">
            <p className="text-sm font-bold uppercase mb-2">Montant moyen</p>
            <p className="text-4xl font-black">
              {formaterMontant(stats?.count ? (stats.total / stats.count) : 0)}
            </p>
          </div>
        </div>

        <div className="brutal-card p-6 mb-6">
          <div className="flex flex-col gap-4">
            <div className="flex gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px] relative">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6" />
                <input
                  type="text"
                  placeholder="Rechercher un élève..."
                  className="brutal-input w-full pl-16"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select
                value={filtreMoyen}
                onChange={(e) => {
                  setFiltreMoyen(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-14 px-6 border-4 border-black rounded-2xl font-bold text-lg"
              >
                <option value="all">Tous les moyens</option>
                <option value="Chèque">Chèque</option>
                <option value="CB">CB</option>
                <option value="Virement">Virement</option>
                <option value="Prélèvement">Prélèvement</option>
                <option value="Espèce">Espèce</option>
              </select>
              <select
                value={filtreStatut}
                onChange={(e) => {
                  setFiltreStatut(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-14 px-6 border-4 border-black rounded-2xl font-bold text-lg"
              >
                <option value="all">Tous les statuts</option>
                <option value="valide">Valide</option>
                <option value="impaye">Impayé</option>
                <option value="annule">Annulé</option>
                <option value="en_attente">En attente</option>
                <option value="refuse">Refusé</option>
              </select>
            </div>
            <div className="flex gap-4 flex-wrap items-center">
              <div className="flex items-center gap-2">
                <label className="font-bold text-sm">Du:</label>
                <input
                  type="date"
                  value={dateDebut}
                  onChange={(e) => {
                    setDateDebut(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-14 px-4 border-4 border-black rounded-2xl font-bold"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="font-bold text-sm">Au:</label>
                <input
                  type="date"
                  value={dateFin}
                  onChange={(e) => {
                    setDateFin(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-14 px-4 border-4 border-black rounded-2xl font-bold"
                />
              </div>
              {(dateDebut || dateFin || filtreStatut !== 'all' || filtreMoyen !== 'all') && (
                <button
                  onClick={() => {
                    setDateDebut('');
                    setDateFin('');
                    setFiltreStatut('all');
                    setFiltreMoyen('all');
                    setCurrentPage(1);
                  }}
                  className="px-4 py-2 border-2 border-black rounded-xl font-bold hover:bg-red-100"
                >
                  Réinitialiser filtres
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="brutal-card overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-black text-white">
              <tr>
                <th className="px-4 sm:px-6 py-3 sm:py-4 text-left font-black text-sm sm:text-lg uppercase">Élève</th>
                <th className="px-4 sm:px-6 py-3 sm:py-4 text-left font-black text-sm sm:text-lg uppercase">Date</th>
                <th className="px-4 sm:px-6 py-3 sm:py-4 text-left font-black text-sm sm:text-lg uppercase">Moyen</th>
                <th className="px-4 sm:px-6 py-3 sm:py-4 text-right font-black text-sm sm:text-lg uppercase">Montant</th>
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
              ) : !filteredReglements || filteredReglements.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="text-6xl">💰</div>
                      <p className="text-2xl font-black">AUCUN RÈGLEMENT</p>
                      <p className="text-lg font-bold text-muted-foreground">
                        Les règlements apparaîtront après import
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredReglements.map((reglement) => {
                  const eleve = (reglement.dossiers_scolarite?.eleves as any);
                  const isRemboursement = reglement.type_operation === 'remboursement';
                  return (
                    <tr key={reglement.id} className={`transition-colors ${isRemboursement ? 'hover:bg-red-50' : 'hover:bg-yellow-50'}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {isRemboursement && (
                            <span className="text-xl" title="Remboursement">↩️</span>
                          )}
                          <div>
                            <p className="font-black">{eleve?.nom} {eleve?.prenom}</p>
                            <p className="text-sm font-medium text-muted-foreground">{eleve?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold">{formaterDate(reglement.date_reglement)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-4 py-2 rounded-xl border-2 border-black font-black text-sm ${isRemboursement ? 'bg-red-200' : 'bg-cyan-200'}`}>
                          {reglement.moyen_paiement}
                        </span>
                      </td>
                      <td className={`px-6 py-4 text-right font-black text-xl ${isRemboursement ? 'text-red-600' : ''}`}>
                        {isRemboursement ? '-' : ''}{formaterMontant(reglement.montant)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex gap-2 justify-center">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setReglementToEdit(reglement);
                            }}
                            className="p-2 rounded-xl border-2 border-black hover:bg-cyan-400 hover:text-white transition-colors"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadRecu(reglement.id, reglement.statut);
                            }}
                            className={`p-2 rounded-xl border-2 border-black transition-colors ${
                              reglement.statut === 'valide' 
                                ? 'hover:bg-black hover:text-white' 
                                : 'opacity-50 cursor-not-allowed'
                            }`}
                            title={reglement.statut === 'valide' ? 'Télécharger le reçu' : 'Reçu non disponible (règlement non valide)'}
                          >
                            <Download className="w-5 h-5" />
                          </button>
                        </div>
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

      <AjouterReglementDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={() => refetch()}
      />

      {reglementToEdit && (
        <ModifierReglementDialog
          reglement={reglementToEdit}
          open={!!reglementToEdit}
          onOpenChange={(open) => !open && setReglementToEdit(null)}
          onSuccess={() => refetch()}
        />
      )}
    </AppLayout>
  );
}
