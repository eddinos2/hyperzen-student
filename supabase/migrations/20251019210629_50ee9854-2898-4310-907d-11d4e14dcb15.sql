-- Ajouter les nouveaux statuts d'inscription
ALTER TABLE eleves 
DROP CONSTRAINT IF EXISTS eleves_statut_inscription_check;

ALTER TABLE eleves 
ADD CONSTRAINT eleves_statut_inscription_check 
CHECK (statut_inscription IN ('Inscrit', 'En attente', 'Désinscrit', 'Diplômé', 'Redoublant', 'Archive'));

-- Ajouter un champ commentaire aux échéances si pas déjà présent
ALTER TABLE echeances 
ADD COLUMN IF NOT EXISTS commentaire TEXT;

-- Créer une fonction helper pour calculer la prochaine année d'étude
CREATE OR REPLACE FUNCTION public.get_annee_suivante(annee_actuelle_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_ordre_actuel INTEGER;
  v_annee_suivante_id UUID;
BEGIN
  -- Récupérer l'ordre de l'année actuelle
  SELECT ordre INTO v_ordre_actuel
  FROM annees_scolaires
  WHERE id = annee_actuelle_id;
  
  -- Trouver l'année suivante
  SELECT id INTO v_annee_suivante_id
  FROM annees_scolaires
  WHERE ordre = v_ordre_actuel + 1;
  
  RETURN v_annee_suivante_id;
END;
$$;