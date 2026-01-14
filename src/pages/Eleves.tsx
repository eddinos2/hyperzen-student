import { AppLayout } from '@/components/layout/AppLayout';
import { AjouterEleveWizard } from '@/components/eleves/AjouterEleveWizard';
import { ModifierEleveDialog } from '@/components/eleves/ModifierEleveDialog';
import { ModifierDossierDialog } from '@/components/dossiers/ModifierDossierDialog';
import { AjouterReglementDialog } from '@/components/reglements/AjouterReglementDialog';
import { ExportElevesDialog, ExportOptions } from '@/components/eleves/ExportElevesDialog';
import { ProtectedAction } from '@/components/auth/ProtectedAction';
import { AdvancedFilterBar } from '@/components/filters/AdvancedFilterBar';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, MoreVertical, Eye, Edit, FileText, CreditCard, GraduationCap } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { computeStatutPaiement, type StatutPaiement } from '@/lib/statuts';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
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
import { CardSkeleton } from '@/components/ui/CardSkeleton';

export default function Eleves() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getParam, setParams } = useQueryParams();
  
  const [searchTerm, setSearchTerm] = useState(getParam('search', ''));
  const [currentPage, setCurrentPage] = useState(Number(getParam('page', '1')));
  const [pageSize, setPageSize] = useState(Number(getParam('size', '25')));
  const [filtreStatutInscription, setFiltreStatutInscription] = useState<string>(getParam('statutInscription', 'all'));
  const [filtreStatutPaiement, setFiltreStatutPaiement] = useState<string>(getParam('statutPaiement', 'all'));
  const [filtreCampus, setFiltreCampus] = useState<string>(getParam('campus', 'all'));
  const [filtreFiliere, setFiltreFiliere] = useState<string>(getParam('filiere', 'all'));
  const [filtreAnnee, setFiltreAnnee] = useState<string>(getParam('annee', 'all'));
  const [sortBy, setSortBy] = useState<string>(getParam('sortBy', 'nom'));
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(getParam('sortDir', 'asc') as 'asc' | 'desc');
  
  // États pour les dialogs
  const [eleveToEdit, setEleveToEdit] = useState<any>(null);
  const [dossierToEdit, setDossierToEdit] = useState<any>(null);
  const [dossierForPayment, setDossierForPayment] = useState<any>(null);
  
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Charger les options de filtres (Campus, Filières, Années)
  const { data: filterOptions } = useQuery({
    queryKey: ['filter-options'],
    staleTime: 1000 * 60 * 30, // Cache 30 minutes
    queryFn: async () => {
      const [campusRes, filieresRes, anneesRes] = await Promise.all([
        supabase.from('campus').select('id, nom').eq('actif', true).order('nom'),
        supabase.from('filieres').select('id, nom').eq('actif', true).order('nom'),
        supabase.from('annees_scolaires').select('id, libelle').order('ordre'),
      ]);
      return {
        campus: campusRes.data || [],
        filieres: filieresRes.data || [],
        annees: anneesRes.data || [],
      };
    },
  });

  // Réinitialiser la page à 1 quand les filtres ou le tri changent
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filtreStatutInscription, filtreStatutPaiement, filtreCampus, filtreFiliere, filtreAnnee, sortBy, sortDirection]);

  // Synchroniser les params URL
  useEffect(() => {
    setParams({
      search: debouncedSearch,
      page: currentPage,
      size: pageSize,
      statutInscription: filtreStatutInscription,
      statutPaiement: filtreStatutPaiement,
      campus: filtreCampus,
      filiere: filtreFiliere,
      annee: filtreAnnee,
      sortBy,
      sortDir: sortDirection,
    });
  }, [debouncedSearch, currentPage, pageSize, filtreStatutInscription, filtreStatutPaiement, filtreCampus, filtreFiliere, filtreAnnee, sortBy, sortDirection]);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('asc');
    }
  };

  const { data: result, isLoading, error, refetch } = useQuery({
    queryKey: ['eleves', debouncedSearch, currentPage, pageSize, filtreStatutInscription, filtreStatutPaiement, filtreCampus, filtreFiliere, filtreAnnee, sortBy, sortDirection],
    staleTime: 1000 * 60 * 5, // Cache 5 minutes
    queryFn: async () => {
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

      // Construction de la requête de base
      let baseQuery = supabase
        .from('eleves')
        .select(`
          id, nom, prenom, email, telephone, immatriculation, statut_inscription,
          dossiers_scolarite (
            id,
            tarif_scolarite,
            impaye_anterieur,
            statut_dossier,
            campus_id,
            filiere_id,
            annee_id
          )
        `, { count: 'exact' });

      // Appliquer le tri (sauf pour statut_paiement qui est calculé)
      if (sortBy !== 'statut_paiement' && sortBy !== 'montant') {
        baseQuery = baseQuery.order(sortBy, { ascending: sortDirection === 'asc' });
      } else {
        // Tri par défaut si on trie par statut paiement
        baseQuery = baseQuery.order('nom', { ascending: true });
      }

      // Filtres SQL: recherche et statut d'inscription
      if (debouncedSearch) {
        baseQuery = baseQuery.or(`nom.ilike.%${debouncedSearch}%,prenom.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%`);
      }
      if (filtreStatutInscription !== 'all') {
        baseQuery = baseQuery.eq('statut_inscription', filtreStatutInscription);
      }
      
      // Filtrer par Campus, Filière, Année (côté client car nested)
      const needsClientFiltering = filtreCampus !== 'all' || filtreFiliere !== 'all' || filtreAnnee !== 'all';

      // Branchement selon le filtre de paiement
      if (filtreStatutPaiement === 'all') {
        // Cas A: Pas de filtre paiement → pagination serveur ou client selon le type de tri
        const isComputedSort = sortBy === 'statut_paiement' || sortBy === 'montant';

        if (isComputedSort) {
          // Tri sur champs calculés → récupérer TOUS les enregistrements par pagination, trier en mémoire puis paginer
          let elevesAll: any[] = [];
          let searchFrom = 0;
          const batchSize = 1000;
          let hasMore = true;

          while (hasMore) {
            let batchQuery = supabase
              .from('eleves')
              .select(`
                id, nom, prenom, email, telephone, immatriculation, statut_inscription,
                dossiers_scolarite (
                  id,
                  tarif_scolarite,
                  impaye_anterieur,
                  statut_dossier,
                  campus_id,
                  filiere_id,
                  annee_id
                )
              `)
              .order('nom', { ascending: true })
              .range(searchFrom, searchFrom + batchSize - 1);

            if (debouncedSearch) {
              batchQuery = batchQuery.or(`nom.ilike.%${debouncedSearch}%,prenom.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%`);
            }
            if (filtreStatutInscription !== 'all') {
              batchQuery = batchQuery.eq('statut_inscription', filtreStatutInscription);
            }

            const { data, error } = await batchQuery;
            if (error) throw error;

            if (data && data.length > 0) {
              elevesAll = [...elevesAll, ...data];
              hasMore = data.length === batchSize;
              searchFrom += batchSize;
            } else {
              hasMore = false;
            }
          }

          // Filtrer par Campus/Filière/Année si nécessaire
          let filteredEleves = elevesAll || [];
          if (needsClientFiltering) {
            filteredEleves = filteredEleves.filter(eleve => {
              const dossier = eleve.dossiers_scolarite?.[0];
              if (!dossier) return false;
              if (filtreCampus !== 'all' && dossier.campus_id !== filtreCampus) return false;
              if (filtreFiliere !== 'all' && dossier.filiere_id !== filtreFiliere) return false;
              if (filtreAnnee !== 'all' && dossier.annee_id !== filtreAnnee) return false;
              return true;
            });
          }

          const elevesWithStatus = await Promise.all(
            filteredEleves.map(async (eleve) => {
              const dossier = eleve.dossiers_scolarite?.[0];
              let statut_paiement: StatutPaiement = 'Non renseigné';
              let totalVerse = 0;
              let totalDu = 0;

              if (dossier) {
                const dateReference = new Date();
                const dateRef = dateReference.toISOString().split('T')[0];

                totalDu = (dossier.tarif_scolarite || 0) + (dossier.impaye_anterieur || 0);

                // Récupérer règlements
                const { data: reglements } = await supabase
                  .from('reglements')
                  .select('montant, date_reglement')
                  .eq('dossier_id', dossier.id)
                  .eq('statut', 'valide')
                  .order('date_reglement', { ascending: false });

                totalVerse = reglements?.reduce((sum, r) => sum + Number(r.montant), 0) || 0;
                const dernierReglement = reglements?.[0]?.date_reglement || null;

                // Récupérer échéances échues
                const { data: echeancesEchues } = await supabase
                  .from('echeances')
                  .select('montant')
                  .eq('dossier_id', dossier.id)
                  .lte('date_echeance', dateRef);

                const duEchu = echeancesEchues?.reduce((sum, e) => sum + Number(e.montant), 0) || 0;

                // Compter échéances en retard
                const { count: nbEcheancesRetard } = await supabase
                  .from('echeances')
                  .select('id', { count: 'exact', head: true })
                  .eq('dossier_id', dossier.id)
                  .eq('statut', 'en_retard');

                statut_paiement = computeStatutPaiement({
                  totalDu,
                  totalVerse,
                  duEchu,
                  nbEcheancesRetard: nbEcheancesRetard || 0,
                  dernierReglement,
                  dateReference,
                });
              }

              return { ...eleve, statut_paiement, totalVerse, totalDu };
            })
          );

          const sorted = [...elevesWithStatus].sort((a, b) => {
            let compareValue = 0;

            switch (sortBy) {
              case 'statut_paiement': {
                const ordre = ['Impayé total', 'En retard', 'En cours', 'À jour', 'Créditeur', 'Non renseigné'];
                compareValue = ordre.indexOf(a.statut_paiement) - ordre.indexOf(b.statut_paiement);
                break;
              }
              case 'montant':
                compareValue = (a.totalVerse || 0) - (b.totalVerse || 0);
                break;
              default:
                // Fallback (ne devrait pas arriver ici)
                compareValue = 0;
            }

            return sortDirection === 'asc' ? compareValue : -compareValue;
          });

          const total = sorted.length;
          const paged = sorted.slice(from, to + 1);
          return { data: paged, count: total };
        } else {
          // Tri sur colonnes simples → pagination serveur
          const query = baseQuery.range(from, to);
          const { data: elevesData, error, count } = await query;
          if (error) throw error;

          // Filtrer par Campus/Filière/Année si nécessaire
          let filteredElevesData = elevesData || [];
          if (needsClientFiltering) {
            filteredElevesData = filteredElevesData.filter(eleve => {
              const dossier = eleve.dossiers_scolarite?.[0];
              if (!dossier) return false;
              if (filtreCampus !== 'all' && dossier.campus_id !== filtreCampus) return false;
              if (filtreFiliere !== 'all' && dossier.filiere_id !== filtreFiliere) return false;
              if (filtreAnnee !== 'all' && dossier.annee_id !== filtreAnnee) return false;
              return true;
            });
          }

          // Calculer statut_paiement pour affichage (mais conserver l'ordre serveur)
          const elevesWithStatus = await Promise.all(
            filteredElevesData.map(async (eleve) => {
              const dossier = eleve.dossiers_scolarite?.[0];
              let statut_paiement: StatutPaiement = 'Non renseigné';
              let totalVerse = 0;
              let totalDu = 0;

              if (dossier) {
                const dateReference = new Date();
                const dateRef = dateReference.toISOString().split('T')[0];

                totalDu = (dossier.tarif_scolarite || 0) + (dossier.impaye_anterieur || 0);

                const { data: reglements } = await supabase
                  .from('reglements')
                  .select('montant, date_reglement')
                  .eq('dossier_id', dossier.id)
                  .eq('statut', 'valide')
                  .order('date_reglement', { ascending: false });

                totalVerse = reglements?.reduce((sum, r) => sum + Number(r.montant), 0) || 0;
                const dernierReglement = reglements?.[0]?.date_reglement || null;

                const { data: echeancesEchues } = await supabase
                  .from('echeances')
                  .select('montant')
                  .eq('dossier_id', dossier.id)
                  .lte('date_echeance', dateRef);

                const duEchu = echeancesEchues?.reduce((sum, e) => sum + Number(e.montant), 0) || 0;

                const { count: nbEcheancesRetard } = await supabase
                  .from('echeances')
                  .select('id', { count: 'exact', head: true })
                  .eq('dossier_id', dossier.id)
                  .eq('statut', 'en_retard');

                statut_paiement = computeStatutPaiement({
                  totalDu,
                  totalVerse,
                  duEchu,
                  nbEcheancesRetard: nbEcheancesRetard || 0,
                  dernierReglement,
                  dateReference,
                });
              }

              return { ...eleve, statut_paiement, totalVerse, totalDu };
            })
          );

          return { data: elevesWithStatus, count: count || 0 };
        }

      } else {
        // Cas B: Filtre paiement actif → tout récupérer, filtrer en mémoire
        const { data: elevesData, error } = await baseQuery;
        if (error) throw error;

        // Fonction pour calculer le statut d'un élève avec la logique unifiée
        const calculerStatutEleve = async (eleve: any) => {
          const dossier = eleve.dossiers_scolarite?.[0];
          let statut_paiement: StatutPaiement = 'Non renseigné';
          let totalVerse = 0;
          let totalDu = 0;

          if (dossier) {
            const dateReference = new Date();
            const dateRef = dateReference.toISOString().split('T')[0];
            
            totalDu = (dossier.tarif_scolarite || 0) + (dossier.impaye_anterieur || 0);

            // Récupérer règlements
            const { data: reglements } = await supabase
              .from('reglements')
              .select('montant, date_reglement')
              .eq('dossier_id', dossier.id)
              .eq('statut', 'valide')
              .order('date_reglement', { ascending: false });

            totalVerse = reglements?.reduce((sum, r) => sum + Number(r.montant), 0) || 0;
            const dernierReglement = reglements?.[0]?.date_reglement || null;

            // Récupérer échéances échues
            const { data: echeancesEchues } = await supabase
              .from('echeances')
              .select('montant')
              .eq('dossier_id', dossier.id)
              .lte('date_echeance', dateRef);

            const duEchu = echeancesEchues?.reduce((sum, e) => sum + Number(e.montant), 0) || 0;

            // Compter échéances en retard
            const { count: nbEcheancesRetard } = await supabase
              .from('echeances')
              .select('id', { count: 'exact', head: true })
              .eq('dossier_id', dossier.id)
              .eq('statut', 'en_retard');

            statut_paiement = computeStatutPaiement({
              totalDu,
              totalVerse,
              duEchu,
              nbEcheancesRetard: nbEcheancesRetard || 0,
              dernierReglement,
              dateReference,
            });
          }

          return { ...eleve, statut_paiement, totalVerse, totalDu };
        };

        // Traitement par batch de 50 élèves pour éviter timeout
        const BATCH_SIZE = 50;
        const elevesWithStatus = [];
        
        for (let i = 0; i < (elevesData || []).length; i += BATCH_SIZE) {
          const batch = (elevesData || []).slice(i, i + BATCH_SIZE);
          const batchResults = await Promise.all(batch.map(calculerStatutEleve));
          elevesWithStatus.push(...batchResults);
        }

        // Filtrer en mémoire par statut de paiement
        const filtered = elevesWithStatus.filter(e => e.statut_paiement === filtreStatutPaiement);

        // Tri en mémoire si nécessaire
        const sorted = [...filtered].sort((a, b) => {
          let compareValue = 0;
          
          switch (sortBy) {
            case 'nom':
              compareValue = (a.nom || '').localeCompare(b.nom || '');
              break;
            case 'prenom':
              compareValue = (a.prenom || '').localeCompare(b.prenom || '');
              break;
            case 'email':
              compareValue = (a.email || '').localeCompare(b.email || '');
              break;
            case 'statut_inscription':
              compareValue = (a.statut_inscription || '').localeCompare(b.statut_inscription || '');
              break;
            case 'statut_paiement':
              const ordre = ['Impayé total', 'En retard', 'En cours', 'À jour', 'Créditeur', 'Non renseigné'];
              compareValue = ordre.indexOf(a.statut_paiement) - ordre.indexOf(b.statut_paiement);
              break;
            case 'montant':
              compareValue = (a.totalVerse || 0) - (b.totalVerse || 0);
              break;
            default:
              compareValue = 0;
          }
          
          return sortDirection === 'asc' ? compareValue : -compareValue;
        });

        const totalFiltered = sorted.length;
        const paged = sorted.slice(from, to + 1);

        return { data: paged, count: totalFiltered };
      }
    },
  });

  const eleves = result?.data;
  const totalPages = Math.ceil((result?.count || 0) / pageSize);

  // Clamper la page courante si le total de pages change
  useEffect(() => {
    if (result?.count !== undefined) {
      const maxPages = Math.max(1, Math.ceil(result.count / pageSize));
      if (currentPage > maxPages) {
        setCurrentPage(maxPages);
      }
    }
  }, [result?.count, pageSize]);

  const handleExport = async (options: ExportOptions) => {
    try {
      // Construire la requête selon les filtres
      let query = supabase
        .from('eleves')
        .select(`
          id, nom, prenom, email, telephone, immatriculation, statut_inscription,
          dossiers_scolarite (
            id,
            tarif_scolarite,
            impaye_anterieur,
            statut_dossier,
            annee_scolaire
          )
        `)
        .order('nom', { ascending: true });

      // Filtrer par statut d'inscription
      if (options.statutInscription !== 'all') {
        query = query.eq('statut_inscription', options.statutInscription);
      }

      const { data: elevesData, error } = await query;
      if (error) throw error;

      // Calculer les statuts et filtrer
      let elevesFiltered = elevesData || [];
      
      if (options.statutPaiement !== 'all') {
        const elevesWithStatus = await Promise.all(
          elevesFiltered.map(async (eleve) => {
            const dossier = eleve.dossiers_scolarite?.[0];
            if (!dossier) return { ...eleve, statut_paiement: 'Non renseigné' };

            const { data: soldeData } = await supabase
              .rpc('calculer_solde_dossier', { dossier_uuid: dossier.id });
            const solde = soldeData?.[0];

            let statut_paiement: StatutPaiement = 'Non renseigné';
            if (solde) {
              const dateReference = new Date();
              const dateRef = dateReference.toISOString().split('T')[0];
              
              const totalDu = (dossier.tarif_scolarite || 0) + (dossier.impaye_anterieur || 0);
              const totalVerse = solde.total_verse || 0;
              const dernierReglement = solde.dernier_reglement || null;

              // Récupérer échéances échues
              const { data: echeancesEchues } = await supabase
                .from('echeances')
                .select('montant')
                .eq('dossier_id', dossier.id)
                .lte('date_echeance', dateRef);

              const duEchu = echeancesEchues?.reduce((sum, e) => sum + Number(e.montant), 0) || 0;

              // Compter échéances en retard
              const { count: nbEcheancesRetard } = await supabase
                .from('echeances')
                .select('id', { count: 'exact', head: true })
                .eq('dossier_id', dossier.id)
                .eq('statut', 'en_retard');

              statut_paiement = computeStatutPaiement({
                totalDu,
                totalVerse,
                duEchu,
                nbEcheancesRetard: nbEcheancesRetard || 0,
                dernierReglement,
                dateReference,
              });
            }

            return { ...eleve, statut_paiement };
          })
        );

        elevesFiltered = elevesWithStatus.filter(
          e => e.statut_paiement === options.statutPaiement
        );
      }

      // Récupérer les règlements et échéances si demandé
      if (options.includeReglements || options.includeEcheances) {
        const dossiersIds = elevesFiltered
          .map(e => e.dossiers_scolarite?.[0]?.id)
          .filter(Boolean);

        if (options.includeReglements && dossiersIds.length > 0) {
          let reglementsQuery = supabase
            .from('reglements')
            .select('*')
            .in('dossier_id', dossiersIds);

          if (options.dateDebut) {
            reglementsQuery = reglementsQuery.gte('date_reglement', options.dateDebut.toISOString());
          }
          if (options.dateFin) {
            reglementsQuery = reglementsQuery.lte('date_reglement', options.dateFin.toISOString());
          }

          const { data: reglements } = await reglementsQuery;
          
          // Attacher les règlements aux élèves
          elevesFiltered = elevesFiltered.map(eleve => ({
            ...eleve,
            reglements: reglements?.filter(
              r => r.dossier_id === eleve.dossiers_scolarite?.[0]?.id
            ) || []
          }));
        }

        if (options.includeEcheances && dossiersIds.length > 0) {
          const { data: echeances } = await supabase
            .from('echeances')
            .select('*')
            .in('dossier_id', dossiersIds);

          elevesFiltered = elevesFiltered.map(eleve => ({
            ...eleve,
            echeances: echeances?.filter(
              e => e.dossier_id === eleve.dossiers_scolarite?.[0]?.id
            ) || []
          }));
        }
      }

      // Exporter avec la fonction existante
      import('@/lib/export-utils').then(({ exportElevesToCSV }) => {
        exportElevesToCSV(elevesFiltered);
        toast({
          title: 'Export réussi',
          description: `${elevesFiltered.length} élève(s) exporté(s)`,
        });
      });
    } catch (error) {
      console.error('Erreur export:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'exporter les données',
        variant: 'destructive',
      });
    }
  };


  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-6xl font-black mb-1 sm:mb-2">ÉLÈVES</h1>
              <p className="text-base sm:text-xl lg:text-2xl font-bold text-muted-foreground">Gestion des dossiers</p>
            </div>
            <div className="flex gap-2 sm:gap-4">
              <ExportElevesDialog onExport={handleExport} />
              <ProtectedAction>
                <AjouterEleveWizard onSuccess={refetch} />
              </ProtectedAction>
            </div>
          </div>
        </div>

        <AdvancedFilterBar
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          filters={[
            {
              key: 'statutInscription',
              label: 'Statut Inscription',
              value: filtreStatutInscription,
              options: [
                { value: 'all', label: 'Tous' },
                { value: 'Inscrit', label: 'Inscrit' },
                { value: 'Désinscrit', label: 'Désinscrit' },
                { value: 'En attente', label: 'En attente' },
              ],
            },
            {
              key: 'statutPaiement',
              label: 'Statut Paiement',
              value: filtreStatutPaiement,
              options: [
                { value: 'all', label: 'Tous' },
                { value: 'À jour', label: 'À jour' },
                { value: 'En cours', label: 'En cours' },
                { value: 'En retard', label: 'En retard' },
                { value: 'Impayé total', label: 'Impayé total' },
                { value: 'Créditeur', label: 'Créditeur' },
              ],
            },
            {
              key: 'campus',
              label: 'Campus',
              value: filtreCampus,
              options: [
                { value: 'all', label: 'Tous les campus' },
                ...(filterOptions?.campus.map(c => ({ value: c.id, label: c.nom })) || []),
              ],
            },
            {
              key: 'filiere',
              label: 'Filière',
              value: filtreFiliere,
              options: [
                { value: 'all', label: 'Toutes les filières' },
                ...(filterOptions?.filieres.map(f => ({ value: f.id, label: f.nom })) || []),
              ],
            },
            {
              key: 'annee',
              label: 'Année',
              value: filtreAnnee,
              options: [
                { value: 'all', label: 'Toutes les années' },
                ...(filterOptions?.annees.map(a => ({ value: a.id, label: a.libelle })) || []),
              ],
            },
          ]}
          onFilterChange={(key, value) => {
            if (key === 'statutInscription') setFiltreStatutInscription(value);
            else if (key === 'statutPaiement') setFiltreStatutPaiement(value);
            else if (key === 'campus') setFiltreCampus(value);
            else if (key === 'filiere') setFiltreFiliere(value);
            else if (key === 'annee') setFiltreAnnee(value);
          }}
          onResetFilters={() => {
            setFiltreStatutInscription('all');
            setFiltreStatutPaiement('all');
            setFiltreCampus('all');
            setFiltreFiliere('all');
            setFiltreAnnee('all');
          }}
        />

        {/* Table pour desktop */}
        <div className="brutal-card overflow-hidden hidden md:block">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-black text-white">
                <tr>
                  <th 
                    className="px-4 lg:px-6 py-3 lg:py-4 text-left font-black text-sm lg:text-lg uppercase tracking-wide cursor-pointer hover:bg-gray-800 transition-colors"
                    onClick={() => handleSort('nom')}
                  >
                    <div className="flex items-center gap-2">
                      Nom
                      {sortBy === 'nom' ? (
                        sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                      ) : (
                        <ArrowUpDown className="h-4 w-4 opacity-50" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-4 lg:px-6 py-3 lg:py-4 text-left font-black text-sm lg:text-lg uppercase tracking-wide cursor-pointer hover:bg-gray-800 transition-colors"
                    onClick={() => handleSort('prenom')}
                  >
                    <div className="flex items-center gap-2">
                      Prénom
                      {sortBy === 'prenom' ? (
                        sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                      ) : (
                        <ArrowUpDown className="h-4 w-4 opacity-50" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-4 lg:px-6 py-3 lg:py-4 text-left font-black text-sm lg:text-lg uppercase tracking-wide cursor-pointer hover:bg-gray-800 transition-colors"
                    onClick={() => handleSort('email')}
                  >
                    <div className="flex items-center gap-2">
                      Email
                      {sortBy === 'email' ? (
                        sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                      ) : (
                        <ArrowUpDown className="h-4 w-4 opacity-50" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-4 lg:px-6 py-3 lg:py-4 text-left font-black text-sm lg:text-lg uppercase tracking-wide cursor-pointer hover:bg-gray-800 transition-colors"
                    onClick={() => handleSort('statut_inscription')}
                  >
                    <div className="flex items-center gap-2">
                      Statut Inscription
                      {sortBy === 'statut_inscription' ? (
                        sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                      ) : (
                        <ArrowUpDown className="h-4 w-4 opacity-50" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-4 lg:px-6 py-3 lg:py-4 text-center font-black text-sm lg:text-lg uppercase tracking-wide cursor-pointer hover:bg-gray-800 transition-colors"
                    onClick={() => handleSort('statut_paiement')}
                  >
                    <div className="flex items-center justify-center gap-2">
                      Statut Paiement
                      {sortBy === 'statut_paiement' ? (
                        sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                      ) : (
                        <ArrowUpDown className="h-4 w-4 opacity-50" />
                      )}
                    </div>
                  </th>
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-center font-black text-sm lg:text-lg uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y-2 divide-black">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-6">
                      <TableSkeleton rows={pageSize} columns={6} />
                    </td>
                  </tr>
                ) : eleves?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="text-4xl lg:text-6xl">📚</div>
                        <p className="text-xl lg:text-2xl font-black">AUCUN ÉLÈVE</p>
                        <p className="text-base lg:text-lg font-bold text-muted-foreground">Importez vos données pour commencer</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  eleves?.map((eleve: any) => {
                    const getStatutPaiementBadge = (statut: string) => {
                      const config = {
                        'À jour': 'bg-green-200',
                        'En cours': 'bg-blue-200',
                        'En retard': 'bg-orange-200',
                        'Impayé total': 'bg-red-200',
                        'Créditeur': 'bg-purple-200',
                        'Non renseigné': 'bg-gray-200',
                      };
                      return config[statut as keyof typeof config] || 'bg-gray-200';
                    };

                    const dossier = eleve.dossiers_scolarite?.[0];

                    return (
                      <tr key={eleve.id} className="hover:bg-yellow-50 transition-colors">
                        <td className="px-4 lg:px-6 py-3 lg:py-4">
                          <div className="font-bold">{eleve.nom}</div>
                        </td>
                        <td className="px-4 lg:px-6 py-3 lg:py-4 font-bold">{eleve.prenom}</td>
                        <td className="px-4 lg:px-6 py-3 lg:py-4 font-medium text-muted-foreground text-sm">{eleve.email}</td>
                        <td className="px-4 lg:px-6 py-3 lg:py-4">
                          <span className="inline-block px-3 lg:px-4 py-1 lg:py-2 rounded-xl border-2 border-black font-black text-xs lg:text-sm bg-cyan-200">
                            {eleve.statut_inscription || 'Inscrit'}
                          </span>
                        </td>
                        <td className="px-4 lg:px-6 py-3 lg:py-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className={`inline-block px-3 lg:px-4 py-1 lg:py-2 rounded-xl border-2 border-black font-black text-xs lg:text-sm ${getStatutPaiementBadge(eleve.statut_paiement)}`}>
                              {eleve.statut_paiement}
                            </span>
                            {eleve.totalDu > 0 && (
                              <span className="text-xs font-bold text-muted-foreground">
                                {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(eleve.totalVerse)} / {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(eleve.totalDu)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 lg:px-6 py-3 lg:py-4 text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuLabel className="font-black">Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => navigate(`/eleves/${eleve.id}`)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Voir détails complets
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setEleveToEdit(eleve)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Modifier infos élève
                              </DropdownMenuItem>
                              {dossier && (
                                <>
                                  <DropdownMenuItem onClick={() => setDossierToEdit(dossier)}>
                                    <GraduationCap className="mr-2 h-4 w-4" />
                                    Modifier dossier scolaire
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setDossierForPayment(dossier)}>
                                    <CreditCard className="mr-2 h-4 w-4" />
                                    Ajouter un règlement
                                  </DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => navigate(`/reglements?dossier=${dossier?.id}`)}>
                                <FileText className="mr-2 h-4 w-4" />
                                Historique règlements
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cards pour mobile */}
        <div className="space-y-3 md:hidden">
          {isLoading ? (
            <CardSkeleton count={pageSize} />
          ) : eleves?.length === 0 ? (
            <div className="brutal-card p-8 text-center">
              <div className="text-4xl mb-3">📚</div>
              <p className="text-xl font-black mb-2">AUCUN ÉLÈVE</p>
              <p className="text-sm font-bold text-muted-foreground">Importez vos données</p>
            </div>
          ) : (
            eleves?.map((eleve) => (
              <div
                key={eleve.id}
                className="brutal-card p-4 hover:bg-yellow-50 transition-colors"
              >
              <div className="flex justify-between items-start mb-3">
                <div>
                  {eleve.immatriculation && (
                    <p className="text-xs font-mono font-bold text-primary mb-1">{eleve.immatriculation}</p>
                  )}
                  <h3 className="text-lg font-black">{eleve.nom} {eleve.prenom}</h3>
                  <p className="text-sm font-medium text-muted-foreground">{eleve.email}</p>
                  {eleve.telephone && (
                    <p className="text-sm font-medium text-muted-foreground">{eleve.telephone}</p>
                  )}
                </div>
                <div className="flex flex-col gap-2 items-end">
                  <span className="inline-block px-3 py-1 rounded-xl border-2 border-black font-black text-xs bg-cyan-200">
                    {(eleve as any).statut_inscription || 'Non renseigné'}
                  </span>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`inline-block px-3 py-1 rounded-xl border-2 border-black font-black text-xs ${
                      (eleve as any).statut_paiement === 'À jour' ? 'bg-green-200' :
                      (eleve as any).statut_paiement === 'En retard' ? 'bg-orange-200' :
                      (eleve as any).statut_paiement === 'Impayé total' ? 'bg-red-200' :
                      (eleve as any).statut_paiement === 'Créditeur' ? 'bg-purple-200' :
                      'bg-blue-200'
                    }`}>
                      {(eleve as any).statut_paiement}
                    </span>
                    {(eleve as any).totalDu > 0 && (
                      <span className="text-xs font-bold text-muted-foreground">
                        {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format((eleve as any).totalVerse)} / {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format((eleve as any).totalDu)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/eleves/${eleve.id}`)}
                    className="flex-1 px-4 py-2 rounded-xl border-2 border-black font-black text-sm hover:bg-black hover:text-white transition-colors"
                  >
                    VOIR DÉTAILS
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-10 w-10 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem onClick={() => setEleveToEdit(eleve)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Modifier infos
                      </DropdownMenuItem>
                      {eleve.dossiers_scolarite?.[0] && (
                        <>
                          <DropdownMenuItem onClick={() => setDossierToEdit(eleve.dossiers_scolarite[0])}>
                            <GraduationCap className="mr-2 h-4 w-4" />
                            Dossier scolaire
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDossierForPayment(eleve.dossiers_scolarite[0])}>
                            <CreditCard className="mr-2 h-4 w-4" />
                            Ajouter règlement
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
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
              Page {currentPage} sur {totalPages} ({result?.count} élèves)
            </div>
          </div>
        )}
      </div>

      {/* Dialogs de modification */}
      {eleveToEdit && (
        <ModifierEleveDialog
          eleve={eleveToEdit}
          open={!!eleveToEdit}
          onOpenChange={(open) => !open && setEleveToEdit(null)}
          onSuccess={() => {
            refetch();
            setEleveToEdit(null);
          }}
        />
      )}

      {dossierToEdit && (
        <ModifierDossierDialog
          dossier={dossierToEdit}
          open={!!dossierToEdit}
          onOpenChange={(open) => !open && setDossierToEdit(null)}
          onSuccess={() => {
            refetch();
            setDossierToEdit(null);
          }}
        />
      )}

      {dossierForPayment && (
        <AjouterReglementDialog
          prefilledDossierId={dossierForPayment.id}
          open={!!dossierForPayment}
          onOpenChange={(open) => !open && setDossierForPayment(null)}
          onSuccess={() => {
            refetch();
            setDossierForPayment(null);
          }}
        />
      )}
    </AppLayout>
  );
}
