-- Fonction pour calculer les statistiques des échéances de manière optimisée
CREATE OR REPLACE FUNCTION public.calculer_stats_echeances()
RETURNS TABLE(
  total_count INTEGER,
  a_venir INTEGER,
  en_retard INTEGER,
  payees INTEGER,
  montant_a_venir NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_count,
    COUNT(*) FILTER (WHERE statut = 'a_venir')::INTEGER as a_venir,
    COUNT(*) FILTER (WHERE statut = 'en_retard')::INTEGER as en_retard,
    COUNT(*) FILTER (WHERE statut = 'payee')::INTEGER as payees,
    COALESCE(SUM(montant) FILTER (WHERE statut = 'a_venir'), 0) as montant_a_venir
  FROM echeances;
END;
$function$;