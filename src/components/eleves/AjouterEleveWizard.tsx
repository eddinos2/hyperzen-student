import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UserPlus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import {
  WizardFormData,
  initialFormData,
  validateEtape1,
  validateEtape2,
  validateEtape3,
  validateEtape4,
  saveFormDataToStorage,
  loadFormDataFromStorage,
  clearFormDataFromStorage,
} from '@/lib/wizard-utils';
import { EtapeInfosPersonnelles } from './wizard/EtapeInfosPersonnelles';
import { EtapeDossier } from './wizard/EtapeDossier';
import { EtapeReglementInitial } from './wizard/EtapeReglementInitial';
import { EtapeEcheancier } from './wizard/EtapeEcheancier';
import { EtapeRecapitulatif } from './wizard/EtapeRecapitulatif';
import { useNavigate } from 'react-router-dom';

interface AjouterEleveWizardProps {
  onSuccess?: () => void;
}

export const AjouterEleveWizard = ({ onSuccess }: AjouterEleveWizardProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<WizardFormData>(initialFormData);

  // Charger les données sauvegardées à l'ouverture
  useEffect(() => {
    if (open) {
      const saved = loadFormDataFromStorage();
      if (saved) {
        setFormData(saved);
        toast({
          title: 'Données récupérées',
          description: 'Vos données précédentes ont été restaurées',
        });
      }
    }
  }, [open]);

  // Auto-save toutes les modifications
  useEffect(() => {
    if (open) {
      saveFormDataToStorage(formData);
    }
  }, [formData, open]);

  const totalSteps = 5;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const steps = [
    { title: 'Informations personnelles', component: EtapeInfosPersonnelles, validate: () => validateEtape1(formData.eleve) },
    { title: 'Dossier de scolarité', component: EtapeDossier, validate: () => validateEtape2(formData.dossier) },
    { title: 'Règlement initial', component: EtapeReglementInitial, validate: () => validateEtape3(formData.acompte) },
    { title: 'Échéancier', component: EtapeEcheancier, validate: () => validateEtape4(formData.echeancier) },
    { title: 'Récapitulatif', component: EtapeRecapitulatif, validate: () => true },
  ];

  const canGoNext = steps[currentStep].validate();

  const handleNext = () => {
    if (canGoNext && currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      // 1. Créer l'élève
      const { data: eleve, error: eleveError } = await supabase
        .from('eleves')
        .insert({
          nom: formData.eleve.nom,
          prenom: formData.eleve.prenom,
          email: formData.eleve.email,
          telephone: formData.eleve.telephone || null,
          adresse: formData.eleve.adresse || null,
          immatriculation: formData.eleve.matricule || null,
          statut_inscription: formData.eleve.statut_inscription,
        })
        .select()
        .single();

      if (eleveError) throw eleveError;

      // 2. Créer le dossier
      const { data: dossier, error: dossierError } = await supabase
        .from('dossiers_scolarite')
        .insert({
          eleve_id: eleve.id,
          campus_id: formData.dossier.campus_id || null,
          filiere_id: formData.dossier.filiere_id || null,
          annee_id: formData.dossier.annee_id || null,
          tarif_scolarite: parseFloat(formData.dossier.tarif_scolarite) || 0,
          impaye_anterieur: parseFloat(formData.dossier.impaye_anterieur) || 0,
          rythme: formData.dossier.rythme || null,
          commentaire: formData.dossier.commentaire || null,
          annee_scolaire: formData.dossier.annee_scolaire,
          statut_dossier: 'en_cours',
        })
        .select()
        .single();

      if (dossierError) throw dossierError;

      // 3. Créer le règlement initial si demandé (en_attente pour suivi documents)
      if (formData.acompte.generer) {
        const { error: reglementError } = await supabase
          .from('reglements')
          .insert({
            dossier_id: dossier.id,
            montant: parseFloat(formData.acompte.montant),
            date_reglement: formData.acompte.date_reglement,
            moyen_paiement: formData.acompte.moyen_paiement,
            numero_piece: formData.acompte.numero_piece || null,
            commentaire: formData.acompte.commentaire || null,
            statut: 'en_attente', // En attente de réception du document
            created_by: user.id,
          });

        if (reglementError) throw reglementError;
      }

      // 4. Générer l'échéancier si demandé
      if (formData.echeancier.generer) {
        const nbEcheances = parseInt(formData.echeancier.nb_echeances);
        const dateDebut = new Date(formData.echeancier.date_debut);
        const tarif = parseFloat(formData.dossier.tarif_scolarite) || 0;
        const impaye = parseFloat(formData.dossier.impaye_anterieur) || 0;
        const acompte = formData.acompte.generer ? parseFloat(formData.acompte.montant) : 0;
        const resteAPayer = tarif + impaye - acompte;
        const montantParEcheance = Math.round((resteAPayer / nbEcheances) * 100) / 100;

        // Créer les règlements en attente pour chaque échéance
        const reglementsEcheancier = [];
        for (let i = 1; i <= nbEcheances; i++) {
          const dateEcheance = new Date(dateDebut);
          dateEcheance.setMonth(dateEcheance.getMonth() + (i - 1));
          
          reglementsEcheancier.push({
            dossier_id: dossier.id,
            montant: montantParEcheance,
            date_reglement: dateEcheance.toISOString().split('T')[0],
            moyen_paiement: formData.echeancier.moyen_paiement,
            numero_piece: formData.echeancier.moyen_paiement === 'Chèque' ? `CHQ-${i}` : `PREL-${i}`,
            statut: 'en_attente',
            type_operation: 'paiement',
            commentaire: `Échéance ${i}/${nbEcheances} - En attente de réception`,
            created_by: user.id,
          });
        }

        if (reglementsEcheancier.length > 0) {
          const { error: reglementsError } = await supabase
            .from('reglements')
            .insert(reglementsEcheancier);

          if (reglementsError) throw reglementsError;
        }
      }

      toast({
        title: '✅ Élève créé avec succès',
        description: `${formData.eleve.prenom} ${formData.eleve.nom} a été ajouté`,
      });

      // Nettoyer le localStorage
      clearFormDataFromStorage();

      setOpen(false);
      setCurrentStep(0);
      setFormData(initialFormData);

      if (onSuccess) onSuccess();
      
      // Rediriger vers la fiche de l'élève
      navigate(`/eleves/${eleve.id}`);
    } catch (error: any) {
      console.error(error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de créer l\'élève',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const CurrentStepComponent = steps[currentStep].component;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="brutal-button">
          <UserPlus className="h-5 w-5 mr-2" />
          AJOUTER UN ÉLÈVE
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl font-black">
            Nouvel élève - Étape {currentStep + 1}/{totalSteps}
          </DialogTitle>
          <div className="space-y-2">
            <Progress value={progress} className="h-3" />
            <p className="text-sm font-bold text-muted-foreground">
              {steps[currentStep].title}
            </p>
          </div>
        </DialogHeader>

        <div className="py-6">
          {currentStep === 0 && (
            <EtapeInfosPersonnelles
              formData={formData.eleve}
              onChange={(data) => setFormData({ ...formData, eleve: { ...formData.eleve, ...data } })}
            />
          )}
          {currentStep === 1 && (
            <EtapeDossier
              formData={formData.dossier}
              onChange={(data) => setFormData({ ...formData, dossier: { ...formData.dossier, ...data } })}
            />
          )}
          {currentStep === 2 && (
            <EtapeReglementInitial
              formData={formData.acompte}
              onChange={(data) => setFormData({ ...formData, acompte: { ...formData.acompte, ...data } })}
            />
          )}
          {currentStep === 3 && (
            <EtapeEcheancier
              formData={formData.echeancier}
              onChange={(data) => setFormData({ ...formData, echeancier: { ...formData.echeancier, ...data } })}
              tarifScolarite={formData.dossier.tarif_scolarite}
              impayeAnterieur={formData.dossier.impaye_anterieur}
              montantAcompte={formData.acompte.generer ? formData.acompte.montant : '0'}
            />
          )}
          {currentStep === 4 && <EtapeRecapitulatif formData={formData} />}
        </div>

        <div className="flex gap-4 pt-4 border-t-4 border-black">
          {currentStep > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              className="flex-1"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Précédent
            </Button>
          )}
          
          {currentStep < totalSteps - 1 ? (
            <Button
              type="button"
              onClick={handleNext}
              disabled={!canGoNext}
              className="brutal-button flex-1"
            >
              Suivant
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="brutal-button flex-1"
            >
              {loading ? 'Création...' : '✨ CRÉER L\'ÉLÈVE'}
            </Button>
          )}
        </div>

        {currentStep === 0 && (
          <p className="text-xs text-center text-muted-foreground">
            💾 Vos données sont automatiquement sauvegardées
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
};
