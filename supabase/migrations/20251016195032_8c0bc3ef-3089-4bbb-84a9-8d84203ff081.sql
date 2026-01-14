-- Corriger la fonction handle_new_user pour respecter le rôle dans user_metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- Récupérer le rôle depuis user_metadata, sinon utiliser 'gestionnaire' par défaut
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'gestionnaire');
  
  -- Insérer le profil avec le bon rôle
  INSERT INTO public.profiles (user_id, email, role, nom, prenom)
  VALUES (
    NEW.id, 
    NEW.email, 
    v_role,
    NEW.raw_user_meta_data->>'nom',
    NEW.raw_user_meta_data->>'prenom'
  );
  
  -- Créer le rôle utilisateur correspondant
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;