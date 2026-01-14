CREATE TYPE app_role AS ENUM ('admin', 'finance', 'pedagogie', 'eleve');

CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

CREATE TABLE campus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  code TEXT UNIQUE,
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE filieres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  code TEXT UNIQUE,
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE annees_scolaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  libelle TEXT NOT NULL,
  ordre INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE eleves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  telephone TEXT,
  adresse TEXT,
  statut_inscription TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE dossiers_scolarite (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eleve_id UUID REFERENCES eleves(id) ON DELETE CASCADE,
  campus_id UUID REFERENCES campus(id),
  filiere_id UUID REFERENCES filieres(id),
  annee_id UUID REFERENCES annees_scolaires(id),
  rythme TEXT,
  tarif_scolarite NUMERIC(10,2) NOT NULL,
  impaye_anterieur NUMERIC(10,2) DEFAULT 0,
  commentaire TEXT,
  annee_scolaire TEXT DEFAULT '2025_2026',
  statut_dossier TEXT DEFAULT 'en_cours',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE reglements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID REFERENCES dossiers_scolarite(id) ON DELETE CASCADE,
  montant NUMERIC(10,2) NOT NULL,
  moyen_paiement TEXT NOT NULL,
  date_reglement DATE NOT NULL,
  numero_piece TEXT,
  statut TEXT DEFAULT 'valide',
  commentaire TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE TABLE echeances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID REFERENCES dossiers_scolarite(id) ON DELETE CASCADE,
  montant NUMERIC(10,2) NOT NULL,
  date_echeance DATE NOT NULL,
  statut TEXT DEFAULT 'a_venir',
  reglement_id UUID REFERENCES reglements(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID REFERENCES dossiers_scolarite(id),
  type_anomalie TEXT NOT NULL,
  severite TEXT DEFAULT 'alerte',
  description TEXT NOT NULL,
  details JSONB,
  statut TEXT DEFAULT 'ouverte',
  action_proposee TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fichier_nom TEXT NOT NULL,
  fichier_hash TEXT UNIQUE NOT NULL,
  statut TEXT DEFAULT 'en_cours',
  lignes_total INTEGER,
  lignes_inserees INTEGER DEFAULT 0,
  lignes_ignorees INTEGER DEFAULT 0,
  lignes_rejetees INTEGER DEFAULT 0,
  rapport JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE TABLE recus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reglement_id UUID REFERENCES reglements(id) ON DELETE CASCADE,
  numero_recu TEXT UNIQUE NOT NULL,
  fichier_url TEXT,
  hash_verification TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE documents_pedagogiques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titre TEXT NOT NULL,
  type_document TEXT,
  fichier_url TEXT NOT NULL,
  campus_ids UUID[],
  filiere_ids UUID[],
  annee_ids UUID[],
  eleve_ids UUID[],
  visible_tous BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE TABLE telechargements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents_pedagogiques(id),
  user_id UUID REFERENCES auth.users(id),
  downloaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE justificatifs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eleve_id UUID REFERENCES eleves(id) ON DELETE CASCADE,
  type_justificatif TEXT,
  fichier_url TEXT NOT NULL,
  message TEXT,
  statut TEXT DEFAULT 'en_attente',
  traite_at TIMESTAMPTZ,
  traite_by UUID REFERENCES auth.users(id),
  commentaire_traitement TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eleve_id UUID REFERENCES eleves(id) ON DELETE CASCADE,
  sujet TEXT NOT NULL,
  statut TEXT DEFAULT 'ouvert',
  priorite TEXT DEFAULT 'normale',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE messages_ticket (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  message TEXT NOT NULL,
  piece_jointe_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE preferences_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) UNIQUE,
  email_actif BOOLEAN DEFAULT true,
  sms_actif BOOLEAN DEFAULT false,
  whatsapp_actif BOOLEAN DEFAULT false,
  rappel_avant_echeance BOOLEAN DEFAULT true,
  rappel_jours INTEGER DEFAULT 7,
  confirmation_reglement BOOLEAN DEFAULT true,
  alerte_retard BOOLEAN DEFAULT true,
  nouveau_document BOOLEAN DEFAULT true
);

CREATE TABLE notifications_envoyees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  type_notification TEXT NOT NULL,
  canal TEXT,
  sujet TEXT,
  contenu TEXT,
  statut_envoi TEXT DEFAULT 'envoye',
  erreur_details TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE modeles_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  type_modele TEXT,
  contenu_html TEXT,
  variables JSONB,
  actif BOOLEAN DEFAULT true
);

CREATE INDEX idx_eleves_email ON eleves(email);
CREATE INDEX idx_eleves_nom_prenom ON eleves(nom, prenom);
CREATE INDEX idx_dossiers_eleve ON dossiers_scolarite(eleve_id);
CREATE INDEX idx_reglements_dossier ON reglements(dossier_id);
CREATE INDEX idx_echeances_dossier ON echeances(dossier_id);
CREATE INDEX idx_echeances_date ON echeances(date_echeance);
CREATE INDEX idx_anomalies_dossier ON anomalies(dossier_id);
CREATE INDEX idx_anomalies_statut ON anomalies(statut);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_eleves_updated_at
BEFORE UPDATE ON eleves
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dossiers_updated_at
BEFORE UPDATE ON dossiers_scolarite
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

INSERT INTO campus (nom, code) VALUES 
('Sentier', 'SEN'),
('Picpus', 'PIC'),
('Roquette', 'ROQ');

INSERT INTO annees_scolaires (libelle, ordre) VALUES 
('1A', 1),
('2A', 2);

INSERT INTO filieres (nom, code) VALUES 
('BTS AUDIOVISUEL', 'BTS_AV'),
('PRODENT', 'PRODENT'),
('COM', 'COM'),
('ABM', 'ABM');