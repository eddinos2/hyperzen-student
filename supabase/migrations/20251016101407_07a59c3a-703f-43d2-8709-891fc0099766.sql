-- Fix stats_dashboard function to count ALL payments correctly
CREATE OR REPLACE FUNCTION stats_dashboard()
RETURNS TABLE(
  nb_eleves INTEGER,
  total_encaissements NUMERIC,
  nb_anomalies_ouvertes INTEGER,
  nb_reglements INTEGER,
  nb_echeances_retard INTEGER,
  taux_couverture NUMERIC
)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
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
$$;