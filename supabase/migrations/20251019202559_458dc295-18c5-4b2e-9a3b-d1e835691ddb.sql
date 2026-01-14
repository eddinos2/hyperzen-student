-- Mettre à jour calculer_stats_reglements pour gérer les remboursements
CREATE OR REPLACE FUNCTION public.calculer_stats_reglements(filtre_moyen text DEFAULT 'all'::text)
RETURNS TABLE(total_montant numeric, nombre_reglements integer, montant_moyen numeric, par_moyen jsonb)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_stats RECORD;
  v_par_moyen JSONB;
BEGIN
  -- Calcul des statistiques globales avec les remboursements (montants négatifs)
  IF filtre_moyen = 'all' THEN
    SELECT 
      COALESCE(SUM(
        CASE 
          WHEN type_operation = 'remboursement' THEN -ABS(montant)
          ELSE montant
        END
      ), 0) as total,
      COUNT(*)::INTEGER as count,
      CASE 
        WHEN COUNT(*) > 0 THEN 
          COALESCE(SUM(
            CASE 
              WHEN type_operation = 'remboursement' THEN -ABS(montant)
              ELSE montant
            END
          ) / COUNT(*), 0) 
        ELSE 0 
      END as moyenne
    INTO v_stats
    FROM reglements
    WHERE statut = 'valide';
    
    -- Calculer la répartition par moyen de paiement
    SELECT jsonb_object_agg(moyen_paiement, total_moyen)
    INTO v_par_moyen
    FROM (
      SELECT 
        moyen_paiement,
        SUM(
          CASE 
            WHEN type_operation = 'remboursement' THEN -ABS(montant)
            ELSE montant
          END
        ) as total_moyen
      FROM reglements
      WHERE statut = 'valide'
      GROUP BY moyen_paiement
    ) subq;
  ELSE
    SELECT 
      COALESCE(SUM(
        CASE 
          WHEN type_operation = 'remboursement' THEN -ABS(montant)
          ELSE montant
        END
      ), 0) as total,
      COUNT(*)::INTEGER as count,
      CASE 
        WHEN COUNT(*) > 0 THEN 
          COALESCE(SUM(
            CASE 
              WHEN type_operation = 'remboursement' THEN -ABS(montant)
              ELSE montant
            END
          ) / COUNT(*), 0)
        ELSE 0 
      END as moyenne
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

-- Mettre à jour stats_dashboard pour gérer les remboursements
CREATE OR REPLACE FUNCTION public.stats_dashboard()
RETURNS TABLE(nb_eleves integer, total_encaissements numeric, nb_anomalies_ouvertes integer, nb_reglements integer, nb_echeances_retard integer, taux_couverture numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*)::INTEGER FROM eleves),
    -- Total encaissé en tenant compte des remboursements
    (SELECT COALESCE(SUM(
      CASE 
        WHEN type_operation = 'remboursement' THEN -ABS(montant)
        ELSE montant
      END
    ), 0) FROM reglements WHERE statut = 'valide'),
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
        SELECT 
          dossier_id, 
          SUM(
            CASE 
              WHEN type_operation = 'remboursement' THEN -ABS(montant)
              ELSE montant
            END
          ) as total
        FROM reglements
        WHERE statut = 'valide'
        GROUP BY dossier_id
      ) r ON r.dossier_id = d.id
    );
END;
$function$;