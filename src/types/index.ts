export type AppRole = 'admin' | 'finance' | 'pedagogie' | 'eleve' | 'gestionnaire' | 'lecteur';

export interface Eleve {
  id: string;
  user_id?: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  adresse?: string;
  statut_inscription?: string;
  created_at: string;
  updated_at: string;
}

export interface DossierScolarite {
  id: string;
  eleve_id: string;
  campus_id?: string;
  filiere_id?: string;
  annee_id?: string;
  rythme?: string;
  tarif_scolarite: number;
  impaye_anterieur: number;
  commentaire?: string;
  annee_scolaire: string;
  statut_dossier: string;
  created_at: string;
  updated_at: string;
}

export interface Reglement {
  id: string;
  dossier_id: string;
  montant: number;
  moyen_paiement: string;
  date_reglement: string;
  numero_piece?: string;
  statut: string;
  commentaire?: string;
  created_at: string;
  created_by?: string;
}

export interface Echeance {
  id: string;
  dossier_id: string;
  montant: number;
  date_echeance: string;
  statut: 'a_venir' | 'payee' | 'en_retard' | 'annulee';
  reglement_id?: string;
  created_at: string;
}

export interface Anomalie {
  id: string;
  dossier_id?: string;
  type_anomalie: string;
  severite: 'info' | 'alerte' | 'critique';
  description: string;
  details?: any;
  statut: 'ouverte' | 'en_cours' | 'resolue' | 'ignoree';
  action_proposee?: string;
  resolved_at?: string;
  resolved_by?: string;
  created_at: string;
}

export interface Campus {
  id: string;
  nom: string;
  code?: string;
  actif: boolean;
  created_at: string;
}

export interface Filiere {
  id: string;
  nom: string;
  code?: string;
  actif: boolean;
  created_at: string;
}

export interface AnneeScolaire {
  id: string;
  libelle: string;
  ordre?: number;
  created_at: string;
}

export interface SoldeCalcule {
  total_verse: number;
  reste_a_payer: number;
  difference: number;
  nb_reglements: number;
  dernier_reglement?: string;
}
