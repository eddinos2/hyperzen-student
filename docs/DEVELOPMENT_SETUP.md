## Setup de développement pour HyperZen

Ce document décrit comment un développeur peut cloner le projet, connecter **son propre projet Supabase**
et recréer la base de données à l'identique, sans dépendre de l'environnement d'origine.

---

### 1. Pré-requis

- **Node.js** 18+ (recommandé LTS)
- **npm** ou **pnpm**
- **Compte Supabase** (gratuit possible)
- **Supabase CLI** installé (`supabase` dans votre PATH)

---

### 2. Cloner le projet

```sh
git clone https://github.com/eddinos2/hyperzen-student-clean.git
cd hyperzen-student-clean
npm install
```

---

### 3. Créer votre projet Supabase

1. Aller sur l'interface Supabase et créer un **nouveau projet**.
2. Récupérer :
   - l'URL du projet (`https://YOUR_PROJECT_ID.supabase.co`)
   - la **anon key** (clé publique)
   - la **service role key** (clé privée, à garder côté serveur uniquement)
3. Optionnel : récupérer l'URL de connexion Postgres (`postgres://...@db.YOUR_PROJECT_ID.supabase.co:5432/postgres?sslmode=require`)

---

### 4. Configurer vos variables d'environnement

Créer un fichier `.env` **à la racine** du projet (il est ignoré par Git) :

```sh
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_ANON_KEY

SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY

# Optionnel : utilisé seulement par des outils ou scripts côté serveur/CLI
SUPABASE_DB_URL=postgres://postgres:password@db.YOUR_PROJECT_ID.supabase.co:5432/postgres?sslmode=require

# Pour l'envoi d'emails (fonction envoyer-notification-email)
RESEND_API_KEY=YOUR_RESEND_API_KEY
```

> Ne commitez jamais ce fichier. Chaque développeur doit utiliser ses propres secrets ou un gestionnaire de secrets.

---

### 5. Lier le projet local à votre projet Supabase

Dans le dossier du projet :

```sh
supabase link --project-ref YOUR_PROJECT_ID
```

Cela permet à la CLI d'appliquer les migrations sur **votre** base Supabase.

---

### 6. Rejouer les migrations pour recréer la base

Le schéma complet de la base est décrit dans :

- `supabase/migrations/*.sql` (source de vérité)
- `src/integrations/supabase/types.ts` (types générés côté frontend)

Pour appliquer toutes les migrations sur votre projet :

```sh
supabase db push
```

Le résultat attendu :

- Toutes les tables décrites dans `types.ts` existent dans le schéma `public`.
- Les fonctions SQL (par ex. `calculer_solde_dossier`, `stats_dashboard`, etc.) sont présentes.
- Les politiques RLS et triggers créés dans les migrations sont appliqués.

---

### 7. (Optionnel) Injecter des données de démonstration

Un script de seed idempotent est fourni dans `supabase/seeds/demo_data.sql`.  
Il crée une année scolaire de démo, un campus, une filière, un élève et un dossier de démonstration.

Depuis un terminal avec `psql` disponible :

```sh
psql "$SUPABASE_DB_URL" -f supabase/seeds/demo_data.sql
```

Ou via la CLI Supabase :

```sh
supabase db connect
-- puis dans le shell psql :
\i supabase/seeds/demo_data.sql
```

---

### 8. Configurer les Edge Functions Supabase

Les fonctions se trouvent dans `supabase/functions/*` (TypeScript pour Deno).

Depuis la racine du projet :

```sh
supabase functions deploy envoyer-notification-email
supabase functions deploy sync-google-sheets
supabase functions deploy sync-typeform
supabase functions deploy generer-echeances-auto
supabase functions deploy traiter-relances-automatiques
supabase functions deploy notifier-echeance-proche
supabase functions deploy notifier-confirmation-paiement
supabase functions deploy parse-import
supabase functions deploy get-eleve-email
supabase functions deploy nettoyer-base-complete
supabase functions deploy supprimer-eleve-complet
supabase functions deploy repair-eleves
supabase functions deploy admin-gerer-utilisateur
```

> Adaptez la liste ci-dessus selon les fonctions que vous utilisez réellement en environnement de dev.

Ensuite, configurez les **variables d'environnement** des Edge Functions dans l'interface Supabase
(`Project Settings` → `API` / `Functions`), au minimum :

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY` (pour `envoyer-notification-email`)
- `RESEND_FROM_EMAIL` (optionnel, par défaut: `HYPERZEN <onboarding@resend.dev>`)

> **Note** : Vous pouvez copier `.env.example` vers `.env` et remplir les valeurs avec vos propres credentials.

---

### 9. Lancer le frontend en local

```sh
npm run dev
```

L'application sera accessible (par défaut) sur `http://localhost:8080`.

---

### 10. Notes sur la génération de types Supabase

Le fichier `src/integrations/supabase/types.ts` est généré à partir du schéma Postgres
via la CLI Supabase. Pour le régénérer après modification du schéma :

```sh
supabase gen types typescript --project-id YOUR_PROJECT_ID --schema public > src/integrations/supabase/types.ts
```

Cela permet de garder les types TypeScript synchronisés avec votre schéma.


