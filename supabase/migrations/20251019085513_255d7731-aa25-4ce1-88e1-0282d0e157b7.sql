-- Fonction pour calculer les statistiques des règlements de manière optimisée
CREATE OR REPLACE FUNCTION public.calculer_stats_reglements(filtre_moyen TEXT DEFAULT 'all')
RETURNS TABLE(
  total_montant NUMERIC,
  nombre_reglements INTEGER,
  montant_moyen NUMERIC,
  par_moyen JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_stats RECORD;
  v_par_moyen JSONB;
BEGIN
  -- Calcul des statistiques globales avec une seule requête
  IF filtre_moyen = 'all' THEN
    SELECT 
      COALESCE(SUM(montant), 0) as total,
      COUNT(*)::INTEGER as count,
      CASE WHEN COUNT(*) > 0 THEN COALESCE(SUM(montant) / COUNT(*), 0) ELSE 0 END as moyenne
    INTO v_stats
    FROM reglements
    WHERE statut = 'valide';
    
    -- Calculer la répartition par moyen de paiement
    SELECT jsonb_object_agg(moyen_paiement, total_moyen)
    INTO v_par_moyen
    FROM (
      SELECT 
        moyen_paiement,
        SUM(montant) as total_moyen
      FROM reglements
      WHERE statut = 'valide'
      GROUP BY moyen_paiement
    ) subq;
  ELSE
    SELECT 
      COALESCE(SUM(montant), 0) as total,
      COUNT(*)::INTEGER as count,
      CASE WHEN COUNT(*) > 0 THEN COALESCE(SUM(montant) / COUNT(*), 0) ELSE 0 END as moyenne
    INTO v_stats
    FROM reglements
    WHERE statut = 'valide' AND moyen_paiement = filtre_moyen;
    
    -- Pour un filtre spécifique, retourner juste ce moyen
    v_par_moyen := jsonb_build_object(filtre_moyen, v_stats.total);
  END IF;

  RETURN QUERY SELECT 
    v_stats.total,
    v_stats.count,
    v_stats.moyenne,
    COALESCE(v_par_moyen, '{}'::jsonb);
END;
$function$;