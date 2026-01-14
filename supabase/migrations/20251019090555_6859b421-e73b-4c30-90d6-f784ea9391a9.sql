-- Phase 1: Sécurité - Audit Logging & Password Security
-- Tables pour l'audit logging

-- Table user_password_status pour gérer le changement obligatoire de mot de passe
CREATE TABLE IF NOT EXISTS public.user_password_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  must_change_password BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Table login_attempts pour le rate limiting
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip_address INET,
  success BOOLEAN NOT NULL,
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_agent TEXT
);

-- Table password_history pour éviter la réutilisation (admins/gestionnaires uniquement)
CREATE TABLE IF NOT EXISTS public.password_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activer RLS sur les nouvelles tables
ALTER TABLE public.user_password_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies pour user_password_status
CREATE POLICY "Users can view their own password status"
ON public.user_password_status
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own password status"
ON public.user_password_status
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all password statuses"
ON public.user_password_status
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert password status"
ON public.user_password_status
FOR INSERT
WITH CHECK (true);

-- RLS Policies pour login_attempts
CREATE POLICY "Admins can view all login attempts"
ON public.login_attempts
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert login attempts"
ON public.login_attempts
FOR INSERT
WITH CHECK (true);

-- RLS Policies pour password_history
CREATE POLICY "Admins can view password history"
ON public.password_history
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert password history"
ON public.password_history
FOR INSERT
WITH CHECK (true);

-- RLS Policies pour audit_log (renforcement)
CREATE POLICY "Admins can view audit logs"
ON public.audit_log
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Fonction pour logger les audits automatiquement
CREATE OR REPLACE FUNCTION public.log_audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (
      user_id,
      action,
      table_name,
      record_id,
      old_data
    ) VALUES (
      auth.uid(),
      TG_OP,
      TG_TABLE_NAME,
      OLD.id,
      row_to_json(OLD)
    );
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log (
      user_id,
      action,
      table_name,
      record_id,
      old_data,
      new_data
    ) VALUES (
      auth.uid(),
      TG_OP,
      TG_TABLE_NAME,
      NEW.id,
      row_to_json(OLD),
      row_to_json(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (
      user_id,
      action,
      table_name,
      record_id,
      new_data
    ) VALUES (
      auth.uid(),
      TG_OP,
      TG_TABLE_NAME,
      NEW.id,
      row_to_json(NEW)
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Créer les triggers sur les tables sensibles
DROP TRIGGER IF EXISTS audit_reglements_trigger ON public.reglements;
CREATE TRIGGER audit_reglements_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.reglements
FOR EACH ROW EXECUTE FUNCTION public.log_audit_trigger();

DROP TRIGGER IF EXISTS audit_eleves_trigger ON public.eleves;
CREATE TRIGGER audit_eleves_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.eleves
FOR EACH ROW EXECUTE FUNCTION public.log_audit_trigger();

DROP TRIGGER IF EXISTS audit_dossiers_trigger ON public.dossiers_scolarite;
CREATE TRIGGER audit_dossiers_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.dossiers_scolarite
FOR EACH ROW EXECUTE FUNCTION public.log_audit_trigger();

DROP TRIGGER IF EXISTS audit_user_roles_trigger ON public.user_roles;
CREATE TRIGGER audit_user_roles_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.log_audit_trigger();

DROP TRIGGER IF EXISTS audit_profiles_trigger ON public.profiles;
CREATE TRIGGER audit_profiles_trigger
AFTER UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.log_audit_trigger();

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON public.audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.audit_log(action);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON public.login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_login_attempts_attempted_at ON public.login_attempts(attempted_at DESC);

CREATE INDEX IF NOT EXISTS idx_password_status_user_id ON public.user_password_status(user_id);

-- Fonction pour nettoyer les anciens logs (90 jours)
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM public.audit_log
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- Fonction pour vérifier le rate limiting
CREATE OR REPLACE FUNCTION public.check_login_rate_limit(
  p_email TEXT,
  p_ip_address INET
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_failed_attempts INTEGER;
BEGIN
  -- Compter les tentatives échouées dans les 15 dernières minutes
  SELECT COUNT(*)
  INTO v_failed_attempts
  FROM public.login_attempts
  WHERE email = p_email
    AND success = false
    AND attempted_at > NOW() - INTERVAL '15 minutes';
  
  -- Si plus de 5 tentatives échouées, bloquer
  IF v_failed_attempts >= 5 THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;