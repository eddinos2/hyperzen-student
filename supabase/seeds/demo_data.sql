-- Demo seed data for HyperZen
-- Objectif : fournir un jeu de données minimal et déterministe pour les environnements de développement
-- Règles : SQL idempotent (ON CONFLICT DO NOTHING), pas de modification des types existants.

-- Année scolaire de référence
INSERT INTO public.annees_scolaires (id, libelle, ordre, par_defaut)
VALUES ('00000000-0000-0000-0000-000000000001', '2025-2026', 1, true)
ON CONFLICT (id) DO NOTHING;

-- Campus par défaut
INSERT INTO public.campus (id, nom, code, actif)
VALUES ('00000000-0000-0000-0000-000000000002', 'Campus principal', 'CAMPUS_PARIS', true)
ON CONFLICT (id) DO NOTHING;

-- Filière de démo
INSERT INTO public.filieres (id, nom, code, actif)
VALUES ('00000000-0000-0000-0000-000000000003', 'BTS Gestion', 'BTS_GESTION', true)
ON CONFLICT (id) DO NOTHING;

-- Élève de démo
INSERT INTO public.eleves (id, nom, prenom, email, telephone, adresse, statut_inscription, source_inscription)
VALUES (
  '00000000-0000-0000-0000-000000000004',
  'DOE',
  'Jane',
  'jane.doe@example.com',
  '+33123456789',
  '10 rue de la Paix, 75000 Paris',
  'inscrit',
  'seed_demo'
)
ON CONFLICT (id) DO NOTHING;

-- Dossier de scolarité pour l'élève de démo
INSERT INTO public.dossiers_scolarite (
  id,
  eleve_id,
  annee_id,
  annee_scolaire,
  campus_id,
  filiere_id,
  tarif_scolarite,
  statut_dossier,
  commentaire
)
VALUES (
  '00000000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000001',
  '2025-2026',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003',
  4500,
  'ouvert',
  'Dossier de démonstration créé par le seed demo_data.sql'
)
ON CONFLICT (id) DO NOTHING;

-- Paramètres de paiement de base (exemple Carte bancaire)
INSERT INTO public.parametres_paiement (id, moyen_paiement, actif, delai_jours, frais_pourcentage)
VALUES (
  '00000000-0000-0000-0000-000000000006',
  'Carte bancaire',
  true,
  0,
  0
)
ON CONFLICT (id) DO NOTHING;

-- Paramètres globaux de démo
INSERT INTO public.parametres_globaux (id, cle, valeur, description)
VALUES (
  '00000000-0000-0000-0000-000000000007',
  'hyperzen.mode_demo',
  'true',
  'Indique que la base contient des données de démonstration'
)
ON CONFLICT (id) DO NOTHING;


