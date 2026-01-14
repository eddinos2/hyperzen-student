import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Search, Check, ChevronsUpDown, Calendar, Clock } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';

interface AjouterReglementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  prefilledDossierId?: string; // Optionnel: pré-remplir avec un dossier
}

export const AjouterReglementDialog = ({ open, onOpenChange, onSuccess, prefilledDossierId }: AjouterReglementDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [openCombobox, setOpenCombobox] = useState(false);
  const [formData, setFormData] = useState({
    eleve_id: '',
    dossier_id: prefilledDossierId || '',
    montant: '',
    date_reglement: new Date().toISOString().split('T')[0],
    moyen_paiement: 'CB',
    numero_piece: '',
    commentaire: '',
    type_operation: 'paiement',
  });

  // États pour paiement échelonné
  const [paiementEchelonne, setPaiementEchelonne] = useState(false);
  const [echelonneData, setEchelonneData] = useState({
    nombre_paiements: 2,
    montant_par_paiement: '',
    date_premier_paiement: new Date().toISOString().split('T')[0],
    jour_mois: 14,
  });

  const { data: eleves } = useQuery({
    queryKey: ['eleves-with-dossiers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('eleves')
        .select(`
          id,
          nom,
          prenom,
          email,
          immatriculation,
          dossiers_scolarite (
            id,
            annee_scolaire,
            tarif_scolarite,
            impaye_anterieur,
            rythme,
            campus:campus_id (nom),
            filiere:filiere_id (nom),
            annee:annee_id (libelle)
          )
        `)
        .order('nom', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  const selectedEleve = eleves?.find(e => e.id === formData.eleve_id);
  const dossiers = selectedEleve?.dossiers_scolarite || [];

  // Pré-remplir le formulaire si un dossierId est fourni
  useEffect(() => {
    if (prefilledDossierId && eleves) {
      const eleveAvecDossier = eleves.find(e => 
        e.dossiers_scolarite?.some((d: any) => d.id === prefilledDossierId)
      );
      if (eleveAvecDossier) {
        setFormData(prev => ({
          ...prev,
          eleve_id: eleveAvecDossier.id,
          dossier_id: prefilledDossierId,
        }));
      }
    }
  }, [prefilledDossierId, eleves]);

  // Calculer le solde du dossier sélectionné
  const { data: soldeDossier } = useQuery({
    queryKey: ['solde-dossier', formData.dossier_id],
    queryFn: async () => {
      if (!formData.dossier_id) return null;
      
      const { data, error } = await supabase
        .rpc('calculer_solde_dossier', { dossier_uuid: formData.dossier_id })
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!formData.dossier_id,
  });

  const dossierSelectionne = dossiers.find((d: any) => d.id === formData.dossier_id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Logique pour paiement échelonné
      if (paiementEchelonne && (formData.moyen_paiement === 'Chèque' || formData.moyen_paiement === 'Prélèvement')) {
        const montantParPaiement = parseFloat(echelonneData.montant_par_paiement);
        const nombrePaiements = echelonneData.nombre_paiements;
        
        // Créer tous les règlements
        const reglements = [];
        for (let i = 0; i < nombrePaiements; i++) {
          const dateCalculee = new Date(echelonneData.date_premier_paiement);
          dateCalculee.setMonth(dateCalculee.getMonth() + i);
          dateCalculee.setDate(echelonneData.jour_mois);
          
          const commentaireAuto = `${formData.moyen_paiement} ${i + 1}/${nombrePaiements} - Échéancier créé le ${new Date().toLocaleDateString('fr-FR')}`;
          const numeroPiece = formData.numero_piece ? `${formData.numero_piece}-${i + 1}` : null;
          
          reglements.push({
            dossier_id: formData.dossier_id,
            montant: montantParPaiement,
            date_reglement: dateCalculee.toISOString().split('T')[0],
            moyen_paiement: formData.moyen_paiement,
            numero_piece: numeroPiece,
            commentaire: formData.commentaire ? `${commentaireAuto}\n${formData.commentaire}` : commentaireAuto,
            statut: i === 0 ? 'valide' : 'en_attente',
            type_operation: formData.type_operation,
          });
        }

        // Insérer tous les règlements
        const { data: newReglements, error } = await supabase
          .from('reglements')
          .insert(reglements)
          .select();

        if (error) throw error;

        // Générer le reçu PDF uniquement pour le premier paiement
        const premierReglement = newReglements.find(r => r.statut === 'valide');
        if (premierReglement) {
          try {
            await supabase.functions.invoke('generer-recu-pdf', {
              body: { reglementId: premierReglement.id }
            });
          } catch (pdfError) {
            console.error('Erreur lors de la génération du PDF:', pdfError);
          }

          // Synchroniser avec une échéance non payée
          try {
            const { data: echeanceNonPayee } = await supabase
              .from('echeances')
              .select('id')
              .eq('dossier_id', formData.dossier_id)
              .in('statut', ['a_venir', 'en_retard'])
              .order('date_echeance', { ascending: true })
              .limit(1)
              .single();

            if (echeanceNonPayee) {
              await supabase.functions.invoke('synchroniser-echeance-reglement', {
                body: { 
                  action: 'marquer_payee',
                  echeanceId: echeanceNonPayee.id,
                  reglementId: premierReglement.id,
                },
              });
            }
          } catch (syncError) {
            console.log('Pas d\'échéance à synchroniser:', syncError);
          }
        }

        toast({
          title: 'Échéancier créé',
          description: `${nombrePaiements} paiements de ${montantParPaiement.toFixed(2)}€ créés avec succès. Total: ${(montantParPaiement * nombrePaiements).toFixed(2)}€`
        });

      } else {
        // Logique standard pour un paiement unique
        const montantFinal = Math.abs(parseFloat(formData.montant));
        
        const { data: newReglement, error } = await supabase
          .from('reglements')
          .insert({
            dossier_id: formData.dossier_id,
            montant: montantFinal,
            date_reglement: formData.date_reglement,
            moyen_paiement: formData.moyen_paiement,
            numero_piece: formData.numero_piece || null,
            commentaire: formData.commentaire || null,
            statut: 'valide',
            type_operation: formData.type_operation,
          })
          .select()
          .single();

        if (error) throw error;

        // Générer le reçu PDF automatiquement
        if (newReglement) {
          try {
            await supabase.functions.invoke('generer-recu-pdf', {
              body: { reglementId: newReglement.id }
            });
            console.log('Reçu PDF généré avec succès');
          } catch (pdfError) {
            console.error('Erreur lors de la génération du PDF:', pdfError);
          }

          // Synchroniser avec une échéance non payée si disponible
          try {
            const { data: echeanceNonPayee } = await supabase
              .from('echeances')
              .select('id')
              .eq('dossier_id', formData.dossier_id)
              .in('statut', ['a_venir', 'en_retard'])
              .order('date_echeance', { ascending: true })
              .limit(1)
              .single();

            if (echeanceNonPayee) {
              await supabase.functions.invoke('synchroniser-echeance-reglement', {
                body: { 
                  action: 'marquer_payee',
                  echeanceId: echeanceNonPayee.id,
                  reglementId: newReglement.id,
                },
              });
              console.log('Échéance synchronisée avec le règlement');
            }
          } catch (syncError) {
            console.log('Pas d\'échéance à synchroniser ou erreur:', syncError);
          }
        }

        // Envoyer notification email
        const eleveData = eleves?.find(e => e.id === formData.eleve_id);
        if (eleveData) {
          try {
            await supabase.functions.invoke('envoyer-notification-email', {
              body: {
                type: 'reglement',
                eleveEmail: eleveData.email || formData.eleve_id,
                eleveNom: eleveData.nom,
                elevePrenom: eleveData.prenom,
                montant: parseFloat(formData.montant),
                dateReglement: formData.date_reglement,
              },
            });
          } catch (emailError) {
            console.error('Email notification error:', emailError);
          }
        }

        toast({
          title: formData.type_operation === 'remboursement' ? 'Remboursement enregistré' : 'Règlement enregistré',
          description: formData.type_operation === 'remboursement' 
            ? 'Le remboursement a été enregistré avec succès'
            : 'Le règlement a été ajouté avec succès'
        });

        // Déclencher la notification de confirmation de paiement
        if (newReglement) {
          supabase.functions.invoke('notifier-confirmation-paiement', {
            body: { reglementId: newReglement.id }
          }).catch(err => {
            console.error('Erreur envoi notification:', err);
          });
        }
      }

      onSuccess();
      onOpenChange(false);
      setFormData({
        eleve_id: '',
        dossier_id: '',
        montant: '',
        date_reglement: new Date().toISOString().split('T')[0],
        moyen_paiement: 'CB',
        numero_piece: '',
        commentaire: '',
        type_operation: 'paiement',
      });
      setPaiementEchelonne(false);
      setEchelonneData({
        nombre_paiements: 2,
        montant_par_paiement: '',
        date_premier_paiement: new Date().toISOString().split('T')[0],
        jour_mois: 14,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-4 border-black rounded-3xl bg-white">
        <DialogHeader>
          <DialogTitle className="text-3xl font-black">AJOUTER UN RÈGLEMENT</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-black uppercase mb-2">Type d'opération *</label>
            <select
              required
              value={formData.type_operation}
              onChange={(e) => setFormData({ ...formData, type_operation: e.target.value })}
              className="h-12 px-4 border-4 border-black rounded-xl font-bold text-base w-full"
            >
              <option value="paiement">💰 Paiement (Encaissement)</option>
              <option value="remboursement">↩️ Remboursement (Crédit élève)</option>
            </select>
            {formData.type_operation === 'remboursement' && (
              <p className="mt-2 text-sm font-bold text-orange-600 bg-orange-50 p-2 rounded-lg border-2 border-orange-300">
                ⚠️ Un remboursement sera déduit du total versé de l'élève
              </p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-black uppercase mb-2">Élève *</label>
            
            <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openCombobox}
                  className="w-full h-14 justify-between border-4 border-black rounded-xl font-bold text-base hover:bg-muted"
                >
                  {formData.eleve_id ? (
                    <span className="flex items-center gap-2 truncate">
                      <span className="font-black">
                        {selectedEleve?.nom} {selectedEleve?.prenom}
                      </span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-sm">{selectedEleve?.email}</span>
                      {selectedEleve?.immatriculation && (
                        <>
                          <span className="text-muted-foreground">•</span>
                          <code className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            {selectedEleve?.immatriculation}
                          </code>
                        </>
                      )}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Rechercher un élève...</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-5 w-5 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0 border-4 border-black" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                <Command>
                  <CommandInput 
                    placeholder="Rechercher par nom, email, immatriculation..." 
                    className="h-12 border-0 border-b-2 border-black font-bold"
                  />
                  <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                    Aucun élève trouvé.
                  </CommandEmpty>
                  <CommandGroup className="max-h-[300px] overflow-auto">
                    {eleves?.map((eleve) => (
                      <CommandItem
                        key={eleve.id}
                        value={`${eleve.nom} ${eleve.prenom} ${eleve.email} ${eleve.immatriculation || ''}`}
                        onSelect={() => {
                          const firstDossier = eleve.dossiers_scolarite?.[0]?.id || '';
                          setFormData({ ...formData, eleve_id: eleve.id, dossier_id: firstDossier });
                          setOpenCombobox(false);
                        }}
                        className="py-3 px-4 cursor-pointer"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4 flex-shrink-0",
                            formData.eleve_id === eleve.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col gap-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-black">{eleve.nom} {eleve.prenom}</span>
                            {eleve.immatriculation && (
                              <code className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                {eleve.immatriculation}
                              </code>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground truncate">{eleve.email}</span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {formData.eleve_id && dossiers.length > 0 && (
            <div>
              <label className="block text-sm font-black uppercase mb-2">Dossier *</label>
              <select
                required
                value={formData.dossier_id}
                onChange={(e) => setFormData({ ...formData, dossier_id: e.target.value })}
                className="h-12 px-4 border-4 border-black rounded-xl font-bold text-base w-full"
              >
                {dossiers.map((dossier: any) => (
                  <option key={dossier.id} value={dossier.id}>
                    Année {dossier.annee_scolaire} - {dossier.campus?.nom || 'N/A'} - {dossier.filiere?.nom || 'N/A'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Affichage des informations du dossier sélectionné */}
          {formData.dossier_id && dossierSelectionne && soldeDossier && (
            <Card className="border-4 border-green-500 bg-green-50">
              <CardContent className="pt-4">
                <h3 className="font-black text-green-900 mb-3 uppercase text-sm">
                  📋 Informations du dossier
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="font-bold text-green-800">Campus:</span>
                    <p className="font-black text-green-900">{dossierSelectionne.campus?.nom || 'Non défini'}</p>
                  </div>
                  <div>
                    <span className="font-bold text-green-800">Filière:</span>
                    <p className="font-black text-green-900">{dossierSelectionne.filiere?.nom || 'Non défini'}</p>
                  </div>
                  <div>
                    <span className="font-bold text-green-800">Année:</span>
                    <p className="font-black text-green-900">{dossierSelectionne.annee?.libelle || dossierSelectionne.annee_scolaire}</p>
                  </div>
                  <div>
                    <span className="font-bold text-green-800">Rythme:</span>
                    <p className="font-black text-green-900">{dossierSelectionne.rythme || 'Non défini'}</p>
                  </div>
                  <div className="col-span-2 border-t-2 border-green-300 pt-3 mt-2">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <span className="font-bold text-green-800 text-xs">Tarif scolarité:</span>
                        <p className="font-black text-green-900">{dossierSelectionne.tarif_scolarite?.toFixed(2)}€</p>
                      </div>
                      <div>
                        <span className="font-bold text-green-800 text-xs">Total versé:</span>
                        <p className="font-black text-blue-700">{soldeDossier.total_verse?.toFixed(2)}€</p>
                      </div>
                      <div>
                        <span className="font-bold text-orange-800 text-xs">Reste à payer:</span>
                        <p className="font-black text-orange-700 text-lg">{soldeDossier.reste_a_payer?.toFixed(2)}€</p>
                      </div>
                    </div>
                  </div>
                  {soldeDossier.reste_a_payer > 0 && !paiementEchelonne && (
                    <div className="col-span-2">
                      <Button
                        type="button"
                        onClick={() => setFormData({ ...formData, montant: soldeDossier.reste_a_payer.toFixed(2) })}
                        className="w-full brutal-button bg-orange-500 text-white hover:bg-orange-600"
                      >
                        💡 Pré-remplir avec le reste à payer ({soldeDossier.reste_a_payer.toFixed(2)}€)
                      </Button>
                    </div>
                  )}
                  {soldeDossier.reste_a_payer > 0 && paiementEchelonne && (
                    <div className="col-span-2">
                      <Button
                        type="button"
                        onClick={() => setEchelonneData({ 
                          ...echelonneData, 
                          montant_par_paiement: (soldeDossier.reste_a_payer / echelonneData.nombre_paiements).toFixed(2) 
                        })}
                        className="w-full brutal-button bg-orange-500 text-white hover:bg-orange-600"
                      >
                        💡 Répartir le reste à payer sur {echelonneData.nombre_paiements} paiements
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-black uppercase mb-2">
                Montant (€) * {formData.type_operation === 'remboursement' && '(valeur positive)'}
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={formData.montant}
                onChange={(e) => setFormData({ ...formData, montant: e.target.value })}
                className="h-12 px-4 border-4 border-black rounded-xl font-bold text-base w-full"
                placeholder="0.00"
              />
              {formData.type_operation === 'remboursement' && formData.montant && (
                <p className="mt-1 text-sm font-bold text-orange-600">
                  Sera déduit: -{parseFloat(formData.montant).toFixed(2)}€
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-black uppercase mb-2">Date *</label>
              <input
                type="date"
                required
                value={formData.date_reglement}
                onChange={(e) => setFormData({ ...formData, date_reglement: e.target.value })}
                className="h-12 px-4 border-4 border-black rounded-xl font-bold text-base w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-black uppercase mb-2">Moyen de paiement *</label>
              <select
                required
                value={formData.moyen_paiement}
                onChange={(e) => {
                  setFormData({ ...formData, moyen_paiement: e.target.value });
                  // Désactiver le paiement échelonné si on change pour un moyen non compatible
                  if (e.target.value !== 'Chèque' && e.target.value !== 'Prélèvement') {
                    setPaiementEchelonne(false);
                  }
                }}
                className="h-12 px-4 border-4 border-black rounded-xl font-bold text-base w-full"
              >
                <option value="CB">CB</option>
                <option value="Chèque">Chèque</option>
                <option value="Virement">Virement</option>
                <option value="Prélèvement">Prélèvement</option>
                <option value="Espèce">Espèce</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-black uppercase mb-2">N° de pièce</label>
              <input
                type="text"
                value={formData.numero_piece}
                onChange={(e) => setFormData({ ...formData, numero_piece: e.target.value })}
                className="h-12 px-4 border-4 border-black rounded-xl font-bold text-base w-full"
                placeholder="Optionnel"
              />
            </div>
          </div>

          {/* Option paiement échelonné pour Chèque et Prélèvement */}
          {(formData.moyen_paiement === 'Chèque' || formData.moyen_paiement === 'Prélèvement') && formData.type_operation === 'paiement' && (
            <Card className="border-4 border-blue-500 bg-blue-50">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-700" />
                    <label className="text-sm font-black uppercase text-blue-900">
                      Paiement en plusieurs fois ?
                    </label>
                  </div>
                  <Switch
                    checked={paiementEchelonne}
                    onCheckedChange={setPaiementEchelonne}
                  />
                </div>

                {paiementEchelonne && (
                  <div className="space-y-4 mt-4 pt-4 border-t-2 border-blue-300">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-black uppercase mb-2 text-blue-900">
                          Nombre de paiements *
                        </label>
                        <input
                          type="number"
                          min="2"
                          max="12"
                          required
                          value={echelonneData.nombre_paiements}
                          onChange={(e) => setEchelonneData({ ...echelonneData, nombre_paiements: parseInt(e.target.value) })}
                          className="h-12 px-4 border-4 border-blue-600 rounded-xl font-bold text-base w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-black uppercase mb-2 text-blue-900">
                          Montant par paiement (€) *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          required
                          value={echelonneData.montant_par_paiement}
                          onChange={(e) => setEchelonneData({ ...echelonneData, montant_par_paiement: e.target.value })}
                          className="h-12 px-4 border-4 border-blue-600 rounded-xl font-bold text-base w-full"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-black uppercase mb-2 text-blue-900">
                          Date 1er paiement *
                        </label>
                        <input
                          type="date"
                          required
                          value={echelonneData.date_premier_paiement}
                          onChange={(e) => setEchelonneData({ ...echelonneData, date_premier_paiement: e.target.value })}
                          className="h-12 px-4 border-4 border-blue-600 rounded-xl font-bold text-base w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-black uppercase mb-2 text-blue-900">
                          Jour du mois (suivants) *
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="28"
                          required
                          value={echelonneData.jour_mois}
                          onChange={(e) => setEchelonneData({ ...echelonneData, jour_mois: parseInt(e.target.value) })}
                          className="h-12 px-4 border-4 border-blue-600 rounded-xl font-bold text-base w-full"
                        />
                      </div>
                    </div>

                    {/* Récapitulatif visuel */}
                    {echelonneData.montant_par_paiement && echelonneData.nombre_paiements >= 2 && (
                      <div className="bg-white border-2 border-blue-400 rounded-xl p-4 mt-4">
                        <h4 className="font-black text-blue-900 mb-3 flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          🗓️ ÉCHÉANCIER PRÉVU
                        </h4>
                        <div className="space-y-2 text-sm">
                          {Array.from({ length: echelonneData.nombre_paiements }).map((_, i) => {
                            const date = new Date(echelonneData.date_premier_paiement);
                            date.setMonth(date.getMonth() + i);
                            date.setDate(echelonneData.jour_mois);
                            return (
                              <div key={i} className="flex items-center gap-2 font-bold">
                                {i === 0 ? (
                                  <span className="text-green-600">✓</span>
                                ) : (
                                  <span className="text-blue-600">⏳</span>
                                )}
                                <span className={i === 0 ? 'text-green-700' : 'text-blue-700'}>
                                  {i + 1}er paiement : {parseFloat(echelonneData.montant_par_paiement).toFixed(2)}€ le {date.toLocaleDateString('fr-FR')}
                                  {i === 0 && ' (validé immédiatement)'}
                                  {i > 0 && ' (en attente)'}
                                </span>
                              </div>
                            );
                          })}
                          <div className="pt-2 mt-2 border-t-2 border-blue-300 font-black text-blue-900">
                            💰 TOTAL : {(parseFloat(echelonneData.montant_par_paiement) * echelonneData.nombre_paiements).toFixed(2)}€ sur {echelonneData.nombre_paiements} mois
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div>
            <label className="block text-sm font-black uppercase mb-2">Commentaire</label>
            <textarea
              value={formData.commentaire}
              onChange={(e) => setFormData({ ...formData, commentaire: e.target.value })}
              className="min-h-20 px-4 py-3 border-4 border-black rounded-xl font-bold text-base w-full resize-none"
              placeholder="Optionnel"
            />
          </div>

          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={loading || !formData.dossier_id}
              className="flex-1 brutal-button bg-primary text-primary-foreground"
            >
              {loading ? 'ENREGISTREMENT...' : 'ENREGISTRER'}
            </Button>
            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex-1 brutal-button bg-secondary text-secondary-foreground"
            >
              ANNULER
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
