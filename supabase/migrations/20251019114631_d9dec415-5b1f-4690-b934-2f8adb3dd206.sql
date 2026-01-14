-- Create optimized backend function for status statistics
CREATE OR REPLACE FUNCTION public.stats_statuts_eleves(p_ref_date date, p_annee_scolaire text)
RETURNS TABLE(name text, value integer)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  y1 int;
  y2 int;
  debut_annee date;
  fin_annee date;
  avancement numeric;
BEGIN
  y1 := split_part(p_annee_scolaire, '_', 1)::int;
  y2 := split_part(p_annee_scolaire, '_', 2)::int;
  debut_annee := make_date(y1, 9, 1);
  fin_annee := make_date(y2, 6, 30);

  IF p_ref_date < debut_annee THEN
    avancement := 0;
  ELSIF p_ref_date > fin_annee THEN
    avancement := 1;
  ELSE
    avancement := (p_ref_date::date - debut_annee)::numeric / NULLIF((fin_annee - debut_annee),0);
  END IF;
  avancement := GREATEST(0, LEAST(1, avancement));

  RETURN QUERY
  WITH dossiers AS (
    SELECT d.id, d.tarif_scolarite, COALESCE(d.impaye_anterieur,0) AS impaye
    FROM dossiers_scolarite d
    WHERE d.annee_scolaire = p_annee_scolaire
      AND d.statut_dossier = 'en_cours'
  ),
  reg AS (
    SELECT r.dossier_id, COALESCE(SUM(r.montant),0) AS total_verse, MAX(r.date_reglement) AS dernier_reglement
    FROM reglements r
    JOIN dossiers d ON d.id = r.dossier_id
    WHERE r.statut='valide'
    GROUP BY r.dossier_id
  ),
  ech_echues AS (
    SELECT e.dossier_id, COALESCE(SUM(e.montant),0) AS du_echu
    FROM echeances e
    JOIN dossiers d ON d.id = e.dossier_id
    WHERE e.date_echeance <= p_ref_date
    GROUP BY e.dossier_id
  ),
  ech_retard AS (
    SELECT e.dossier_id, COUNT(*)::int AS nb_retard
    FROM echeances e
    JOIN dossiers d ON d.id = e.dossier_id
    WHERE e.statut = 'en_retard'
    GROUP BY e.dossier_id
  ),
  per AS (
    SELECT 
      d.id,
      (d.tarif_scolarite + d.impaye) AS total_du,
      COALESCE(reg.total_verse,0) AS total_verse,
      COALESCE(ee.du_echu,0) AS du_echu,
      COALESCE(er.nb_retard,0) AS nb_retard,
      reg.dernier_reglement
    FROM dossiers d
    LEFT JOIN reg ON reg.dossier_id = d.id
    LEFT JOIN ech_echues ee ON ee.dossier_id = d.id
    LEFT JOIN ech_retard er ON er.dossier_id = d.id
  ),
  s AS (
    SELECT CASE
      WHEN total_du <= 0 THEN 'Non renseigné'
      WHEN (total_du - total_verse) < -10 THEN 'Créditeur'
      WHEN abs(total_du - total_verse) < 1 THEN 'À jour'
      WHEN total_verse = 0 AND (du_echu > 0 OR nb_retard > 0 OR avancement > 0.1) THEN 'Impayé total'
      WHEN nb_retard > 0 THEN 'En retard'
      WHEN du_echu > 0 AND (total_verse + 1) < du_echu THEN 'En retard'
      WHEN du_echu = 0 AND total_verse < (total_du * avancement * 0.7) THEN 'En retard'
      ELSE 'En cours'
    END AS name
    FROM per
  )
  SELECT name, COUNT(*)::int AS value
  FROM s
  WHERE name <> 'Non renseigné'
  GROUP BY name;
END;
$$;