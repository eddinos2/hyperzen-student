## Configuration des environnements

Ce document décrit comment gérer la configuration entre les différents environnements
(local, préprod, prod) sans exposer les secrets dans le code.

---

### 1. Variables communes

Les variables suivantes sont utilisées dans tout le projet :

- **Frontend (Vite)**
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`

- **Fonctions / backend (Supabase Edge Functions, scripts, CLI)**
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_DB_URL` (optionnelle, pour des scripts SQL/diagnostics)
  - `RESEND_API_KEY` (clé API Resend pour l'envoi d'emails)
  - `RESEND_FROM_EMAIL` (optionnelle, email expéditeur, par défaut: `HYPERZEN <onboarding@resend.dev>`)

---

### 2. Environnement local (développement)

Créer un fichier `.env` à la racine (ignoré par Git) :

```sh
VITE_SUPABASE_URL=https://YOUR_DEV_PROJECT_ID.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_DEV_SUPABASE_ANON_KEY

SUPABASE_URL=https://YOUR_DEV_PROJECT_ID.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_DEV_SUPABASE_SERVICE_ROLE_KEY
SUPABASE_DB_URL=postgres://postgres:password@db.YOUR_DEV_PROJECT_ID.supabase.co:5432/postgres?sslmode=require

RESEND_API_KEY=YOUR_DEV_RESEND_API_KEY
# Optionnel : email expéditeur (par défaut: HYPERZEN <onboarding@resend.dev>)
# En production, utilisez un domaine vérifié : HYPERZEN <noreply@votredomaine.com>
RESEND_FROM_EMAIL=HYPERZEN <onboarding@resend.dev>
```

Les Edge Functions récupèreront les mêmes valeurs via les variables d'environnement configurées
dans le dashboard Supabase.

---

### 3. Préproduction / Production

En préprod/prod, **ne pas utiliser de `.env` commité** :

- Sur votre plateforme de déploiement (Vercel, Netlify, etc.), définir :
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
- Sur Supabase (Project Settings / API / Functions), définir :
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `RESEND_API_KEY`
  - `RESEND_FROM_EMAIL` (optionnel, par défaut: `HYPERZEN <onboarding@resend.dev>`)
  
**Note sur Resend** : 
- `onboarding@resend.dev` est un email de test fourni par Resend (fonctionne uniquement pour les tests).
- En production, vous devez vérifier votre propre domaine dans Resend et utiliser un email comme `noreply@votredomaine.com`.

Le code frontend n'utilise **que** la clé publique (`VITE_SUPABASE_PUBLISHABLE_KEY`).
Les clés sensibles (`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`) ne sont utilisées que côté serveur
ou dans les Edge Functions.

---

### 4. Rotation des clés et bonnes pratiques

- Régénérez les clés Supabase si vous suspectez une fuite et mettez à jour :
  - Les variables d'environnement du frontend (plateforme de déploiement).
  - Les variables d'environnement des Edge Functions dans Supabase.
- Ne jamais logguer les clés complètes dans la console ou dans les logs applicatifs.
- Ne jamais commiter de `.env`, même en dev.


