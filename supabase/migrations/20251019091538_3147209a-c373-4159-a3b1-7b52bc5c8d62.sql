-- Phase 2: Intelligence Financière
-- Tables pour les prévisions et le risque financier

-- Table previsions_tresorerie pour les projections financières
CREATE TABLE IF NOT EXISTS public.previsions_tresorerie (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date_prevision DATE NOT NULL,
  type_flux TEXT NOT NULL CHECK (type_flux IN ('entree', 'sortie')),
  montant_prevu NUMERIC NOT NULL DEFAULT 0,
  montant_realise NUMERIC DEFAULT 0,
  categorie TEXT NOT NULL,
  description TEXT,
  statut TEXT DEFAULT 'prevu' CHECK (statut IN ('prevu', 'realise', 'depasse')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table risques_financiers pour le scoring
CREATE TABLE IF NOT EXISTS public.risques_financiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID NOT NULL REFERENCES public.dossiers_scolarite(id) ON DELETE CASCADE,
  score_risque INTEGER NOT NULL CHECK (score_risque BETWEEN 0 AND 100),
  niveau_risque TEXT NOT NULL CHECK (niveau_risque IN ('faible', 'moyen', 'eleve', 'critique')),
  facteurs_risque JSONB DEFAULT '[]'::jsonb,
  recommandations TEXT,
  date_evaluation TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(dossier_id, date_evaluation)
);

-- Table relances pour gérer les relances de paiement
CREATE TABLE IF NOT EXISTS public.relances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID NOT NULL REFERENCES public.dossiers_scolarite(id) ON DELETE CASCADE,
  type_relance TEXT NOT NULL CHECK (type_relance IN ('automatique', 'manuelle')),
  niveau_relance INTEGER NOT NULL DEFAULT 1 CHECK (niveau_relance BETWEEN 1 AND 3),
  montant_du NUMERIC NOT NULL,
  date_envoi TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  date_prochaine_relance TIMESTAMP WITH TIME ZONE,
  canal TEXT DEFAULT 'email' CHECK (canal IN ('email', 'sms', 'courrier')),
  statut TEXT DEFAULT 'envoyee' CHECK (statut IN ('planifiee', 'envoyee', 'repondue', 'ignoree')),
  message TEXT,
  reponse TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activer RLS
ALTER TABLE public.previsions_tresorerie ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risques_financiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relances ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view previsions"
ON public.previsions_tresorerie
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage previsions"
ON public.previsions_tresorerie
FOR ALL
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view risques"
ON public.risques_financiers
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage risques"
ON public.risques_financiers
FOR ALL
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view relances"
ON public.relances
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage relances"
ON public.relances
FOR ALL
USING (auth.uid() IS NOT NULL);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_previsions_date ON public.previsions_tresorerie(date_prevision);
CREATE INDEX IF NOT EXISTS idx_previsions_statut ON public.previsions_tresorerie(statut);
CREATE INDEX IF NOT EXISTS idx_risques_dossier ON public.risques_financiers(dossier_id);
CREATE INDEX IF NOT EXISTS idx_risques_niveau ON public.risques_financiers(niveau_risque);
CREATE INDEX IF NOT EXISTS idx_relances_dossier ON public.relances(dossier_id);
CREATE INDEX IF NOT EXISTS idx_relances_statut ON public.relances(statut);

-- Fonction pour calculer le score de risque d'un dossier
CREATE OR REPLACE FUNCTION public.calculer_score_risque(p_dossier_id UUID)
RETURNS TABLE(
  score INTEGER,
  niveau TEXT,
  facteurs JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_score INTEGER := 0;
  v_niveau TEXT;
  v_facteurs JSONB := '[]'::jsonb;
  v_tarif NUMERIC;
  v_total_verse NUMERIC;
  v_taux_couverture NUMERIC;
  v_nb_retards INTEGER;
  v_nb_relances INTEGER;
  v_jours_depuis_derniere_echeance INTEGER;
BEGIN
  -- Récupérer les données du dossier
  SELECT 
    d.tarif_scolarite,
    COALESCE(SUM(r.montant), 0),
    COUNT(DISTINCT e.id) FILTER (WHERE e.statut = 'en_retard'),
    COUNT(DISTINCT rel.id)
  INTO v_tarif, v_total_verse, v_nb_retards, v_nb_relances
  FROM dossiers_scolarite d
  LEFT JOIN reglements r ON r.dossier_id = d.id AND r.statut = 'valide'
  LEFT JOIN echeances e ON e.dossier_id = d.id
  LEFT JOIN relances rel ON rel.dossier_id = d.id
  WHERE d.id = p_dossier_id
  GROUP BY d.id, d.tarif_scolarite;

  IF v_tarif IS NULL THEN
    RETURN;
  END IF;

  -- Calcul du taux de couverture
  v_taux_couverture := (v_total_verse / NULLIF(v_tarif, 0)) * 100;

  -- Facteur 1: Taux de couverture (40 points max)
  IF v_taux_couverture < 25 THEN
    v_score := v_score + 40;
    v_facteurs := v_facteurs || jsonb_build_object('facteur', 'Très faible taux de paiement (<25%)', 'points', 40);
  ELSIF v_taux_couverture < 50 THEN
    v_score := v_score + 30;
    v_facteurs := v_facteurs || jsonb_build_object('facteur', 'Faible taux de paiement (<50%)', 'points', 30);
  ELSIF v_taux_couverture < 75 THEN
    v_score := v_score + 15;
    v_facteurs := v_facteurs || jsonb_build_object('facteur', 'Taux de paiement moyen (<75%)', 'points', 15);
  END IF;

  -- Facteur 2: Échéances en retard (30 points max)
  IF v_nb_retards >= 3 THEN
    v_score := v_score + 30;
    v_facteurs := v_facteurs || jsonb_build_object('facteur', 'Plusieurs échéances en retard (≥3)', 'points', 30);
  ELSIF v_nb_retards = 2 THEN
    v_score := v_score + 20;
    v_facteurs := v_facteurs || jsonb_build_object('facteur', '2 échéances en retard', 'points', 20);
  ELSIF v_nb_retards = 1 THEN
    v_score := v_score + 10;
    v_facteurs := v_facteurs || jsonb_build_object('facteur', '1 échéance en retard', 'points', 10);
  END IF;

  -- Facteur 3: Nombre de relances (20 points max)
  IF v_nb_relances >= 3 THEN
    v_score := v_score + 20;
    v_facteurs := v_facteurs || jsonb_build_object('facteur', 'Plusieurs relances ignorées (≥3)', 'points', 20);
  ELSIF v_nb_relances = 2 THEN
    v_score := v_score + 10;
    v_facteurs := v_facteurs || jsonb_build_object('facteur', '2 relances effectuées', 'points', 10);
  END IF;

  -- Facteur 4: Ancienneté du dernier paiement (10 points max)
  SELECT DATE_PART('day', NOW() - MAX(e.date_echeance))
  INTO v_jours_depuis_derniere_echeance
  FROM echeances e
  WHERE e.dossier_id = p_dossier_id AND e.statut = 'en_retard';

  IF v_jours_depuis_derniere_echeance > 60 THEN
    v_score := v_score + 10;
    v_facteurs := v_facteurs || jsonb_build_object('facteur', 'Retard > 60 jours', 'points', 10);
  ELSIF v_jours_depuis_derniere_echeance > 30 THEN
    v_score := v_score + 5;
    v_facteurs := v_facteurs || jsonb_build_object('facteur', 'Retard > 30 jours', 'points', 5);
  END IF;

  -- Déterminer le niveau de risque
  IF v_score >= 70 THEN
    v_niveau := 'critique';
  ELSIF v_score >= 50 THEN
    v_niveau := 'eleve';
  ELSIF v_score >= 30 THEN
    v_niveau := 'moyen';
  ELSE
    v_niveau := 'faible';
  END IF;

  RETURN QUERY SELECT v_score, v_niveau, v_facteurs;
END;
$$;

-- Fonction pour générer les prévisions de trésorerie
CREATE OR REPLACE FUNCTION public.generer_previsions_tresorerie(
  p_date_debut DATE,
  p_date_fin DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
  v_echeance RECORD;
BEGIN
  -- Supprimer les anciennes prévisions pour la période
  DELETE FROM previsions_tresorerie
  WHERE date_prevision BETWEEN p_date_debut AND p_date_fin;

  -- Créer les prévisions basées sur les échéances à venir
  FOR v_echeance IN
    SELECT 
      e.date_echeance,
      SUM(e.montant) as total_montant,
      COUNT(*) as nb_echeances
    FROM echeances e
    WHERE e.statut = 'a_venir'
      AND e.date_echeance BETWEEN p_date_debut AND p_date_fin
    GROUP BY e.date_echeance
  LOOP
    INSERT INTO previsions_tresorerie (
      date_prevision,
      type_flux,
      montant_prevu,
      categorie,
      description,
      statut
    ) VALUES (
      v_echeance.date_echeance,
      'entree',
      v_echeance.total_montant,
      'echeances',
      v_echeance.nb_echeances || ' échéance(s) prévue(s)',
      'prevu'
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_previsions_updated_at
BEFORE UPDATE ON public.previsions_tresorerie
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_relances_updated_at
BEFORE UPDATE ON public.relances
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();