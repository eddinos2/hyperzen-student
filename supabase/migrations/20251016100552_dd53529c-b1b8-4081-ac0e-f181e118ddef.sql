-- Fix missing parametres_paiement table
CREATE TABLE IF NOT EXISTS public.parametres_paiement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moyen_paiement TEXT NOT NULL UNIQUE,
  actif BOOLEAN DEFAULT true,
  delai_jours INTEGER DEFAULT 0,
  frais_pourcentage NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.parametres_paiement ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view parametres_paiement"
  ON public.parametres_paiement FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert parametres_paiement"
  ON public.parametres_paiement FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update parametres_paiement"
  ON public.parametres_paiement FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Insert default payment methods
INSERT INTO public.parametres_paiement (moyen_paiement, actif) VALUES
  ('Chèque', true),
  ('CB', true),
  ('Prélèvement', true),
  ('Virement', true),
  ('Espèces', true)
ON CONFLICT (moyen_paiement) DO NOTHING;

-- Create user_roles table for proper role management (app_role type already exists)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

-- Update profiles trigger to assign default role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, role)
  VALUES (NEW.id, NEW.email, 'gestionnaire');
  
  -- Assign default gestionnaire role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'gestionnaire');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;