-- Fix function search paths for security
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculer_solde_dossier(dossier_uuid uuid)
RETURNS TABLE(total_verse numeric, reste_a_payer numeric, difference numeric, nb_reglements integer, dernier_reglement date, statut text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
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

  SELECT 
    COALESCE(SUM(r.montant), 0),
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

CREATE OR REPLACE FUNCTION public.generer_echeances_dossier(dossier_uuid uuid, nb_echeances integer, date_debut date, jour_echeance integer DEFAULT 14)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_tarif NUMERIC;
  v_acompte NUMERIC;
  v_montant_echeance NUMERIC;
  v_date_courante DATE;
  v_count INTEGER := 0;
BEGIN
  SELECT 
    d.tarif_scolarite,
    COALESCE((SELECT SUM(r.montant) FROM reglements r WHERE r.dossier_id = dossier_uuid AND r.statut = 'valide'), 0)
  INTO v_tarif, v_acompte
  FROM dossiers_scolarite d
  WHERE d.id = dossier_uuid;

  v_montant_echeance := ROUND((v_tarif - v_acompte) / nb_echeances, 2);

  FOR i IN 1..nb_echeances LOOP
    v_date_courante := date_debut + (i - 1) * INTERVAL '1 month';
    v_date_courante := DATE_TRUNC('month', v_date_courante) + (jour_echeance - 1) * INTERVAL '1 day';

    INSERT INTO echeances (dossier_id, montant, date_echeance, statut)
    VALUES (dossier_uuid, v_montant_echeance, v_date_courante, 'a_venir');
    
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.marquer_echeances_retard()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE echeances
  SET statut = 'en_retard'
  WHERE statut = 'a_venir'
    AND date_echeance < CURRENT_DATE;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.detecter_anomalies_dossier(dossier_uuid uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_tarif NUMERIC;
  v_total_verse NUMERIC;
  v_difference NUMERIC;
  v_eleve_nom TEXT;
  v_eleve_prenom TEXT;
  v_count INTEGER := 0;
BEGIN
  SELECT 
    d.tarif_scolarite,
    e.nom,
    e.prenom,
    COALESCE(SUM(r.montant), 0)
  INTO v_tarif, v_eleve_nom, v_eleve_prenom, v_total_verse
  FROM dossiers_scolarite d
  JOIN eleves e ON e.id = d.eleve_id
  LEFT JOIN reglements r ON r.dossier_id = d.id AND r.statut = 'valide'
  WHERE d.id = dossier_uuid
  GROUP BY d.id, d.tarif_scolarite, e.nom, e.prenom;

  v_difference := v_tarif - v_total_verse;

  IF v_difference < -10 THEN
    INSERT INTO anomalies (
      dossier_id, 
      type_anomalie, 
      severite, 
      description, 
      details,
      action_proposee
    )
    VALUES (
      dossier_uuid,
      'eleve_crediteur',
      'alerte',
      v_eleve_nom || ' ' || v_eleve_prenom || ' a versé plus que son tarif',
      jsonb_build_object('tarif', v_tarif, 'verse', v_total_verse, 'difference', v_difference),
      'Vérifier les paiements et potentiellement rembourser le trop-perçu'
    )
    ON CONFLICT DO NOTHING;
    v_count := v_count + 1;
  ELSIF v_difference > v_tarif * 0.8 THEN
    INSERT INTO anomalies (
      dossier_id,
      type_anomalie,
      severite,
      description,
      details,
      action_proposee
    )
    VALUES (
      dossier_uuid,
      'solde_important',
      'info',
      v_eleve_nom || ' ' || v_eleve_prenom || ' a un solde important à régler',
      jsonb_build_object('tarif', v_tarif, 'verse', v_total_verse, 'reste', v_difference),
      'Envoyer une relance de paiement'
    )
    ON CONFLICT DO NOTHING;
    v_count := v_count + 1;
  END IF;

  RETURN v_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.stats_dashboard()
RETURNS TABLE(nb_eleves integer, total_encaissements numeric, nb_anomalies_ouvertes integer, nb_reglements integer, nb_echeances_retard integer, taux_couverture numeric)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*)::INTEGER FROM eleves),
    (SELECT COALESCE(SUM(montant), 0) FROM reglements WHERE statut = 'valide'),
    (SELECT COUNT(*)::INTEGER FROM anomalies WHERE statut = 'ouverte'),
    (SELECT COUNT(*)::INTEGER FROM reglements WHERE statut = 'valide'),
    (SELECT COUNT(*)::INTEGER FROM echeances WHERE statut = 'en_retard'),
    (
      SELECT CASE 
        WHEN SUM(d.tarif_scolarite) > 0 THEN
          ROUND((SUM(COALESCE(r.total, 0)) / SUM(d.tarif_scolarite)) * 100, 2)
        ELSE 0
      END
      FROM dossiers_scolarite d
      LEFT JOIN (
        SELECT dossier_id, SUM(montant) as total
        FROM reglements
        WHERE statut = 'valide'
        GROUP BY dossier_id
      ) r ON r.dossier_id = d.id
    );
END;
$function$;