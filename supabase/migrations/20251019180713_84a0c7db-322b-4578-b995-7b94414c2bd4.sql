-- Ajouter une colonne par_defaut à la table annees_scolaires
ALTER TABLE public.annees_scolaires 
ADD COLUMN IF NOT EXISTS par_defaut boolean DEFAULT false;

-- Définir l'année 2025-2026 comme année par défaut
UPDATE public.annees_scolaires 
SET par_defaut = true 
WHERE libelle = '2025-2026';

-- S'assurer qu'une seule année est définie comme par défaut
CREATE OR REPLACE FUNCTION public.ensure_single_default_year()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.par_defaut = true THEN
    -- Désactiver toutes les autres années par défaut
    UPDATE public.annees_scolaires 
    SET par_defaut = false 
    WHERE id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- Créer un trigger pour maintenir l'unicité
DROP TRIGGER IF EXISTS trigger_ensure_single_default_year ON public.annees_scolaires;
CREATE TRIGGER trigger_ensure_single_default_year
  BEFORE INSERT OR UPDATE ON public.annees_scolaires
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_single_default_year();