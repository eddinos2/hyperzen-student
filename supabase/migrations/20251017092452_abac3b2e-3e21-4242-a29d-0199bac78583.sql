-- Créer une table pour stocker les mots de passe initiaux des élèves
CREATE TABLE public.eleves_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eleve_id UUID NOT NULL REFERENCES public.eleves(id) ON DELETE CASCADE,
  immatriculation TEXT NOT NULL,
  mot_de_passe_initial TEXT NOT NULL,
  mot_de_passe_change BOOLEAN DEFAULT false,
  date_creation TIMESTAMP WITH TIME ZONE DEFAULT now(),
  date_dernier_changement TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(eleve_id)
);

-- Activer RLS
ALTER TABLE public.eleves_credentials ENABLE ROW LEVEL SECURITY;

-- Policy pour les admins uniquement
CREATE POLICY "Admins can view credentials" 
ON public.eleves_credentials 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert credentials" 
ON public.eleves_credentials 
FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update credentials" 
ON public.eleves_credentials 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete credentials" 
ON public.eleves_credentials 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));

-- Index pour améliorer les performances
CREATE INDEX idx_eleves_credentials_eleve_id ON public.eleves_credentials(eleve_id);
CREATE INDEX idx_eleves_credentials_immatriculation ON public.eleves_credentials(immatriculation);

-- Ajouter un commentaire pour expliquer l'usage
COMMENT ON TABLE public.eleves_credentials IS 'Stocke les identifiants initiaux des élèves pour permettre leur export. Les mots de passe sont marqués comme changés une fois que l''élève modifie son mot de passe.';