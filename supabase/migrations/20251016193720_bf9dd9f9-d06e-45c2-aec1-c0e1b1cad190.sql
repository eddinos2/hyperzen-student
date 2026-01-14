-- Ajouter la colonne immatriculation à la table eleves
ALTER TABLE public.eleves 
ADD COLUMN IF NOT EXISTS immatriculation TEXT UNIQUE;

-- Créer une fonction pour générer le prochain numéro d'immatriculation
CREATE OR REPLACE FUNCTION public.generer_immatriculation()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_annee TEXT;
  v_dernier_numero INTEGER;
  v_nouveau_numero TEXT;
BEGIN
  -- Récupérer l'année courante
  v_annee := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  
  -- Trouver le dernier numéro utilisé pour cette année
  SELECT MAX(
    CASE 
      WHEN immatriculation ~ ('^' || v_annee || '[0-9]{5}$')
      THEN SUBSTRING(immatriculation FROM 5)::INTEGER
      ELSE 0
    END
  )
  INTO v_dernier_numero
  FROM eleves
  WHERE immatriculation LIKE v_annee || '%';
  
  -- Si aucun numéro n'existe, commencer à 1
  IF v_dernier_numero IS NULL THEN
    v_dernier_numero := 0;
  END IF;
  
  -- Générer le nouveau numéro avec padding de 5 chiffres
  v_nouveau_numero := v_annee || LPAD((v_dernier_numero + 1)::TEXT, 5, '0');
  
  RETURN v_nouveau_numero;
END;
$$;

-- Créer un trigger pour générer automatiquement l'immatriculation si elle est vide
CREATE OR REPLACE FUNCTION public.auto_generer_immatriculation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Si l'immatriculation n'est pas fournie, la générer automatiquement
  IF NEW.immatriculation IS NULL OR NEW.immatriculation = '' THEN
    NEW.immatriculation := public.generer_immatriculation();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Attacher le trigger à la table eleves
DROP TRIGGER IF EXISTS trigger_auto_immatriculation ON public.eleves;
CREATE TRIGGER trigger_auto_immatriculation
  BEFORE INSERT ON public.eleves
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generer_immatriculation();

-- Générer des immatriculations pour les élèves existants qui n'en ont pas
DO $$
DECLARE
  eleve_record RECORD;
BEGIN
  FOR eleve_record IN 
    SELECT id FROM eleves WHERE immatriculation IS NULL
  LOOP
    UPDATE eleves 
    SET immatriculation = public.generer_immatriculation()
    WHERE id = eleve_record.id;
  END LOOP;
END $$;