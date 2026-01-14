-- Créer un trigger pour automatiquement marquer les échéances en retard
CREATE OR REPLACE FUNCTION public.auto_update_echeances_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Si la date d'échéance est passée et le statut est "a_venir", passer à "en_retard"
  IF NEW.date_echeance < CURRENT_DATE AND NEW.statut = 'a_venir' THEN
    NEW.statut := 'en_retard';
  END IF;
  
  -- Si la date d'échéance est future et le statut est "en_retard", repasser à "a_venir"
  IF NEW.date_echeance >= CURRENT_DATE AND NEW.statut = 'en_retard' THEN
    NEW.statut := 'a_venir';
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Créer le trigger sur INSERT et UPDATE
DROP TRIGGER IF EXISTS trigger_auto_update_echeances_status ON public.echeances;
CREATE TRIGGER trigger_auto_update_echeances_status
  BEFORE INSERT OR UPDATE OF date_echeance, statut
  ON public.echeances
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_update_echeances_status();

-- Mettre à jour toutes les échéances existantes avec des dates passées
UPDATE public.echeances
SET statut = 'en_retard'
WHERE date_echeance < CURRENT_DATE 
  AND statut = 'a_venir';

-- Nettoyer les dates aberrantes (avant 2020)
UPDATE public.echeances
SET date_echeance = CURRENT_DATE + INTERVAL '30 days'
WHERE date_echeance < '2020-01-01';

-- Améliorer la fonction marquer_echeances_retard pour gérer aussi les retours à "a_venir"
CREATE OR REPLACE FUNCTION public.marquer_echeances_retard()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count INTEGER := 0;
BEGIN
  -- Marquer en retard les échéances passées
  UPDATE echeances
  SET statut = 'en_retard'
  WHERE statut = 'a_venir'
    AND date_echeance < CURRENT_DATE;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  -- Remettre à "a_venir" les échéances futures marquées en retard par erreur
  UPDATE echeances
  SET statut = 'a_venir'
  WHERE statut = 'en_retard'
    AND date_echeance >= CURRENT_DATE;
  
  RETURN v_count;
END;
$function$;