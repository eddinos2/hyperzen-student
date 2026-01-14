# HyperZen - Gestion des Paiements Scolaires

## Description du projet

Application de gestion des paiements et de la scolarité pour les établissements d'enseignement.

## Technologies utilisées

Ce projet est construit avec :

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase

## Installation et développement local

Pour travailler sur ce projet en local avec **votre propre projet Supabase** :

```sh
# 1. Cloner le dépôt
git clone https://github.com/eddinos2/hyperzen-student.git
cd hyperzen-student

# 2. Installer les dépendances frontend
npm install

# 3. Lancer le frontend
npm run dev
```

### Configuration Supabase (à adapter par chaque développeur)

Chaque développeur doit utiliser **son propre projet Supabase** et renseigner les variables d'environnement
dans un fichier `.env` (non versionné) à la racine du projet.

> 💡 **Astuce** : Copiez `.env.example` vers `.env` et remplissez les valeurs avec vos propres credentials.

Variables d'environnement requises :

```sh
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_ANON_KEY

SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY

# Optionnel : pour les outils qui se connectent directement à Postgres
SUPABASE_DB_URL=postgres://postgres:password@db.YOUR_PROJECT_ID.supabase.co:5432/postgres?sslmode=require

# Email provider utilisé par la fonction envoyer-notification-email
RESEND_API_KEY=YOUR_RESEND_API_KEY
```

> Ces valeurs ne doivent jamais être commitées dans Git. Chaque développeur garde ses propres identifiants localement
> ou dans son gestionnaire de secrets (CI, plateforme de déploiement, etc.).

### Recréer la base de données à l'identique

Le dossier `supabase/migrations` contient l'historique des migrations permettant de recréer le schéma de la base.
Pour appliquer ces migrations sur votre projet Supabase :

1. Installer le CLI Supabase : voir la documentation officielle.
2. Depuis le dossier du projet, lier votre projet :

   ```sh
   supabase link --project-ref YOUR_PROJECT_ID
   ```

3. Pousser les migrations vers votre base :

   ```sh
   supabase db push
   ```

4. Vérifier que les tables et fonctions correspondent bien au schéma décrit dans `src/integrations/supabase/types.ts`.

Ainsi, chaque développeur peut disposer d'une base Supabase **recréée à partir des migrations** sans dépendre du projet
original.

Pour plus de détails :

- `docs/DEVELOPMENT_SETUP.md` – guide complet de setup (Supabase, env, Edge Functions).
- `docs/ENVIRONMENT.md` – configuration des variables d'environnement par environnement.
- `docs/SEEDS_AND_INTEGRATIONS.md` – seeds de démo et intégrations externes (Typeform, Google Sheets, Resend).

## Fonctionnalités principales

- Gestion des élèves et dossiers de scolarité
- Suivi des paiements et échéances
- Génération de reçus automatiques
- Relances automatiques pour retards de paiement
- Portail élève pour consultation des paiements
- Rapports et statistiques financières
- Gestion des anomalies
- Support multi-utilisateurs avec authentification

## Structure du projet

- `/src/pages` - Pages principales de l'application
- `/src/components` - Composants réutilisables
- `/src/lib` - Fonctions utilitaires
- `/supabase/functions` - Fonctions serverless

## Déploiement

Le projet peut être déployé sur n'importe quelle plateforme supportant Vite (Vercel, Netlify, etc.)

## Support

Pour toute question ou assistance, contactez l'équipe de développement.
