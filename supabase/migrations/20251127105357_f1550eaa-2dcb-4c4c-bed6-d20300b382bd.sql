-- Phase 3: Enrichir la table eleves avec nouveaux champs
ALTER TABLE public.eleves 
ADD COLUMN IF NOT EXISTS date_inscription DATE,
ADD COLUMN IF NOT EXISTS date_naissance DATE,
ADD COLUMN IF NOT EXISTS ine TEXT,
ADD COLUMN IF NOT EXISTS contact_urgence JSONB DEFAULT '{"nom": "", "telephone": "", "relation": ""}'::jsonb,
ADD COLUMN IF NOT EXISTS source_inscription TEXT DEFAULT 'manuel';

COMMENT ON COLUMN public.eleves.date_inscription IS 'Date d''inscription de l''élève';
COMMENT ON COLUMN public.eleves.date_naissance IS 'Date de naissance de l''élève';
COMMENT ON COLUMN public.eleves.ine IS 'Identifiant National Élève';
COMMENT ON COLUMN public.eleves.contact_urgence IS 'Contact d''urgence (nom, téléphone, relation)';
COMMENT ON COLUMN public.eleves.source_inscription IS 'Source de l''inscription (typeform, jotform, manuel, import)';

-- Phase 2: Créer la table plans_paiement pour les tarifs prédéfinis
CREATE TABLE IF NOT EXISTS public.plans_paiement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  description TEXT,
  filiere_id UUID REFERENCES public.filieres(id) ON DELETE CASCADE,
  campus_id UUID REFERENCES public.campus(id) ON DELETE CASCADE,
  annee_scolaire TEXT NOT NULL DEFAULT '2025_2026',
  tarif_base NUMERIC NOT NULL,
  moyen_paiement TEXT NOT NULL,
  nombre_echeances INTEGER NOT NULL DEFAULT 1,
  frequence TEXT NOT NULL DEFAULT 'mensuel',
  jour_echeance INTEGER DEFAULT 5,
  date_premiere_echeance DATE,
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT plans_paiement_moyen_check CHECK (moyen_paiement IN ('Espèces', 'Carte bancaire', 'Virement', 'Chèque', 'Prélèvement', 'Mobile Money'))
);

COMMENT ON TABLE public.plans_paiement IS 'Plans de paiement prédéfinis par filière/campus/moyen';
COMMENT ON COLUMN public.plans_paiement.frequence IS 'Fréquence des échéances (mensuel, trimestriel, semestriel)';

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_plans_paiement_filiere ON public.plans_paiement(filiere_id);
CREATE INDEX IF NOT EXISTS idx_plans_paiement_campus ON public.plans_paiement(campus_id);
CREATE INDEX IF NOT EXISTS idx_plans_paiement_actif ON public.plans_paiement(actif) WHERE actif = true;

-- RLS pour plans_paiement
ALTER TABLE public.plans_paiement ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view plans_paiement"
ON public.plans_paiement FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage plans_paiement"
ON public.plans_paiement FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger pour updated_at
CREATE TRIGGER update_plans_paiement_updated_at
BEFORE UPDATE ON public.plans_paiement
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Phase 4: Améliorer la table tickets pour le triple processus
ALTER TABLE public.tickets
ADD COLUMN IF NOT EXISTS assigne_a UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS campus_id UUID REFERENCES public.campus(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS niveau_escalade INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS date_escalade TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS resolu_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS resolu_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.tickets.assigne_a IS 'Utilisateur assigné au ticket (responsable campus ou admin)';
COMMENT ON COLUMN public.tickets.campus_id IS 'Campus concerné par le ticket';
COMMENT ON COLUMN public.tickets.niveau_escalade IS 'Niveau d''escalade (1=campus, 2=admin, 3=urgent)';
COMMENT ON COLUMN public.tickets.date_escalade IS 'Date de la dernière escalade';

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_tickets_assigne ON public.tickets(assigne_a);
CREATE INDEX IF NOT EXISTS idx_tickets_campus ON public.tickets(campus_id);
CREATE INDEX IF NOT EXISTS idx_tickets_statut ON public.tickets(statut);

-- Ajout d'un type d'anomalie "etudiant_doublon"
ALTER TABLE public.anomalies
ADD COLUMN IF NOT EXISTS eleve_id UUID REFERENCES public.eleves(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_anomalies_eleve ON public.anomalies(eleve_id);

COMMENT ON COLUMN public.anomalies.eleve_id IS 'Référence directe à un élève pour les anomalies individuelles';

-- Fonction pour détecter les doublons potentiels d'étudiants
CREATE OR REPLACE FUNCTION public.detecter_doublons_eleves()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  -- Détecter les doublons par email
  INSERT INTO public.anomalies (
    eleve_id,
    type_anomalie,
    severite,
    description,
    details,
    action_proposee,
    statut
  )
  SELECT 
    e1.id,
    'etudiant_doublon',
    'alerte',
    'Doublon potentiel détecté : ' || e1.nom || ' ' || e1.prenom || ' (' || e1.email || ')',
    jsonb_build_object(
      'email', e1.email,
      'eleves_similaires', jsonb_agg(
        jsonb_build_object(
          'id', e2.id,
          'nom', e2.nom,
          'prenom', e2.prenom,
          'created_at', e2.created_at
        )
      )
    ),
    'Vérifier et fusionner ou archiver le doublon',
    'ouverte'
  FROM public.eleves e1
  INNER JOIN public.eleves e2 ON e1.email = e2.email AND e1.id < e2.id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.anomalies a
    WHERE a.eleve_id = e1.id 
    AND a.type_anomalie = 'etudiant_doublon'
    AND a.statut = 'ouverte'
  )
  GROUP BY e1.id, e1.nom, e1.prenom, e1.email;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;