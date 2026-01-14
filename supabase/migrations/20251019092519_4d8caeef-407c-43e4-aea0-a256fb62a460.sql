-- Créer la table des tâches planifiées
CREATE TABLE IF NOT EXISTS public.taches_planifiees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  type_tache TEXT NOT NULL, -- 'relances_automatiques', 'notifications_echeances', 'mise_a_jour_risques'
  description TEXT,
  heure_execution TIME NOT NULL, -- Heure d'exécution (ex: '09:00:00')
  jours_semaine INTEGER[], -- Jours de la semaine (1=Lundi, 7=Dimanche), NULL = tous les jours
  actif BOOLEAN NOT NULL DEFAULT true,
  derniere_execution TIMESTAMP WITH TIME ZONE,
  prochaine_execution TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Indexes pour améliorer les performances
CREATE INDEX idx_taches_planifiees_actif ON public.taches_planifiees(actif);
CREATE INDEX idx_taches_planifiees_type ON public.taches_planifiees(type_tache);
CREATE INDEX idx_taches_planifiees_prochaine_execution ON public.taches_planifiees(prochaine_execution) WHERE actif = true;

-- RLS policies
ALTER TABLE public.taches_planifiees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage taches planifiees"
  ON public.taches_planifiees
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "All authenticated users can view taches planifiees"
  ON public.taches_planifiees
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Trigger pour updated_at
CREATE TRIGGER update_taches_planifiees_updated_at
  BEFORE UPDATE ON public.taches_planifiees
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Fonction pour calculer la prochaine exécution
CREATE OR REPLACE FUNCTION public.calculer_prochaine_execution(
  p_heure_execution TIME,
  p_jours_semaine INTEGER[]
)
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE plpgsql
AS $$
DECLARE
  v_maintenant TIMESTAMP WITH TIME ZONE := NOW();
  v_date_candidate DATE := CURRENT_DATE;
  v_datetime_candidate TIMESTAMP WITH TIME ZONE;
  v_jour_semaine INTEGER;
  v_jours_cherches INTEGER := 0;
BEGIN
  -- Si pas de jours spécifiques, tous les jours
  IF p_jours_semaine IS NULL OR array_length(p_jours_semaine, 1) IS NULL THEN
    v_datetime_candidate := (CURRENT_DATE + p_heure_execution::TIME)::TIMESTAMP WITH TIME ZONE;
    
    -- Si l'heure est déjà passée aujourd'hui, prendre demain
    IF v_datetime_candidate <= v_maintenant THEN
      v_datetime_candidate := ((CURRENT_DATE + INTERVAL '1 day') + p_heure_execution::TIME)::TIMESTAMP WITH TIME ZONE;
    END IF;
    
    RETURN v_datetime_candidate;
  END IF;
  
  -- Chercher le prochain jour valide
  WHILE v_jours_cherches < 8 LOOP
    v_jour_semaine := EXTRACT(ISODOW FROM v_date_candidate)::INTEGER;
    v_datetime_candidate := (v_date_candidate + p_heure_execution::TIME)::TIMESTAMP WITH TIME ZONE;
    
    -- Si c'est un jour valide et que l'heure n'est pas passée (ou que c'est un jour futur)
    IF v_jour_semaine = ANY(p_jours_semaine) AND 
       (v_datetime_candidate > v_maintenant OR v_date_candidate > CURRENT_DATE) THEN
      RETURN v_datetime_candidate;
    END IF;
    
    v_date_candidate := v_date_candidate + INTERVAL '1 day';
    v_jours_cherches := v_jours_cherches + 1;
  END LOOP;
  
  -- Par défaut, retourner demain à l'heure spécifiée
  RETURN ((CURRENT_DATE + INTERVAL '1 day') + p_heure_execution::TIME)::TIMESTAMP WITH TIME ZONE;
END;
$$;

-- Trigger pour mettre à jour automatiquement prochaine_execution
CREATE OR REPLACE FUNCTION public.update_prochaine_execution()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.actif = true THEN
    NEW.prochaine_execution := public.calculer_prochaine_execution(
      NEW.heure_execution,
      NEW.jours_semaine
    );
  ELSE
    NEW.prochaine_execution := NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_prochaine_execution
  BEFORE INSERT OR UPDATE OF heure_execution, jours_semaine, actif
  ON public.taches_planifiees
  FOR EACH ROW
  EXECUTE FUNCTION public.update_prochaine_execution();