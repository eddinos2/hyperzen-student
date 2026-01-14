-- Ajouter moyens de paiement acceptés aux plans de paiement
ALTER TABLE plans_paiement 
ADD COLUMN IF NOT EXISTS moyens_totalite TEXT[] DEFAULT ARRAY['Virement', 'CB', 'Espèces'],
ADD COLUMN IF NOT EXISTS moyens_solde TEXT[] DEFAULT ARRAY['Chèque', 'Prélèvement'];

COMMENT ON COLUMN plans_paiement.moyens_totalite IS 'Moyens de paiement acceptés pour paiement en totalité';
COMMENT ON COLUMN plans_paiement.moyens_solde IS 'Moyens de paiement acceptés pour le solde (après acompte)';