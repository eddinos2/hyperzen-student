-- Ensure eleve_id is unique so upserts on eleves_credentials work reliably
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'eleves_credentials_eleve_id_key'
  ) THEN
    ALTER TABLE public.eleves_credentials
    ADD CONSTRAINT eleves_credentials_eleve_id_key UNIQUE (eleve_id);
  END IF;
END $$;