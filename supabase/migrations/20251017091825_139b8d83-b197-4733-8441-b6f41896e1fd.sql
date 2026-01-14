-- Ajouter un champ statut à la table recus
ALTER TABLE public.recus 
ADD COLUMN statut TEXT NOT NULL DEFAULT 'valide' CHECK (statut IN ('valide', 'invalide'));

-- Créer un index sur statut pour les performances
CREATE INDEX idx_recus_statut ON public.recus(statut);

-- Créer une fonction pour invalider les reçus quand un règlement n'est plus valide
CREATE OR REPLACE FUNCTION public.invalider_recus_reglement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Si le statut change d'un état valide vers impayé/annulé/refusé
  IF (OLD.statut = 'valide' AND NEW.statut IN ('impaye', 'annule', 'refuse', 'en_attente')) THEN
    -- Invalider tous les reçus associés à ce règlement
    UPDATE public.recus
    SET statut = 'invalide'
    WHERE reglement_id = NEW.id;
    
    RAISE NOTICE 'Reçus invalidés pour le règlement %', NEW.id;
  END IF;
  
  -- Si le statut revient à valide, réactiver les reçus
  IF (OLD.statut IN ('impaye', 'annule', 'refuse', 'en_attente') AND NEW.statut = 'valide') THEN
    UPDATE public.recus
    SET statut = 'valide'
    WHERE reglement_id = NEW.id;
    
    RAISE NOTICE 'Reçus réactivés pour le règlement %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Créer le trigger sur la table reglements
DROP TRIGGER IF EXISTS trigger_invalider_recus ON public.reglements;
CREATE TRIGGER trigger_invalider_recus
  AFTER UPDATE OF statut ON public.reglements
  FOR EACH ROW
  WHEN (OLD.statut IS DISTINCT FROM NEW.statut)
  EXECUTE FUNCTION public.invalider_recus_reglement();

-- Ajouter une valeur 'impaye' aux statuts possibles si elle n'existe pas déjà
COMMENT ON COLUMN public.reglements.statut IS 'Statut du règlement: valide, impaye, annule, refuse, en_attente';