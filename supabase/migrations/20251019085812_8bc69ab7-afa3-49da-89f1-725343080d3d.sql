-- Créer des index pour optimiser les recherches et les filtres
-- Index sur les colonnes fréquemment utilisées dans les WHERE et les recherches

-- Index pour les recherches d'élèves
CREATE INDEX IF NOT EXISTS idx_eleves_nom_prenom ON public.eleves (nom, prenom);
CREATE INDEX IF NOT EXISTS idx_eleves_email ON public.eleves (email);
CREATE INDEX IF NOT EXISTS idx_eleves_immatriculation ON public.eleves (immatriculation);

-- Index pour les règlements
CREATE INDEX IF NOT EXISTS idx_reglements_statut ON public.reglements (statut);
CREATE INDEX IF NOT EXISTS idx_reglements_dossier_id ON public.reglements (dossier_id);
CREATE INDEX IF NOT EXISTS idx_reglements_date ON public.reglements (date_reglement DESC);
CREATE INDEX IF NOT EXISTS idx_reglements_moyen_paiement ON public.reglements (moyen_paiement);

-- Index pour les échéances
CREATE INDEX IF NOT EXISTS idx_echeances_statut ON public.echeances (statut);
CREATE INDEX IF NOT EXISTS idx_echeances_dossier_id ON public.echeances (dossier_id);
CREATE INDEX IF NOT EXISTS idx_echeances_date ON public.echeances (date_echeance);

-- Index pour les dossiers
CREATE INDEX IF NOT EXISTS idx_dossiers_eleve_id ON public.dossiers_scolarite (eleve_id);
CREATE INDEX IF NOT EXISTS idx_dossiers_statut ON public.dossiers_scolarite (statut_dossier);

-- Index composite pour les requêtes combinées fréquentes
CREATE INDEX IF NOT EXISTS idx_reglements_statut_date ON public.reglements (statut, date_reglement DESC);
CREATE INDEX IF NOT EXISTS idx_echeances_dossier_statut ON public.echeances (dossier_id, statut);