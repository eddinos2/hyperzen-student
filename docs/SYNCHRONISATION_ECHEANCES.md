# 🔄 Synchronisation Échéances ↔ Règlements

## Vue d'ensemble

Le système synchronise automatiquement les **échéances** et les **règlements** pour maintenir la cohérence des données de paiement.

## 📋 Fonctionnement

### 1. Génération Automatique après Import

Après avoir importé des règlements via CSV, le système peut générer automatiquement les échéances correspondantes :

```
Import CSV → Règlements créés → Bouton "GÉNÉRER ÉCHÉANCES" → Analyse intelligente
```

#### Logique de génération :

1. **Pour chaque dossier avec règlements** :
   - Créer une échéance pour chaque règlement passé (statut = `payee`)
   - Créer une échéance pour chaque règlement futur (statut = `a_venir`)
   - Lier automatiquement l'échéance au règlement

2. **Si le total des règlements < tarif de scolarité** :
   - Calculer le reste à payer
   - Déterminer le moyen de paiement le plus fréquent de l'élève
   - Générer des échéances mensuelles futures (15 du mois)
   - Maximum 10 échéances, minimum 500€ par échéance

3. **Si aucun règlement** :
   - Aucune échéance n'est générée automatiquement
   - Utilisez le générateur manuel d'échéances

### 2. Synchronisation Bidirectionnelle

#### A) Règlement → Échéance

**Quand un règlement est créé** :
- Cherche la prochaine échéance non payée du dossier
- Marque automatiquement l'échéance comme `payee`
- Lie l'échéance au règlement

**Quand un règlement change de statut** :
- Si `valide` → `annulé/refusé/impayé` : Réinitialise l'échéance (statut `a_venir`, reglement_id = null)

#### B) Échéance → Règlement

**Quand on marque une échéance comme payée** :
- Ouvre un dialog pour saisir les détails du règlement
- Crée automatiquement un règlement avec :
  - Montant = montant de l'échéance
  - Date = date saisie
  - Moyen = moyen sélectionné
  - Statut = `valide`
- Lie l'échéance au règlement créé

## 🎯 Cas d'Usage

### Scénario 1 : Import initial
```
1. Import CSV avec règlements historiques
2. Clic sur "GÉNÉRER ÉCHÉANCES" dans la page Import
3. ✅ Échéances créées automatiquement et synchronisées
```

### Scénario 2 : Nouveau règlement manuel
```
1. Page Règlements → "AJOUTER RÈGLEMENT"
2. Saisir les détails
3. ✅ Si une échéance non payée existe → marquée automatiquement
```

### Scénario 3 : Marquer une échéance payée
```
1. Page Échéances → Clic sur ✓ (CheckCircle)
2. Dialog : saisir date et moyen de paiement
3. ✅ Règlement créé et lié automatiquement
```

### Scénario 4 : Annulation d'un règlement
```
1. Page Règlements → Modifier statut → "Annulé"
2. ✅ L'échéance liée revient au statut "a_venir"
```

## 🛠️ Edge Functions

### `generer-echeances-auto`
Génère automatiquement toutes les échéances pour tous les dossiers.

**Paramètres** :
```json
{
  "force": false  // true = régénérer même si échéances existent
}
```

**Retour** :
```json
{
  "success": true,
  "dossiersTraites": 150,
  "echeancesGenerees": 450,
  "dossiersAvecEcheances": 120,
  "dossiersIgnores": 30
}
```

### `synchroniser-echeance-reglement`
Synchronise manuellement une échéance et un règlement.

**Actions disponibles** :
```typescript
// Marquer une échéance comme payée
{
  "action": "marquer_payee",
  "echeanceId": "uuid",
  "reglementId": "uuid"
}

// Annuler le paiement d'une échéance
{
  "action": "annuler_paiement",
  "echeanceId": "uuid"
}

// Réinitialiser les échéances lors de la suppression d'un règlement
{
  "action": "supprimer_reglement",
  "reglementId": "uuid"
}
```

## 📊 États des Données

### Échéances
| Statut | Description | Lien règlement |
|--------|-------------|----------------|
| `a_venir` | Échéance future non payée | null |
| `en_retard` | Échéance passée non payée | null |
| `payee` | Échéance payée | ✅ reglement_id |
| `annulee` | Échéance annulée | null |

### Règlements
| Statut | Impact sur échéance |
|--------|---------------------|
| `valide` | Marque l'échéance comme `payee` |
| `impaye` | Réinitialise l'échéance à `a_venir` |
| `annule` | Réinitialise l'échéance à `a_venir` |
| `refuse` | Réinitialise l'échéance à `a_venir` |

## ⚠️ Règles Importantes

1. **Un règlement ne peut être lié qu'à une seule échéance**
2. **Une échéance ne peut être liée qu'à un seul règlement**
3. **Les échéances sans règlement lié sont toujours modifiables**
4. **Supprimer un règlement réinitialise automatiquement son échéance**
5. **Le montant de l'échéance doit correspondre au montant du règlement**

## 🔍 Vérification de la Cohérence

Pour vérifier que tout est synchronisé :

```sql
-- Échéances payées sans règlement lié
SELECT * FROM echeances 
WHERE statut = 'payee' AND reglement_id IS NULL;

-- Règlements valides sans échéance liée
SELECT r.* FROM reglements r
LEFT JOIN echeances e ON e.reglement_id = r.id
WHERE r.statut = 'valide' AND e.id IS NULL;
```

## 🚀 Workflow Recommandé

1. **Import des données historiques** (CSV avec règlements)
2. **Génération automatique des échéances** (bouton dans Import)
3. **Vérification des anomalies** (page Anomalies)
4. **Gestion courante** :
   - Ajout manuel de règlements → sync auto
   - Marquage échéances comme payées → création règlement
   - Modification statut règlement → sync échéance

## 🐛 Dépannage

### Échéances non générées ?
- Vérifier que le dossier a un tarif > 0
- Vérifier que le dossier est en statut `en_cours`
- Cocher "Forcer" pour régénérer

### Règlement sans échéance liée ?
- Normal si échéance n'existe pas encore
- Générer les échéances via le bouton "GÉNÉRER AUTO"

### Échéance payée mais reglement_id null ?
- Ancienne donnée avant synchronisation
- Utiliser l'action "marquer_payee" manuellement
