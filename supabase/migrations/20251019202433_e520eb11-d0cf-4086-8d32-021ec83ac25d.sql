-- Ajouter le champ type_operation aux règlements
ALTER TABLE public.reglements 
ADD COLUMN IF NOT EXISTS type_operation text NOT NULL DEFAULT 'paiement';

-- Ajouter une contrainte pour les valeurs autorisées
ALTER TABLE public.reglements 
ADD CONSTRAINT check_type_operation 
CHECK (type_operation IN ('paiement', 'remboursement'));

-- Créer un index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_reglements_type_operation 
ON public.reglements(type_operation);

-- Commentaires pour la documentation
COMMENT ON COLUMN public.reglements.type_operation IS 'Type d''opération: paiement (montant positif) ou remboursement (montant négatif pour crédits)';

-- Mettre à jour la fonction de calcul de solde pour gérer les remboursements
CREATE OR REPLACE FUNCTION public.calculer_solde_dossier(dossier_uuid uuid)
RETURNS TABLE(total_verse numeric, reste_a_payer numeric, difference numeric, nb_reglements integer, dernier_reglement date, statut text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tarif NUMERIC;
  v_impaye NUMERIC;
  v_total_verse NUMERIC;
  v_reste NUMERIC;
  v_nb_reglements INTEGER;
  v_dernier_date DATE;
  v_statut TEXT;
BEGIN
  SELECT 
    d.tarif_scolarite,
    d.impaye_anterieur
  INTO v_tarif, v_impaye
  FROM dossiers_scolarite d
  WHERE d.id = dossier_uuid;

  -- Calculer le total versé en tenant compte des remboursements (montants négatifs)
  SELECT 
    COALESCE(SUM(
      CASE 
        WHEN r.type_operation = 'remboursement' THEN -ABS(r.montant)
        ELSE r.montant
      END
    ), 0),
    COUNT(r.id)::INTEGER,
    MAX(r.date_reglement)
  INTO v_total_verse, v_nb_reglements, v_dernier_date
  FROM reglements r
  WHERE r.dossier_id = dossier_uuid 
    AND r.statut = 'valide';

  v_reste := (v_tarif + v_impaye) - v_total_verse;

  IF ABS(v_reste) < 1 THEN
    v_statut := 'a_jour';
  ELSIF v_reste < -10 THEN
    v_statut := 'crediteur';
  ELSIF v_reste > 0 THEN
    v_statut := 'en_cours';
  ELSE
    v_statut := 'en_cours';
  END IF;

  RETURN QUERY SELECT 
    v_total_verse,
    v_reste,
    v_tarif - v_total_verse,
    v_nb_reglements,
    v_dernier_date,
    v_statut;
END;
$function$;