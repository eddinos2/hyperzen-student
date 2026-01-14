export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      annees_scolaires: {
        Row: {
          created_at: string | null
          id: string
          libelle: string
          ordre: number | null
          par_defaut: boolean | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          libelle: string
          ordre?: number | null
          par_defaut?: boolean | null
        }
        Update: {
          created_at?: string | null
          id?: string
          libelle?: string
          ordre?: number | null
          par_defaut?: boolean | null
        }
        Relationships: []
      }
      anomalies: {
        Row: {
          action_proposee: string | null
          created_at: string | null
          description: string
          details: Json | null
          dossier_id: string | null
          eleve_id: string | null
          id: string
          resolved_at: string | null
          resolved_by: string | null
          severite: string | null
          statut: string | null
          type_anomalie: string
        }
        Insert: {
          action_proposee?: string | null
          created_at?: string | null
          description: string
          details?: Json | null
          dossier_id?: string | null
          eleve_id?: string | null
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severite?: string | null
          statut?: string | null
          type_anomalie: string
        }
        Update: {
          action_proposee?: string | null
          created_at?: string | null
          description?: string
          details?: Json | null
          dossier_id?: string | null
          eleve_id?: string | null
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severite?: string | null
          statut?: string | null
          type_anomalie?: string
        }
        Relationships: [
          {
            foreignKeyName: "anomalies_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers_scolarite"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anomalies_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "eleves"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: unknown
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      campus: {
        Row: {
          actif: boolean | null
          code: string | null
          created_at: string | null
          id: string
          nom: string
        }
        Insert: {
          actif?: boolean | null
          code?: string | null
          created_at?: string | null
          id?: string
          nom: string
        }
        Update: {
          actif?: boolean | null
          code?: string | null
          created_at?: string | null
          id?: string
          nom?: string
        }
        Relationships: []
      }
      documents_pedagogiques: {
        Row: {
          annee_ids: string[] | null
          campus_ids: string[] | null
          created_at: string | null
          created_by: string | null
          eleve_ids: string[] | null
          fichier_url: string
          filiere_ids: string[] | null
          id: string
          titre: string
          type_document: string | null
          visible_tous: boolean | null
        }
        Insert: {
          annee_ids?: string[] | null
          campus_ids?: string[] | null
          created_at?: string | null
          created_by?: string | null
          eleve_ids?: string[] | null
          fichier_url: string
          filiere_ids?: string[] | null
          id?: string
          titre: string
          type_document?: string | null
          visible_tous?: boolean | null
        }
        Update: {
          annee_ids?: string[] | null
          campus_ids?: string[] | null
          created_at?: string | null
          created_by?: string | null
          eleve_ids?: string[] | null
          fichier_url?: string
          filiere_ids?: string[] | null
          id?: string
          titre?: string
          type_document?: string | null
          visible_tous?: boolean | null
        }
        Relationships: []
      }
      dossiers_scolarite: {
        Row: {
          annee_id: string | null
          annee_scolaire: string | null
          campus_id: string | null
          commentaire: string | null
          created_at: string | null
          eleve_id: string | null
          filiere_id: string | null
          id: string
          impaye_anterieur: number | null
          rythme: string | null
          statut_dossier: string | null
          tarif_scolarite: number
          updated_at: string | null
        }
        Insert: {
          annee_id?: string | null
          annee_scolaire?: string | null
          campus_id?: string | null
          commentaire?: string | null
          created_at?: string | null
          eleve_id?: string | null
          filiere_id?: string | null
          id?: string
          impaye_anterieur?: number | null
          rythme?: string | null
          statut_dossier?: string | null
          tarif_scolarite: number
          updated_at?: string | null
        }
        Update: {
          annee_id?: string | null
          annee_scolaire?: string | null
          campus_id?: string | null
          commentaire?: string | null
          created_at?: string | null
          eleve_id?: string | null
          filiere_id?: string | null
          id?: string
          impaye_anterieur?: number | null
          rythme?: string | null
          statut_dossier?: string | null
          tarif_scolarite?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dossiers_scolarite_annee_id_fkey"
            columns: ["annee_id"]
            isOneToOne: false
            referencedRelation: "annees_scolaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dossiers_scolarite_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dossiers_scolarite_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "eleves"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dossiers_scolarite_filiere_id_fkey"
            columns: ["filiere_id"]
            isOneToOne: false
            referencedRelation: "filieres"
            referencedColumns: ["id"]
          },
        ]
      }
      echeances: {
        Row: {
          commentaire: string | null
          created_at: string | null
          date_echeance: string
          dossier_id: string | null
          id: string
          montant: number
          reglement_id: string | null
          statut: string | null
        }
        Insert: {
          commentaire?: string | null
          created_at?: string | null
          date_echeance: string
          dossier_id?: string | null
          id?: string
          montant: number
          reglement_id?: string | null
          statut?: string | null
        }
        Update: {
          commentaire?: string | null
          created_at?: string | null
          date_echeance?: string
          dossier_id?: string | null
          id?: string
          montant?: number
          reglement_id?: string | null
          statut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "echeances_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers_scolarite"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "echeances_reglement_id_fkey"
            columns: ["reglement_id"]
            isOneToOne: false
            referencedRelation: "reglements"
            referencedColumns: ["id"]
          },
        ]
      }
      eleves: {
        Row: {
          adresse: string | null
          contact_urgence: Json | null
          created_at: string | null
          date_inscription: string | null
          date_naissance: string | null
          email: string
          id: string
          immatriculation: string | null
          ine: string | null
          nom: string
          prenom: string
          source_inscription: string | null
          statut_inscription: string | null
          telephone: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          adresse?: string | null
          contact_urgence?: Json | null
          created_at?: string | null
          date_inscription?: string | null
          date_naissance?: string | null
          email: string
          id?: string
          immatriculation?: string | null
          ine?: string | null
          nom: string
          prenom: string
          source_inscription?: string | null
          statut_inscription?: string | null
          telephone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          adresse?: string | null
          contact_urgence?: Json | null
          created_at?: string | null
          date_inscription?: string | null
          date_naissance?: string | null
          email?: string
          id?: string
          immatriculation?: string | null
          ine?: string | null
          nom?: string
          prenom?: string
          source_inscription?: string | null
          statut_inscription?: string | null
          telephone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      eleves_credentials: {
        Row: {
          created_by: string | null
          date_creation: string | null
          date_dernier_changement: string | null
          eleve_id: string
          id: string
          immatriculation: string
          mot_de_passe_change: boolean | null
          mot_de_passe_initial: string
        }
        Insert: {
          created_by?: string | null
          date_creation?: string | null
          date_dernier_changement?: string | null
          eleve_id: string
          id?: string
          immatriculation: string
          mot_de_passe_change?: boolean | null
          mot_de_passe_initial: string
        }
        Update: {
          created_by?: string | null
          date_creation?: string | null
          date_dernier_changement?: string | null
          eleve_id?: string
          id?: string
          immatriculation?: string
          mot_de_passe_change?: boolean | null
          mot_de_passe_initial?: string
        }
        Relationships: [
          {
            foreignKeyName: "eleves_credentials_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: true
            referencedRelation: "eleves"
            referencedColumns: ["id"]
          },
        ]
      }
      filieres: {
        Row: {
          actif: boolean | null
          code: string | null
          created_at: string | null
          id: string
          nom: string
        }
        Insert: {
          actif?: boolean | null
          code?: string | null
          created_at?: string | null
          id?: string
          nom: string
        }
        Update: {
          actif?: boolean | null
          code?: string | null
          created_at?: string | null
          id?: string
          nom?: string
        }
        Relationships: []
      }
      gestionnaires_campus: {
        Row: {
          campus_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          campus_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          campus_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gestionnaires_campus_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campus"
            referencedColumns: ["id"]
          },
        ]
      }
      imports: {
        Row: {
          created_at: string | null
          created_by: string | null
          fichier_hash: string
          fichier_nom: string
          id: string
          lignes_ignorees: number | null
          lignes_inserees: number | null
          lignes_rejetees: number | null
          lignes_total: number | null
          rapport: Json | null
          statut: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          fichier_hash: string
          fichier_nom: string
          id?: string
          lignes_ignorees?: number | null
          lignes_inserees?: number | null
          lignes_rejetees?: number | null
          lignes_total?: number | null
          rapport?: Json | null
          statut?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          fichier_hash?: string
          fichier_nom?: string
          id?: string
          lignes_ignorees?: number | null
          lignes_inserees?: number | null
          lignes_rejetees?: number | null
          lignes_total?: number | null
          rapport?: Json | null
          statut?: string | null
        }
        Relationships: []
      }
      justificatifs: {
        Row: {
          commentaire_traitement: string | null
          created_at: string | null
          eleve_id: string | null
          fichier_url: string
          id: string
          message: string | null
          statut: string | null
          traite_at: string | null
          traite_by: string | null
          type_justificatif: string | null
        }
        Insert: {
          commentaire_traitement?: string | null
          created_at?: string | null
          eleve_id?: string | null
          fichier_url: string
          id?: string
          message?: string | null
          statut?: string | null
          traite_at?: string | null
          traite_by?: string | null
          type_justificatif?: string | null
        }
        Update: {
          commentaire_traitement?: string | null
          created_at?: string | null
          eleve_id?: string | null
          fichier_url?: string
          id?: string
          message?: string | null
          statut?: string | null
          traite_at?: string | null
          traite_by?: string | null
          type_justificatif?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "justificatifs_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "eleves"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          attempted_at: string | null
          email: string
          id: string
          ip_address: unknown
          success: boolean
          user_agent: string | null
        }
        Insert: {
          attempted_at?: string | null
          email: string
          id?: string
          ip_address?: unknown
          success: boolean
          user_agent?: string | null
        }
        Update: {
          attempted_at?: string | null
          email?: string
          id?: string
          ip_address?: unknown
          success?: boolean
          user_agent?: string | null
        }
        Relationships: []
      }
      messages_ticket: {
        Row: {
          created_at: string | null
          id: string
          message: string
          piece_jointe_url: string | null
          ticket_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          piece_jointe_url?: string | null
          ticket_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          piece_jointe_url?: string | null
          ticket_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_ticket_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      modeles_documents: {
        Row: {
          actif: boolean | null
          contenu_html: string | null
          id: string
          nom: string
          type_modele: string | null
          variables: Json | null
        }
        Insert: {
          actif?: boolean | null
          contenu_html?: string | null
          id?: string
          nom: string
          type_modele?: string | null
          variables?: Json | null
        }
        Update: {
          actif?: boolean | null
          contenu_html?: string | null
          id?: string
          nom?: string
          type_modele?: string | null
          variables?: Json | null
        }
        Relationships: []
      }
      notifications_envoyees: {
        Row: {
          canal: string | null
          contenu: string | null
          erreur_details: string | null
          id: string
          sent_at: string | null
          statut_envoi: string | null
          sujet: string | null
          type_notification: string
          user_id: string | null
        }
        Insert: {
          canal?: string | null
          contenu?: string | null
          erreur_details?: string | null
          id?: string
          sent_at?: string | null
          statut_envoi?: string | null
          sujet?: string | null
          type_notification: string
          user_id?: string | null
        }
        Update: {
          canal?: string | null
          contenu?: string | null
          erreur_details?: string | null
          id?: string
          sent_at?: string | null
          statut_envoi?: string | null
          sujet?: string | null
          type_notification?: string
          user_id?: string | null
        }
        Relationships: []
      }
      parametres_globaux: {
        Row: {
          cle: string
          created_at: string | null
          description: string | null
          id: string
          updated_at: string | null
          valeur: string
        }
        Insert: {
          cle: string
          created_at?: string | null
          description?: string | null
          id?: string
          updated_at?: string | null
          valeur: string
        }
        Update: {
          cle?: string
          created_at?: string | null
          description?: string | null
          id?: string
          updated_at?: string | null
          valeur?: string
        }
        Relationships: []
      }
      parametres_paiement: {
        Row: {
          actif: boolean | null
          created_at: string | null
          delai_jours: number | null
          frais_pourcentage: number | null
          id: string
          moyen_paiement: string
        }
        Insert: {
          actif?: boolean | null
          created_at?: string | null
          delai_jours?: number | null
          frais_pourcentage?: number | null
          id?: string
          moyen_paiement: string
        }
        Update: {
          actif?: boolean | null
          created_at?: string | null
          delai_jours?: number | null
          frais_pourcentage?: number | null
          id?: string
          moyen_paiement?: string
        }
        Relationships: []
      }
      password_history: {
        Row: {
          created_at: string | null
          id: string
          password_hash: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          password_hash: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          password_hash?: string
          user_id?: string
        }
        Relationships: []
      }
      plans_paiement: {
        Row: {
          actif: boolean | null
          annee_scolaire: string
          campus_id: string | null
          created_at: string | null
          date_premiere_echeance: string | null
          description: string | null
          filiere_id: string | null
          frequence: string
          id: string
          jour_echeance: number | null
          moyen_paiement: string
          moyens_solde: string[] | null
          moyens_totalite: string[] | null
          nom: string
          nombre_echeances: number
          tarif_base: number
          updated_at: string | null
        }
        Insert: {
          actif?: boolean | null
          annee_scolaire?: string
          campus_id?: string | null
          created_at?: string | null
          date_premiere_echeance?: string | null
          description?: string | null
          filiere_id?: string | null
          frequence?: string
          id?: string
          jour_echeance?: number | null
          moyen_paiement: string
          moyens_solde?: string[] | null
          moyens_totalite?: string[] | null
          nom: string
          nombre_echeances?: number
          tarif_base: number
          updated_at?: string | null
        }
        Update: {
          actif?: boolean | null
          annee_scolaire?: string
          campus_id?: string | null
          created_at?: string | null
          date_premiere_echeance?: string | null
          description?: string | null
          filiere_id?: string | null
          frequence?: string
          id?: string
          jour_echeance?: number | null
          moyen_paiement?: string
          moyens_solde?: string[] | null
          moyens_totalite?: string[] | null
          nom?: string
          nombre_echeances?: number
          tarif_base?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plans_paiement_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_paiement_filiere_id_fkey"
            columns: ["filiere_id"]
            isOneToOne: false
            referencedRelation: "filieres"
            referencedColumns: ["id"]
          },
        ]
      }
      preferences_notifications: {
        Row: {
          alerte_retard: boolean | null
          confirmation_reglement: boolean | null
          email_actif: boolean | null
          id: string
          nouveau_document: boolean | null
          rappel_avant_echeance: boolean | null
          rappel_jours: number | null
          sms_actif: boolean | null
          user_id: string | null
          whatsapp_actif: boolean | null
        }
        Insert: {
          alerte_retard?: boolean | null
          confirmation_reglement?: boolean | null
          email_actif?: boolean | null
          id?: string
          nouveau_document?: boolean | null
          rappel_avant_echeance?: boolean | null
          rappel_jours?: number | null
          sms_actif?: boolean | null
          user_id?: string | null
          whatsapp_actif?: boolean | null
        }
        Update: {
          alerte_retard?: boolean | null
          confirmation_reglement?: boolean | null
          email_actif?: boolean | null
          id?: string
          nouveau_document?: boolean | null
          rappel_avant_echeance?: boolean | null
          rappel_jours?: number | null
          sms_actif?: boolean | null
          user_id?: string | null
          whatsapp_actif?: boolean | null
        }
        Relationships: []
      }
      previsions_tresorerie: {
        Row: {
          categorie: string
          created_at: string | null
          date_prevision: string
          description: string | null
          id: string
          montant_prevu: number
          montant_realise: number | null
          statut: string | null
          type_flux: string
          updated_at: string | null
        }
        Insert: {
          categorie: string
          created_at?: string | null
          date_prevision: string
          description?: string | null
          id?: string
          montant_prevu?: number
          montant_realise?: number | null
          statut?: string | null
          type_flux: string
          updated_at?: string | null
        }
        Update: {
          categorie?: string
          created_at?: string | null
          date_prevision?: string
          description?: string | null
          id?: string
          montant_prevu?: number
          montant_realise?: number | null
          statut?: string | null
          type_flux?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          id: string
          nom: string | null
          prenom: string | null
          role: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          nom?: string | null
          prenom?: string | null
          role?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          nom?: string | null
          prenom?: string | null
          role?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      recus: {
        Row: {
          created_at: string | null
          fichier_url: string | null
          hash_verification: string | null
          id: string
          numero_recu: string
          reglement_id: string | null
          statut: string
        }
        Insert: {
          created_at?: string | null
          fichier_url?: string | null
          hash_verification?: string | null
          id?: string
          numero_recu: string
          reglement_id?: string | null
          statut?: string
        }
        Update: {
          created_at?: string | null
          fichier_url?: string | null
          hash_verification?: string | null
          id?: string
          numero_recu?: string
          reglement_id?: string | null
          statut?: string
        }
        Relationships: [
          {
            foreignKeyName: "recus_reglement_id_fkey"
            columns: ["reglement_id"]
            isOneToOne: false
            referencedRelation: "reglements"
            referencedColumns: ["id"]
          },
        ]
      }
      reglements: {
        Row: {
          commentaire: string | null
          created_at: string | null
          created_by: string | null
          date_reglement: string
          dossier_id: string | null
          id: string
          montant: number
          moyen_paiement: string
          numero_piece: string | null
          statut: string | null
          type_operation: string
        }
        Insert: {
          commentaire?: string | null
          created_at?: string | null
          created_by?: string | null
          date_reglement: string
          dossier_id?: string | null
          id?: string
          montant: number
          moyen_paiement: string
          numero_piece?: string | null
          statut?: string | null
          type_operation?: string
        }
        Update: {
          commentaire?: string | null
          created_at?: string | null
          created_by?: string | null
          date_reglement?: string
          dossier_id?: string | null
          id?: string
          montant?: number
          moyen_paiement?: string
          numero_piece?: string | null
          statut?: string | null
          type_operation?: string
        }
        Relationships: [
          {
            foreignKeyName: "reglements_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers_scolarite"
            referencedColumns: ["id"]
          },
        ]
      }
      relances: {
        Row: {
          canal: string | null
          created_at: string | null
          created_by: string | null
          date_envoi: string | null
          date_prochaine_relance: string | null
          dossier_id: string
          id: string
          message: string | null
          montant_du: number
          niveau_relance: number
          reponse: string | null
          statut: string | null
          type_relance: string
          updated_at: string | null
        }
        Insert: {
          canal?: string | null
          created_at?: string | null
          created_by?: string | null
          date_envoi?: string | null
          date_prochaine_relance?: string | null
          dossier_id: string
          id?: string
          message?: string | null
          montant_du: number
          niveau_relance?: number
          reponse?: string | null
          statut?: string | null
          type_relance: string
          updated_at?: string | null
        }
        Update: {
          canal?: string | null
          created_at?: string | null
          created_by?: string | null
          date_envoi?: string | null
          date_prochaine_relance?: string | null
          dossier_id?: string
          id?: string
          message?: string | null
          montant_du?: number
          niveau_relance?: number
          reponse?: string | null
          statut?: string | null
          type_relance?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "relances_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers_scolarite"
            referencedColumns: ["id"]
          },
        ]
      }
      risques_financiers: {
        Row: {
          created_at: string | null
          date_evaluation: string | null
          dossier_id: string
          facteurs_risque: Json | null
          id: string
          niveau_risque: string
          recommandations: string | null
          score_risque: number
        }
        Insert: {
          created_at?: string | null
          date_evaluation?: string | null
          dossier_id: string
          facteurs_risque?: Json | null
          id?: string
          niveau_risque: string
          recommandations?: string | null
          score_risque: number
        }
        Update: {
          created_at?: string | null
          date_evaluation?: string | null
          dossier_id?: string
          facteurs_risque?: Json | null
          id?: string
          niveau_risque?: string
          recommandations?: string | null
          score_risque?: number
        }
        Relationships: [
          {
            foreignKeyName: "risques_financiers_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers_scolarite"
            referencedColumns: ["id"]
          },
        ]
      }
      taches_planifiees: {
        Row: {
          actif: boolean
          created_at: string
          created_by: string | null
          derniere_execution: string | null
          description: string | null
          heure_execution: string
          id: string
          jours_semaine: number[] | null
          nom: string
          prochaine_execution: string | null
          type_tache: string
          updated_at: string
        }
        Insert: {
          actif?: boolean
          created_at?: string
          created_by?: string | null
          derniere_execution?: string | null
          description?: string | null
          heure_execution: string
          id?: string
          jours_semaine?: number[] | null
          nom: string
          prochaine_execution?: string | null
          type_tache: string
          updated_at?: string
        }
        Update: {
          actif?: boolean
          created_at?: string
          created_by?: string | null
          derniere_execution?: string | null
          description?: string | null
          heure_execution?: string
          id?: string
          jours_semaine?: number[] | null
          nom?: string
          prochaine_execution?: string | null
          type_tache?: string
          updated_at?: string
        }
        Relationships: []
      }
      telechargements: {
        Row: {
          document_id: string | null
          downloaded_at: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          document_id?: string | null
          downloaded_at?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          document_id?: string | null
          downloaded_at?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "telechargements_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents_pedagogiques"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          assigne_a: string | null
          campus_id: string | null
          created_at: string | null
          date_escalade: string | null
          eleve_id: string | null
          id: string
          niveau_escalade: number | null
          priorite: string | null
          resolu_at: string | null
          resolu_by: string | null
          statut: string | null
          sujet: string
          updated_at: string | null
        }
        Insert: {
          assigne_a?: string | null
          campus_id?: string | null
          created_at?: string | null
          date_escalade?: string | null
          eleve_id?: string | null
          id?: string
          niveau_escalade?: number | null
          priorite?: string | null
          resolu_at?: string | null
          resolu_by?: string | null
          statut?: string | null
          sujet: string
          updated_at?: string | null
        }
        Update: {
          assigne_a?: string | null
          campus_id?: string | null
          created_at?: string | null
          date_escalade?: string | null
          eleve_id?: string | null
          id?: string
          niveau_escalade?: number | null
          priorite?: string | null
          resolu_at?: string | null
          resolu_by?: string | null
          statut?: string | null
          sujet?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "eleves"
            referencedColumns: ["id"]
          },
        ]
      }
      typeform_configs: {
        Row: {
          actif: boolean | null
          annee_scolaire: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          field_mappings: Json
          form_name: string
          form_type: string
          id: string
          statut_dossier: string | null
          tarif_scolarite: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          actif?: boolean | null
          annee_scolaire?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          field_mappings?: Json
          form_name: string
          form_type: string
          id?: string
          statut_dossier?: string | null
          tarif_scolarite?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          actif?: boolean | null
          annee_scolaire?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          field_mappings?: Json
          form_name?: string
          form_type?: string
          id?: string
          statut_dossier?: string | null
          tarif_scolarite?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      user_password_status: {
        Row: {
          created_at: string | null
          id: string
          must_change_password: boolean | null
          password_changed_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          must_change_password?: boolean | null
          password_changed_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          must_change_password?: boolean | null
          password_changed_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculer_prochaine_execution: {
        Args: { p_heure_execution: string; p_jours_semaine: number[] }
        Returns: string
      }
      calculer_score_risque: {
        Args: { p_dossier_id: string }
        Returns: {
          facteurs: Json
          niveau: string
          score: number
        }[]
      }
      calculer_solde_dossier: {
        Args: { dossier_uuid: string }
        Returns: {
          dernier_reglement: string
          difference: number
          nb_reglements: number
          reste_a_payer: number
          statut: string
          total_verse: number
        }[]
      }
      calculer_stats_echeances: {
        Args: never
        Returns: {
          a_venir: number
          en_retard: number
          montant_a_venir: number
          payees: number
          total_count: number
        }[]
      }
      calculer_stats_reglements: {
        Args: { filtre_moyen?: string }
        Returns: {
          montant_moyen: number
          nombre_reglements: number
          par_moyen: Json
          total_montant: number
        }[]
      }
      check_login_rate_limit: {
        Args: { p_email: string; p_ip_address: unknown }
        Returns: boolean
      }
      cleanup_old_audit_logs: { Args: never; Returns: number }
      detecter_anomalies_dossier: {
        Args: { dossier_uuid: string }
        Returns: number
      }
      detecter_doublons_eleves: { Args: never; Returns: number }
      generer_echeances_dossier: {
        Args: {
          date_debut: string
          dossier_uuid: string
          jour_echeance?: number
          nb_echeances: number
        }
        Returns: number
      }
      generer_immatriculation: { Args: never; Returns: string }
      generer_previsions_tresorerie: {
        Args: { p_date_debut: string; p_date_fin: string }
        Returns: number
      }
      get_annee_suivante: {
        Args: { annee_actuelle_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      marquer_echeances_retard: { Args: never; Returns: number }
      stats_dashboard: {
        Args: never
        Returns: {
          nb_anomalies_ouvertes: number
          nb_echeances_retard: number
          nb_eleves: number
          nb_reglements: number
          taux_couverture: number
          total_encaissements: number
        }[]
      }
      stats_statuts_eleves: {
        Args: { p_annee_scolaire: string; p_ref_date: string }
        Returns: {
          name: string
          value: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "finance" | "pedagogie" | "eleve" | "gestionnaire"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "finance", "pedagogie", "eleve", "gestionnaire"],
    },
  },
} as const
