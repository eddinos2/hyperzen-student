// Utilitaires pour le wizard d'ajout d'élève

export interface WizardFormData {
  eleve: {
    nom: string;
    prenom: string;
    email: string;
    telephone: string;
    adresse: string;
    matricule: string;
    statut_inscription: string;
  };
  dossier: {
    annee_scolaire: string;
    campus_id: string;
    filiere_id: string;
    annee_id: string;
    tarif_scolarite: string;
    impaye_anterieur: string;
    rythme: string;
    commentaire: string;
  };
  acompte: {
    generer: boolean;
    montant: string;
    date_reglement: string;
    moyen_paiement: string;
    numero_piece: string;
    commentaire: string;
  };
  echeancier: {
    generer: boolean;
    nb_echeances: string;
    date_debut: string;
    jour_echeance: string;
    notifications: boolean;
    moyen_paiement: string;
  };
}

export const initialFormData: WizardFormData = {
  eleve: {
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    adresse: '',
    matricule: '',
    statut_inscription: 'Inscrit',
  },
  dossier: {
    annee_scolaire: '2025_2026',
    campus_id: '',
    filiere_id: '',
    annee_id: '',
    tarif_scolarite: '',
    impaye_anterieur: '0',
    rythme: '',
    commentaire: '',
  },
  acompte: {
    generer: false,
    montant: '',
    date_reglement: new Date().toISOString().split('T')[0],
    moyen_paiement: 'Virement',
    numero_piece: '',
    commentaire: '',
  },
  echeancier: {
    generer: false,
    nb_echeances: '10',
    date_debut: new Date().toISOString().split('T')[0],
    jour_echeance: '14',
    notifications: true,
    moyen_paiement: 'Chèque',
  },
};

// Calcul automatiques
export const calculateResteAPayer = (
  tarif: number,
  impaye: number,
  acompte: number
): number => {
  return Math.max(0, tarif + impaye - acompte);
};

export const calculateMontantEcheance = (
  resteAPayer: number,
  nbEcheances: number
): number => {
  return nbEcheances > 0 ? Math.round((resteAPayer / nbEcheances) * 100) / 100 : 0;
};

// Validation des étapes
export const validateEtape1 = (eleve: WizardFormData['eleve']): boolean => {
  return !!(eleve.nom && eleve.prenom && eleve.email);
};

export const validateEtape2 = (dossier: WizardFormData['dossier']): boolean => {
  return !!(dossier.annee_scolaire && dossier.tarif_scolarite);
};

export const validateEtape3 = (acompte: WizardFormData['acompte']): boolean => {
  if (!acompte.generer) return true;
  return !!(acompte.montant && parseFloat(acompte.montant) > 0 && acompte.date_reglement);
};

export const validateEtape4 = (echeancier: WizardFormData['echeancier']): boolean => {
  if (!echeancier.generer) return true;
  return !!(
    echeancier.nb_echeances &&
    parseInt(echeancier.nb_echeances) > 0 &&
    echeancier.date_debut &&
    echeancier.jour_echeance
  );
};

// Sauvegarde automatique dans localStorage
const STORAGE_KEY = 'wizard_form_data';

export const saveFormDataToStorage = (data: WizardFormData): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Erreur sauvegarde localStorage:', error);
  }
};

export const loadFormDataFromStorage = (): WizardFormData | null => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.error('Erreur chargement localStorage:', error);
    return null;
  }
};

export const clearFormDataFromStorage = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Erreur nettoyage localStorage:', error);
  }
};
