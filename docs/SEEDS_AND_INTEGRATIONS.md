## Seeds et intégrations HyperZen

Ce document complète `DEVELOPMENT_SETUP.md` et `ENVIRONMENT.md` en détaillant :

- Un **jeu de données de démonstration** pour les environnements de développement.
- La configuration des **intégrations externes** (Typeform, Google Sheets, emails via Resend).

---

## 1. Seed de données de démo

Un script de seed idempotent est fourni dans :

- `supabase/seeds/demo_data.sql`

Ce script crée :

- Une **année scolaire** `2025-2026`.
- Un **campus** par défaut `Campus principal`.
- Une **filière** de démo `BTS Gestion`.
- Un **élève de démo** `Jane DOE` avec un dossier de scolarité.
- Des **paramètres de paiement** et un **paramètre global** indiquant le mode démo.

Le script est **idempotent** : il utilise `ON CONFLICT (id) DO NOTHING` pour éviter les doublons.

### Exécuter le seed

Pré-requis :
- Les migrations ont été appliquées (`supabase db push`).
- Vous disposez d'une URL de connexion Postgres (`SUPABASE_DB_URL`).

Depuis un terminal (avec `psql` installé) :

```sh
psql "$SUPABASE_DB_URL" -f supabase/seeds/demo_data.sql
```

Ou, en utilisant la CLI Supabase :

```sh
supabase db connect
-- puis dans le shell psql ouvert :
\i supabase/seeds/demo_data.sql
```

---

## 2. Intégration Typeform

### 2.1. Composant de configuration

Le composant `TypeformConfigManager` (`src/components/parametres/TypeformConfigManager.tsx`) permet :

- De créer/éditer des configurations pour les formulaires Typeform.
- De définir les **mappings de champs** sous forme de JSON.
- De copier l'URL de webhook associée à chaque type de formulaire.

Les configurations sont stockées dans la table :

- `public.typeform_configs`

### 2.2. Webhook Typeform

La fonction Edge `sync-typeform` reçoit les webhooks Typeform et :

- Crée ou met à jour des **élèves** (`eleves`).
- Crée ou met à jour des **dossiers de scolarité** (`dossiers_scolarite`).
- Peut créer des **règlements** en fonction des choix de paiement.

L’URL du webhook pour un type de formulaire `inscription_standard` est :

```text
${VITE_SUPABASE_URL}/functions/v1/sync-typeform?type=inscription_standard
```

Vous pouvez la copier directement depuis l’interface HyperZen (bouton "Copier URL" dans les paramètres Typeform).

### 2.3. Configuration côté Typeform

1. Dans Typeform, ouvrez votre formulaire.
2. Allez dans **Connect** / **Webhooks**.
3. Ajoutez un webhook avec l’URL copiée depuis HyperZen.
4. Assurez-vous que :
   - Le payload contient les champs attendus par votre `field_mappings`.
   - Le webhook est **activé**.

---

## 3. Intégration Google Sheets / CSV d’inscription

### 3.1. Fonction `sync-google-sheets`

La fonction Edge `sync-google-sheets` prend en entrée un `csvContent` (contenu CSV brut) et :

- Parse le CSV.
- Crée des élèves (`eleves`) et des dossiers (`dossiers_scolarite`) en évitant les doublons.

Exemple d’appel (depuis un script ou un outil d’intégration) :

```ts
await fetch(`${SUPABASE_URL}/functions/v1/sync-google-sheets`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, // si nécessaire
  },
  body: JSON.stringify({ csvContent }),
});
```

> Adapter la source du `csvContent` (Google Sheets API, export manuel, etc.).

### 3.2. Import CSV interne

L’application HyperZen contient également une **interface d’import CSV** (`/import`) qui :

- Uploade un fichier CSV.
- Utilise la fonction Edge `parse-import`.
- Affiche un aperçu avant insertion.

Reportez-vous aux composants du dossier `src/components/import` pour voir les colonnes attendues et le format recommandé.

---

## 4. Emails via Resend

Les fonctions Edge suivantes utilisent Resend pour l’envoi d’emails :

- `envoyer-notification-email`
- `envoyer-identifiants-eleve`
- `envoyer-relances-retard`

### 4.1. Variables d’environnement requises

Dans Supabase (Project Settings → Functions), définir :

- `RESEND_API_KEY` : clé API Resend.
- `RESEND_FROM_EMAIL` (optionnel) :
  - Par défaut, le code utilise `HYPERZEN <onboarding@resend.dev>`.
  - En production, utilisez un domaine vérifié (ex: `HYPERZEN <noreply@votredomaine.com>`).

### 4.2. Remarques

- `onboarding@resend.dev` est adapté aux tests, pas à la production.
- Pour la production :
  - Créez un domaine dans Resend.
  - Vérifiez les DNS.
  - Utilisez une adresse d’expéditeur de ce domaine dans `RESEND_FROM_EMAIL`.

---

## 5. Résumé

- **demo_data.sql** fournit un environnement de démo minimal, reproductible et idempotent.
- Les **intégrations Typeform / Google Sheets / CSV** sont prêtes mais nécessitent :
  - La configuration des webhooks / API externes.
  - Le remplissage de `typeform_configs` depuis l’interface HyperZen.
- L’envoi d’emails repose sur **Resend**, avec une configuration simple via variables d’environnement.


