// Extensions des types de la base de données
export interface PlanPaiement {
  id: string;
  nom: string;
  description?: string;
  filiere_id?: string;
  campus_id?: string;
  annee_scolaire: string;
  tarif_base: number;
  moyen_paiement: string;
  nombre_echeances: number;
  frequence: string;
  jour_echeance: number;
  date_premiere_echeance?: string;
  actif: boolean;
  created_at: string;
  updated_at: string;
}

export interface EleveEnrichi {
  id: string;
  user_id?: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  adresse?: string;
  date_inscription?: string;
  date_naissance?: string;
  ine?: string;
  immatriculation?: string;
  contact_urgence?: {
    nom: string;
    telephone: string;
    relation: string;
  };
  source_inscription?: string;
  statut_inscription?: string;
  created_at: string;
  updated_at: string;
}

export interface TicketEnrichi {
  id: string;
  eleve_id?: string;
  sujet: string;
  statut: string;
  priorite: string;
  assigne_a?: string;
  campus_id?: string;
  niveau_escalade: number;
  date_escalade?: string;
  resolu_at?: string;
  resolu_by?: string;
  created_at: string;
  updated_at: string;
  eleves?: {
    nom: string;
    prenom: string;
    email: string;
  };
  assigne_profile?: {
    nom: string;
    prenom: string;
  };
}