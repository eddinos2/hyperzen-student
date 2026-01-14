import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { 
  GraduationCap, 
  Search, 
  Mail, 
  User, 
  Link as LinkIcon, 
  UserCheck, 
  Hash, 
  Copy, 
  Eye, 
  EyeOff, 
  Info,
  Download,
  Ban,
  Trash2,
  CheckCircle,
  Key
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { exportComptesElevesToCSV } from '@/lib/export-utils';
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
import { CardSkeleton } from '@/components/ui/CardSkeleton';

interface EleveWithAccount {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string | null;
  immatriculation: string | null;
  user_id: string | null;
  has_account: boolean;
  credentials: {
    mot_de_passe_initial: string;
    mot_de_passe_change: boolean;
    date_creation: string;
  } | null;
}

const ComptesEleves = () => {
  const { toast } = useToast();
  const { getParam, setParams } = useQueryParams();
  
  const [searchTerm, setSearchTerm] = useState(getParam('search', ''));
  const [currentPage, setCurrentPage] = useState(Number(getParam('page', '1')));
  const [pageSize, setPageSize] = useState(Number(getParam('size', '25')));
  
  const debouncedSearch = useDebounce(searchTerm, 300);

  useEffect(() => {
    setParams({ search: debouncedSearch, page: currentPage, size: pageSize });
  }, [debouncedSearch, currentPage, pageSize]);
  const [selectedEleve, setSelectedEleve] = useState<EleveWithAccount | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [envoyerEmail, setEnvoyerEmail] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [resultatCreation, setResultatCreation] = useState<{
    immatriculation: string;
    motDePasse: string;
    emailEnvoye: boolean;
  } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [resetPwd, setResetPwd] = useState<string | null>(null);
  const [showResetPwd, setShowResetPwd] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkCreating, setIsBulkCreating] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkResults, setBulkResults] = useState<{
    succes: Array<{ nom: string; prenom: string; immatriculation: string; motDePasse: string }>;
    erreurs: Array<{ nom: string; prenom: string; erreur: string }>;
  } | null>(null);

  const { data: result, isLoading, refetch } = useQuery({
    queryKey: ['eleves-accounts', currentPage, pageSize, debouncedSearch],
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('eleves')
        .select(`
          id, 
          nom, 
          prenom, 
          email, 
          telephone, 
          immatriculation, 
          user_id,
          eleves_credentials (
            mot_de_passe_initial,
            mot_de_passe_change,
            date_creation
          )
        `, { count: 'exact' })
        .order('nom', { ascending: true })
        .range(from, to);

      if (debouncedSearch) {
        query = query.or(`nom.ilike.%${debouncedSearch}%,prenom.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      const elevesData = (data || []).map((eleve: any) => {
        const rawCred = eleve.eleves_credentials;
        const credentials = Array.isArray(rawCred) ? (rawCred[0] || null) : (rawCred || null);
        return {
          ...eleve,
          has_account: !!eleve.user_id,
          credentials,
        } as EleveWithAccount;
      }) as EleveWithAccount[];

      return { data: elevesData, count: count || 0 };
    },
  });

  const eleves = result?.data;
  const filteredEleves = result?.data;
  const totalPages = Math.ceil((result?.count || 0) / pageSize);

  const handleOpenDialog = (eleve: EleveWithAccount) => {
    setSelectedEleve(eleve);
    setResultatCreation(null);
    setShowPassword(false);
    setDialogOpen(true);
  };

  const handleCreerCompte = async () => {
    if (!selectedEleve) return;

    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('creer-compte-eleve', {
        body: {
          eleveId: selectedEleve.id,
          envoyerEmail,
        },
      });

      if (error) throw error;

      setResultatCreation({
        immatriculation: data.immatriculation,
        motDePasse: data.motDePasse,
        emailEnvoye: data.emailEnvoye,
      });

      toast({
        title: 'Compte créé !',
        description: `Le compte de ${selectedEleve.prenom} ${selectedEleve.nom} a été créé avec succès.`,
      });

      refetch();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de créer le compte',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const copierTexte = (texte: string, label: string) => {
    navigator.clipboard.writeText(texte);
    toast({
      title: 'Copié !',
      description: `${label} copié dans le presse-papier`,
    });
  };

  const handleExportCSV = async () => {
    try {
      toast({
        title: 'Export en cours...',
        description: 'Récupération de tous les élèves',
      });

      // Récupérer TOUS les élèves sans pagination
      const { data: allEleves, error } = await supabase
        .from('eleves')
        .select(`
          id, 
          nom, 
          prenom, 
          email, 
          telephone, 
          immatriculation, 
          user_id,
          eleves_credentials (
            mot_de_passe_initial,
            mot_de_passe_change,
            date_creation
          )
        `)
        .order('nom', { ascending: true });

      if (error) throw error;

      if (!allEleves || allEleves.length === 0) {
        toast({
          title: 'Aucune donnée',
          description: 'Aucun élève à exporter',
          variant: 'destructive',
        });
        return;
      }

      const allElevesFormatted = allEleves.map((eleve: any) => {
        const rawCred = eleve.eleves_credentials;
        const credentials = Array.isArray(rawCred) ? (rawCred[0] || null) : (rawCred || null);
        return {
          ...eleve,
          has_account: !!eleve.user_id,
          credentials,
        } as EleveWithAccount;
      });

      // Backfill: enregistrer les MDP manquants avant export
      const aCompleter = allElevesFormatted.filter(e => e.has_account && !e.credentials?.mot_de_passe_initial);
      if (aCompleter.length > 0) {
        toast({
          title: 'Enregistrement des mots de passe',
          description: `${aCompleter.length} compte(s) sans MDP détecté(s) • Génération en cours...`,
        });

        for (const e of aCompleter) {
          try {
            await supabase.functions.invoke('creer-compte-eleve', {
              body: { eleveId: e.id, envoyerEmail: false },
            });
          } catch (err) {
            console.error('Backfill cred error', err);
          }
        }

        // Recharger tous les élèves
        const { data: refreshedEleves } = await supabase
          .from('eleves')
          .select(`
            id, 
            nom, 
            prenom, 
            email, 
            telephone, 
            immatriculation, 
            user_id,
            eleves_credentials (
              mot_de_passe_initial,
              mot_de_passe_change,
              date_creation
            )
          `)
          .order('nom', { ascending: true });

        if (refreshedEleves) {
          const refreshedFormatted = refreshedEleves.map((eleve: any) => {
            const rawCred = eleve.eleves_credentials;
            const credentials = Array.isArray(rawCred) ? (rawCred[0] || null) : (rawCred || null);
            return {
              ...eleve,
              has_account: !!eleve.user_id,
              credentials,
            } as EleveWithAccount;
          });
          exportComptesElevesToCSV(refreshedFormatted);
        } else {
          exportComptesElevesToCSV(allElevesFormatted);
        }
      } else {
        exportComptesElevesToCSV(allElevesFormatted);
      }

      toast({
        title: 'Export réussi',
        description: `${allEleves.length} élève(s) exporté(s)`,
      });
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible d\'exporter les données',
        variant: 'destructive',
      });
    }
  };

  const handleSuspendAccount = async (eleve: EleveWithAccount) => {
    if (!eleve.user_id) return;

    try {
      const { error } = await supabase.functions.invoke('admin-gerer-utilisateur', {
        body: {
          action: 'suspend',
          userId: eleve.user_id,
        },
      });

      if (error) throw error;

      toast({
        title: 'Compte suspendu',
        description: `Le compte de ${eleve.prenom} ${eleve.nom} a été suspendu`,
      });

      refetch();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de suspendre le compte',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteAccount = async (eleve: EleveWithAccount) => {
    if (!eleve.user_id) return;

    try {
      // D'abord retirer le user_id de l'élève pour éviter les erreurs de contrainte
      const { error: updateError } = await supabase
        .from('eleves')
        .update({ user_id: null })
        .eq('id', eleve.id);

      if (updateError) throw updateError;

      // Ensuite supprimer l'utilisateur via l'edge function
      const { error: deleteError } = await supabase.functions.invoke('admin-gerer-utilisateur', {
        body: {
          action: 'delete',
          userId: eleve.user_id,
        },
      });

      if (deleteError) {
        // Si la suppression échoue, restaurer le user_id
        await supabase
          .from('eleves')
          .update({ user_id: eleve.user_id })
          .eq('id', eleve.id);
        throw deleteError;
      }

      toast({
        title: 'Compte supprimé',
        description: `Le compte de ${eleve.prenom} ${eleve.nom} a été supprimé`,
      });

      refetch();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de supprimer le compte',
        variant: 'destructive',
      });
    }
  };

  // Génère un nouveau mot de passe temporaire (10 caractères)
  const generateTempPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleResetPassword = async (eleve: EleveWithAccount) => {
    if (!eleve.user_id) return;
    setIsResetting(true);
    setResetPwd(null);
    try {
      const newPass = generateTempPassword();
      const { error } = await supabase.functions.invoke('admin-gerer-utilisateur', {
        body: {
          action: 'reset-password',
          userId: eleve.user_id,
          password: newPass,
        },
      });
      if (error) throw error;

      // Stocker le nouveau mot de passe dans les credentials
      const { error: credError } = await supabase
        .from('eleves_credentials')
        .upsert({
          eleve_id: eleve.id,
          immatriculation: eleve.immatriculation || '',
          mot_de_passe_initial: newPass,
          mot_de_passe_change: false,
          date_dernier_changement: new Date().toISOString(),
        }, {
          onConflict: 'eleve_id'
        });

      if (credError) throw credError;

      setResetPwd(newPass);
      setShowResetPwd(false);
      toast({
        title: 'Mot de passe réinitialisé',
        description: `Nouveau mot de passe généré pour ${eleve.prenom} ${eleve.nom}`,
      });
      refetch();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de réinitialiser le mot de passe',
        variant: 'destructive',
      });
    } finally {
      setIsResetting(false);
    }
  };

  const toggleSelection = (eleveId: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(eleveId)) {
      newSet.delete(eleveId);
    } else {
      newSet.add(eleveId);
    }
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === elevesEligibles.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(elevesEligibles.map(e => e.id)));
    }
  };

  const elevesEligibles = filteredEleves?.filter(e => !e.has_account && e.immatriculation) || [];
  const elevesSelectionnes = elevesEligibles.filter(e => selectedIds.has(e.id));

  const handleBulkCreate = async () => {
    if (elevesSelectionnes.length === 0) return;

    setIsBulkCreating(true);
    const succes: Array<{ nom: string; prenom: string; immatriculation: string; motDePasse: string }> = [];
    const erreurs: Array<{ nom: string; prenom: string; erreur: string }> = [];

    for (const eleve of elevesSelectionnes) {
      try {
        const { data, error } = await supabase.functions.invoke('creer-compte-eleve', {
          body: {
            eleveId: eleve.id,
            envoyerEmail: false, // Pas d'email en masse pour éviter spam
          },
        });

        if (error) throw error;

        succes.push({
          nom: eleve.nom,
          prenom: eleve.prenom,
          immatriculation: data.immatriculation,
          motDePasse: data.motDePasse,
        });
      } catch (error: any) {
        erreurs.push({
          nom: eleve.nom,
          prenom: eleve.prenom,
          erreur: error.message || 'Erreur inconnue',
        });
      }
    }

    setBulkResults({ succes, erreurs });
    setIsBulkCreating(false);
    setSelectedIds(new Set());
    refetch();

    toast({
      title: 'Création terminée',
      description: `${succes.length} compte(s) créé(s), ${erreurs.length} erreur(s)`,
    });
  };

  const handleCreateAllMissing = async () => {
    try {
      toast({
        title: 'Recherche en cours...',
        description: 'Récupération de tous les élèves sans compte',
      });

      // Récupérer TOUS les élèves sans compte qui ont une immatriculation
      const { data: allEleves, error } = await supabase
        .from('eleves')
        .select('id, nom, prenom, email, immatriculation, user_id')
        .is('user_id', null)
        .not('immatriculation', 'is', null)
        .order('nom', { ascending: true });

      if (error) throw error;

      if (!allEleves || allEleves.length === 0) {
        toast({
          title: 'Aucun compte à créer',
          description: 'Tous les élèves éligibles ont déjà un compte',
        });
        return;
      }

      toast({
        title: `${allEleves.length} compte(s) à créer`,
        description: 'Création en cours...',
      });

      setIsBulkCreating(true);
      const succes: Array<{ nom: string; prenom: string; immatriculation: string; motDePasse: string }> = [];
      const erreurs: Array<{ nom: string; prenom: string; erreur: string }> = [];

      for (const eleve of allEleves) {
        try {
          const { data, error } = await supabase.functions.invoke('creer-compte-eleve', {
            body: {
              eleveId: eleve.id,
              envoyerEmail: false,
            },
          });

          if (error) throw error;

          succes.push({
            nom: eleve.nom,
            prenom: eleve.prenom,
            immatriculation: data.immatriculation,
            motDePasse: data.motDePasse,
          });
        } catch (error: any) {
          erreurs.push({
            nom: eleve.nom,
            prenom: eleve.prenom,
            erreur: error.message || 'Erreur inconnue',
          });
        }
      }

      setBulkResults({ succes, erreurs });
      setBulkDialogOpen(true);
      setIsBulkCreating(false);
      refetch();

      toast({
        title: 'Création terminée',
        description: `${succes.length} compte(s) créé(s), ${erreurs.length} erreur(s)`,
      });
    } catch (error: any) {
      setIsBulkCreating(false);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de créer les comptes',
        variant: 'destructive',
      });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-5xl font-black mb-2">Comptes Élèves</h1>
          <p className="text-xl text-muted-foreground">
            Gérez les comptes et accès des élèves au système
          </p>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex gap-3 items-center flex-wrap">
            <Button onClick={handleExportCSV} className="brutal-button">
              <Download className="h-4 w-4 mr-2" />
              Exporter TOUS les accès
            </Button>

            <Button 
              onClick={handleCreateAllMissing}
              disabled={isBulkCreating}
              className="brutal-button bg-green-600 text-white hover:bg-green-700"
            >
              <UserCheck className="h-4 w-4 mr-2" />
              {isBulkCreating ? 'Création en cours...' : 'Créer TOUS les comptes manquants'}
            </Button>
            
            {elevesEligibles.length > 0 && (
              <Button 
                onClick={() => setBulkDialogOpen(true)}
                disabled={selectedIds.size === 0}
                className="brutal-button bg-primary text-primary-foreground"
              >
                <UserCheck className="h-4 w-4 mr-2" />
                Créer {selectedIds.size > 0 ? `${selectedIds.size} compte(s) sélectionné(s)` : 'sélection'}
              </Button>
            )}
          </div>

          {elevesEligibles.length > 0 && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedIds.size === elevesEligibles.length}
                onChange={toggleSelectAll}
                className="w-5 h-5 rounded border-2 border-black"
              />
              <Label className="font-bold cursor-pointer" onClick={toggleSelectAll}>
                Tout sélectionner ({elevesEligibles.length} éligibles)
              </Label>
            </div>
          )}
        </div>

        <Card className="brutal-card p-8">
          <div className="flex items-center gap-4 mb-6">
            <Search className="h-6 w-6" />
            <Input
              placeholder="Rechercher un élève par nom, prénom ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="brutal-input flex-1"
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredEleves?.map((eleve) => (
              <Card key={eleve.id} className="p-6 border-4 border-black relative">
                {!eleve.has_account && eleve.immatriculation && (
                  <div className="absolute top-4 left-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(eleve.id)}
                      onChange={() => toggleSelection(eleve.id)}
                      className="w-5 h-5 rounded border-2 border-black cursor-pointer"
                    />
                  </div>
                )}
                
                <div className="absolute top-4 right-4">
                  {eleve.has_account ? (
                    <Badge className="bg-green-500 border-2 border-black">
                      <UserCheck className="h-3 w-3 mr-1" />
                      Compte actif
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="border-2 border-black">
                      Pas de compte
                    </Badge>
                  )}
                </div>

                <div className="space-y-4 mt-8">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    <p className="font-black text-lg">
                      {eleve.prenom} {eleve.nom}
                    </p>
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    {eleve.immatriculation && (
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4" />
                        <p className="font-mono font-bold">{eleve.immatriculation}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <p>{eleve.email}</p>
                    </div>
                  </div>

                  <Dialog open={dialogOpen && selectedEleve?.id === eleve.id} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        onClick={() => handleOpenDialog(eleve)}
                        className="brutal-button w-full mt-4"
                        size="sm"
                        disabled={!eleve.immatriculation}
                      >
                        <LinkIcon className="h-4 w-4 mr-2" />
                        {eleve.has_account ? 'Regénérer/Enregistrer MDP' : 'Créer un compte'}
                      </Button>
                    </DialogTrigger>
                    {!eleve.has_account && (
                      <DialogContent className="brutal-card max-w-2xl">
                      <DialogHeader>
                        <DialogTitle className="text-2xl font-black">
                          Créer un compte pour {selectedEleve?.prenom} {selectedEleve?.nom}
                        </DialogTitle>
                        <DialogDescription className="text-lg">
                          {!resultatCreation ? (
                            'Générer un identifiant et un mot de passe pour donner accès au portail élève'
                          ) : (
                            'Compte créé avec succès ! Voici les identifiants'
                          )}
                        </DialogDescription>
                      </DialogHeader>
                      
                      {!resultatCreation ? (
                        <div className="space-y-6 py-4">
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <p className="font-bold">Informations de l'élève:</p>
                              <div className="bg-gray-50 p-4 rounded-xl border-2 border-black space-y-1">
                                <p><strong>Nom:</strong> {selectedEleve?.nom} {selectedEleve?.prenom}</p>
                                <p><strong>Email:</strong> {selectedEleve?.email}</p>
                                {selectedEleve?.immatriculation && (
                                  <p><strong>Immatriculation:</strong> {selectedEleve?.immatriculation}</p>
                                )}
                              </div>
                            </div>

                            <div className="bg-yellow-50 p-4 rounded-xl border-2 border-black">
                              <div className="flex items-start gap-3">
                                <div className="flex items-center space-x-2 flex-1">
                                  <Switch
                                    id="envoi-email"
                                    checked={envoyerEmail}
                                    onCheckedChange={setEnvoyerEmail}
                                  />
                                  <Label htmlFor="envoi-email" className="font-bold cursor-pointer">
                                    Envoyer les identifiants par email
                                  </Label>
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground mt-2 ml-8">
                                {envoyerEmail ? (
                                  '✉️ Un email sera envoyé à l\'élève avec ses identifiants'
                                ) : (
                                  '⚠️ Vous devrez communiquer les identifiants manuellement'
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="flex gap-3">
                            <Button
                              onClick={() => setDialogOpen(false)}
                              variant="outline"
                              className="brutal-button flex-1"
                            >
                              Annuler
                            </Button>
                            <Button
                              onClick={handleCreerCompte}
                              disabled={isCreating || !selectedEleve?.immatriculation}
                              className="brutal-button flex-1"
                            >
                              {isCreating ? 'Création...' : 'Créer le compte'}
                            </Button>
                          </div>

                          {!selectedEleve?.immatriculation && (
                            <div className="bg-red-50 p-4 rounded-xl border-2 border-black">
                              <p className="text-sm font-bold text-red-600">
                                ⚠️ Cet élève n'a pas d'immatriculation
                              </p>
                              <p className="text-sm text-muted-foreground mt-1">
                                Impossible de créer un compte sans immatriculation
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-6 py-4">
                          <div className="bg-green-50 p-6 rounded-xl border-4 border-green-600">
                            <h3 className="font-black text-xl mb-4 text-green-800">✅ Compte créé avec succès !</h3>
                            
                             <div className="space-y-4">
                              <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-300">
                                <p className="text-sm font-black uppercase mb-2">📝 Informations de connexion</p>
                                <p className="text-xs text-muted-foreground mb-3">
                                  🔗 Page de connexion: <strong>/login-eleve</strong>
                                </p>
                              </div>

                              <div>
                                <Label className="text-sm text-gray-600 font-bold">Identifiant (Immatriculation)</Label>
                                <div className="flex items-center gap-2 mt-1">
                                  <code className="flex-1 bg-white px-4 py-3 rounded-lg border-2 border-black font-mono text-2xl font-bold">
                                    {resultatCreation.immatriculation}
                                  </code>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => copierTexte(resultatCreation.immatriculation, 'Identifiant')}
                                    className="brutal-button"
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  ⚠️ L'élève doit utiliser son immatriculation comme identifiant
                                </p>
                              </div>

                              <div>
                                <Label className="text-sm text-gray-600 font-bold">Mot de passe temporaire</Label>
                                <div className="flex items-center gap-2 mt-1">
                                  <code className="flex-1 bg-white px-4 py-3 rounded-lg border-2 border-black font-mono text-2xl font-bold tracking-wider">
                                    {showPassword ? resultatCreation.motDePasse : '••••••••'}
                                  </code>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="brutal-button"
                                  >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => copierTexte(resultatCreation.motDePasse, 'Mot de passe')}
                                    className="brutal-button"
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                </div>
                                <p className="text-xs text-orange-700 mt-1">
                                  🔐 L'élève devra changer ce mot de passe à sa première connexion
                                </p>
                              </div>
                            </div>

                            {resultatCreation.emailEnvoye ? (
                              <div className="mt-4 bg-blue-50 p-4 rounded-lg border-2 border-blue-600">
                                <p className="text-sm font-bold">✉️ Email envoyé avec succès</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  L'élève a reçu ses identifiants par email
                                </p>
                              </div>
                            ) : (
                              <div className="mt-4 bg-orange-50 p-4 rounded-lg border-2 border-orange-600">
                                <p className="text-sm font-bold">📋 Transmettez ces identifiants</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  N'oubliez pas de communiquer ces identifiants à l'élève
                                </p>
                              </div>
                            )}
                          </div>

                          <Button
                            onClick={() => {
                              setDialogOpen(false);
                              setResultatCreation(null);
                            }}
                            className="brutal-button w-full"
                          >
                            Fermer
                          </Button>
                        </div>
                      )}
                    </DialogContent>
                    )}
                  </Dialog>
                  
                  {eleve.has_account && eleve.immatriculation && (
                    <>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            className="brutal-button w-full mt-2 border-red-500 text-red-600 hover:bg-red-50"
                            size="sm"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Supprimer le compte
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="brutal-card">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer ce compte ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Cette action est irréversible. Le compte de {eleve.prenom} {eleve.nom} sera
                              définitivement supprimé. L'élève devra créer un nouveau compte pour accéder au système.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="brutal-button">Annuler</AlertDialogCancel>
                            <AlertDialogAction 
                              className="brutal-button bg-red-600 hover:bg-red-700"
                              onClick={() => handleDeleteAccount(eleve)}
                            >
                              Supprimer définitivement
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </div>
              </Card>
            ))}

            {!isLoading && filteredEleves?.length === 0 && (
              <div className="col-span-full text-center py-12">
                <GraduationCap className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-xl text-muted-foreground">
                  Aucun élève trouvé
                </p>
              </div>
            )}
          </div>
        </Card>

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
                  setSelectedIds(new Set());
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
                        onClick={() => {
                          setCurrentPage(pageNum);
                          setSelectedIds(new Set());
                        }}
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

        <Card className="brutal-card p-8 bg-blue-50">
          <h3 className="text-2xl font-black mb-4">📊 Statistiques</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="bg-white p-4 rounded-xl border-4 border-black">
              <p className="text-3xl font-black">{eleves?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Total élèves</p>
            </div>
            <div className="bg-white p-4 rounded-xl border-4 border-black">
              <p className="text-3xl font-black text-green-600">
                {eleves?.filter(e => e.has_account).length || 0}
              </p>
              <p className="text-sm text-muted-foreground">Comptes actifs</p>
            </div>
            <div className="bg-white p-4 rounded-xl border-4 border-black">
              <p className="text-3xl font-black text-orange-600">
                {eleves?.filter(e => !e.has_account).length || 0}
              </p>
              <p className="text-sm text-muted-foreground">Sans compte</p>
            </div>
          </div>
        </Card>

        {/* Dialog de création en masse */}
        <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
          <DialogContent className="brutal-card max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black">
                Créer {elevesSelectionnes.length} compte(s) en masse
              </DialogTitle>
              <DialogDescription>
                Confirmer la création des comptes pour les élèves sélectionnés
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="bg-blue-50 p-4 rounded-xl border-2 border-black">
                <p className="font-bold text-sm mb-2">📋 Récapitulatif</p>
                <ul className="space-y-1 text-sm">
                  <li>• <strong>{elevesSelectionnes.length}</strong> compte(s) seront créés</li>
                  <li>• Les mots de passe seront générés automatiquement</li>
                  <li>• Aucun email ne sera envoyé (éviter le spam)</li>
                  <li>• Les identifiants seront affichés à l'écran après création</li>
                </ul>
              </div>

              <div className="bg-yellow-50 p-4 rounded-xl border-2 border-black max-h-60 overflow-y-auto">
                <p className="font-bold text-sm mb-2">👥 Élèves sélectionnés:</p>
                <div className="space-y-1">
                  {elevesSelectionnes.map(e => (
                    <div key={e.id} className="text-sm flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span>{e.nom} {e.prenom} - {e.immatriculation}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setBulkDialogOpen(false)}
                  variant="outline"
                  className="brutal-button flex-1"
                  disabled={isBulkCreating}
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleBulkCreate}
                  disabled={isBulkCreating}
                  className="brutal-button flex-1 bg-primary text-primary-foreground"
                >
                  {isBulkCreating ? 'Création en cours...' : 'Créer les comptes'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog des résultats de création en masse */}
        <Dialog open={!!bulkResults} onOpenChange={() => setBulkResults(null)}>
          <DialogContent className="brutal-card max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black">
                Résultats de la création en masse
              </DialogTitle>
              <DialogDescription>
                {bulkResults?.succes.length} succès, {bulkResults?.erreurs.length} erreur(s)
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Succès */}
              {bulkResults && bulkResults.succes.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-black text-lg text-green-600">
                    ✅ Comptes créés avec succès ({bulkResults.succes.length})
                  </h3>
                  <div className="bg-green-50 p-4 rounded-xl border-2 border-green-600 space-y-3">
                    {bulkResults.succes.map((s, idx) => (
                      <div key={idx} className="bg-white p-4 rounded-lg border-2 border-black">
                        <div className="flex justify-between items-start mb-2">
                          <p className="font-black">{s.nom} {s.prenom}</p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              copierTexte(`Identifiant: ${s.immatriculation}\nMot de passe: ${s.motDePasse}`, 'Identifiants');
                            }}
                            className="brutal-button"
                          >
                            <Copy className="h-4 w-4 mr-1" />
                            Copier
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground font-bold">Identifiant</p>
                            <code className="font-mono font-bold">{s.immatriculation}</code>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground font-bold">Mot de passe</p>
                            <code className="font-mono font-bold">{s.motDePasse}</code>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Erreurs */}
              {bulkResults && bulkResults.erreurs.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-black text-lg text-red-600">
                    ❌ Erreurs ({bulkResults.erreurs.length})
                  </h3>
                  <div className="bg-red-50 p-4 rounded-xl border-2 border-red-600 space-y-2">
                    {bulkResults.erreurs.map((err, idx) => (
                      <div key={idx} className="bg-white p-3 rounded-lg border-2 border-black">
                        <p className="font-bold text-sm">{err.nom} {err.prenom}</p>
                        <p className="text-xs text-red-600 mt-1">{err.erreur}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={() => setBulkResults(null)}
                className="brutal-button w-full"
              >
                Fermer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default ComptesEleves;
