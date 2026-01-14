-- Table pour associer des gestionnaires à des campus
CREATE TABLE IF NOT EXISTS public.gestionnaires_campus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campus_id UUID NOT NULL REFERENCES public.campus(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, campus_id)
);

-- Enable RLS
ALTER TABLE public.gestionnaires_campus ENABLE ROW LEVEL SECURITY;

-- Policies pour gestionnaires_campus
CREATE POLICY "Admins can manage campus assignments"
ON public.gestionnaires_campus
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their campus assignments"
ON public.gestionnaires_campus
FOR SELECT
USING (auth.uid() = user_id);

-- Index pour améliorer les performances
CREATE INDEX idx_gestionnaires_campus_user_id ON public.gestionnaires_campus(user_id);
CREATE INDEX idx_gestionnaires_campus_campus_id ON public.gestionnaires_campus(campus_id);