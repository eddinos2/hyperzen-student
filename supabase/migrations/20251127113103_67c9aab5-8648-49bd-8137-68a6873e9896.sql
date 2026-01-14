-- Créer la table pour les configurations Typeform
CREATE TABLE IF NOT EXISTS public.typeform_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Identifiants
  form_type TEXT NOT NULL UNIQUE, -- 'inscription_standard', 'inscription_alternance', etc.
  form_name TEXT NOT NULL, -- Nom descriptif
  description TEXT,
  actif BOOLEAN DEFAULT true,
  
  -- Configuration des champs (mapping JSON)
  field_mappings JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Paramètres du dossier
  tarif_scolarite NUMERIC DEFAULT 0,
  statut_dossier TEXT DEFAULT 'en_attente',
  annee_scolaire TEXT DEFAULT '2025_2026',
  
  -- Métadonnées
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Index pour recherche rapide
CREATE INDEX idx_typeform_configs_form_type ON public.typeform_configs(form_type);
CREATE INDEX idx_typeform_configs_actif ON public.typeform_configs(actif);

-- RLS policies
ALTER TABLE public.typeform_configs ENABLE ROW LEVEL SECURITY;

-- Admins et finance peuvent tout voir
CREATE POLICY "Admins et finance peuvent voir les configurations"
  ON public.typeform_configs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'finance')
    )
  );

-- Seuls les admins peuvent modifier
CREATE POLICY "Admins peuvent gérer les configurations"
  ON public.typeform_configs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Trigger pour updated_at
CREATE TRIGGER update_typeform_configs_updated_at
  BEFORE UPDATE ON public.typeform_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger pour updated_by
CREATE OR REPLACE FUNCTION public.set_updated_by()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER set_typeform_configs_updated_by
  BEFORE UPDATE ON public.typeform_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_by();

-- Insérer les configurations par défaut
INSERT INTO public.typeform_configs (form_type, form_name, description, tarif_scolarite, field_mappings, actif)
VALUES 
(
  'inscription_standard',
  'Inscription Standard',
  'Formulaire d''inscription standard pour les nouveaux étudiants',
  3900,
  '{
    "email": {"keywords": ["email", "mail", "e-mail"], "ref": "6a725400-f313-4456-b494-a57d745eeb8c"},
    "prenom": {"keywords": ["first name", "prénom", "prenom", "firstname"], "ref": "db84edd5-22d5-44d2-a2bc-3083d29d77a8"},
    "nom": {"keywords": ["last name", "nom", "lastname", "surname"], "ref": "2fd8ede5-8953-4e60-b568-10888ed1d7f9"},
    "telephone": {"keywords": ["phone", "téléphone", "telephone", "tel"], "ref": "6ac52183-c78b-4f61-8ee5-6fe5885cf55e"},
    "date_naissance": {"keywords": ["date de naissance", "naissance", "birth"], "ref": "29b265a2-31b3-48fa-95d7-b206930b5cd5"},
    "address": {"keywords": ["address", "adresse"], "ref": "d2ca5aca-dde5-42f9-8d85-1ed2afbcee54"},
    "address2": {"keywords": ["address line 2", "complément"], "ref": "b4f8e671-5b57-4966-9bc9-b1a36e890ee4"},
    "city": {"keywords": ["city", "ville", "town"], "ref": "bdad4b34-732b-442e-a319-6878e0d7c9e4"},
    "zip": {"keywords": ["zip", "post", "code postal"], "ref": "8767f4ef-b369-423c-a5d4-4899169c8ef3"},
    "country": {"keywords": ["country", "pays"], "ref": "69a7b6e8-d132-4a14-aeaa-ea4e5594c241"},
    "contact_urgence_nom": {"keywords": ["représentant", "legal", "urgence nom"], "ref": "a90e4301-a4dc-417b-b2ce-2723f0edbe2e"},
    "contact_urgence_email": {"keywords": ["représentant email", "urgence email"], "ref": "b1e3439c-2016-4daa-99be-28f1297fd29e"},
    "filiere": {"keywords": ["filière", "filiere", "bts", "formation"], "ref": "70e94c21-ea8e-4098-86eb-ffeacf917bbc"}
  }'::jsonb,
  true
),
(
  'inscription_alternance',
  'Inscription Alternance',
  'Formulaire d''inscription pour les formations en alternance (gratuit)',
  0,
  '{
    "email": {"keywords": ["email", "mail"]},
    "prenom": {"keywords": ["prénom", "prenom"]},
    "nom": {"keywords": ["nom", "last name"]},
    "telephone": {"keywords": ["téléphone", "phone"]},
    "date_naissance": {"keywords": ["date de naissance"]},
    "address": {"keywords": ["adresse"]},
    "city": {"keywords": ["ville"]},
    "zip": {"keywords": ["code postal"]},
    "filiere": {"keywords": ["formation alternance", "bts alternance"]}
  }'::jsonb,
  true
);