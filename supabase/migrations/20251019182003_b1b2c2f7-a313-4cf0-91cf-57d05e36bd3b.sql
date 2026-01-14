-- Modifier la fonction log_audit_trigger pour inclure l'email de l'utilisateur
CREATE OR REPLACE FUNCTION public.log_audit_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_email TEXT;
BEGIN
  -- Récupérer l'email de l'utilisateur
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = auth.uid();

  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (
      user_id,
      action,
      table_name,
      record_id,
      old_data,
      user_agent
    ) VALUES (
      auth.uid(),
      TG_OP,
      TG_TABLE_NAME,
      OLD.id,
      jsonb_build_object(
        'email', v_user_email,
        'data', row_to_json(OLD)
      ),
      current_setting('request.headers', true)::json->>'user-agent'
    );
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log (
      user_id,
      action,
      table_name,
      record_id,
      old_data,
      new_data,
      user_agent
    ) VALUES (
      auth.uid(),
      TG_OP,
      TG_TABLE_NAME,
      NEW.id,
      jsonb_build_object(
        'email', v_user_email,
        'data', row_to_json(OLD)
      ),
      jsonb_build_object(
        'email', v_user_email,
        'data', row_to_json(NEW)
      ),
      current_setting('request.headers', true)::json->>'user-agent'
    );
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (
      user_id,
      action,
      table_name,
      record_id,
      new_data,
      user_agent
    ) VALUES (
      auth.uid(),
      TG_OP,
      TG_TABLE_NAME,
      NEW.id,
      jsonb_build_object(
        'email', v_user_email,
        'data', row_to_json(NEW)
      ),
      current_setting('request.headers', true)::json->>'user-agent'
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;