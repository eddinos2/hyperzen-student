-- Table pour les paramètres globaux de l'application
CREATE TABLE IF NOT EXISTS public.parametres_globaux (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cle TEXT UNIQUE NOT NULL,
  valeur TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Activer RLS
ALTER TABLE public.parametres_globaux ENABLE ROW LEVEL SECURITY;

-- Les admins peuvent tout faire
CREATE POLICY "Admins can manage parametres_globaux"
ON public.parametres_globaux
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Tout le monde peut lire les paramètres
CREATE POLICY "Everyone can view parametres_globaux"
ON public.parametres_globaux
FOR SELECT
TO authenticated
USING (true);

-- Insérer les paramètres par défaut
INSERT INTO public.parametres_globaux (cle, valeur, description) VALUES
  ('theme', 'default', 'Thème actuel du site (default, halloween, noel, ete, printemps)'),
  ('mode_maintenance', 'false', 'Mode maintenance activé ou non (true/false)')
ON CONFLICT (cle) DO NOTHING;

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_parametres_globaux_updated_at
BEFORE UPDATE ON public.parametres_globaux
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();