# Design System HyperZen

Composants réutilisables pour maintenir la cohérence de l'interface.

## 📦 Composants

### DataTable
Table unifiée avec tri, pagination, sélection et états de chargement.

```tsx
import { DataTable, Column } from '@/components/design-system';

const columns: Column<Student>[] = [
  { key: 'nom', label: 'Nom', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  { 
    key: 'statut', 
    label: 'Statut',
    render: (item) => <Badge>{item.statut}</Badge>
  },
];

<DataTable
  data={students}
  columns={columns}
  isLoading={isLoading}
  currentPage={page}
  totalPages={totalPages}
  onPageChange={setPage}
  onSort={handleSort}
  selectable
  selectedIds={selectedIds}
  onSelectionChange={setSelectedIds}
  emptyState={{
    icon: '📚',
    title: 'Aucun élève',
    description: 'Commencez par importer vos données'
  }}
/>
```

### BulkActions
Barre d'actions pour les sélections multiples.

```tsx
import { BulkActions, BulkAction } from '@/components/design-system';
import { Trash, Mail, Edit } from 'lucide-react';

const actions: BulkAction[] = [
  {
    label: 'Supprimer',
    icon: Trash,
    onClick: handleDelete,
    variant: 'danger'
  },
  {
    label: 'Envoyer email',
    icon: Mail,
    onClick: handleEmail,
    variant: 'default'
  }
];

<BulkActions
  selectedCount={selectedIds.size}
  onClearSelection={() => setSelectedIds(new Set())}
  actions={actions}
  totalCount={totalStudents}
/>
```

### AdvancedFilterBar
Barre de filtres avancés avec recherche et filtres combinés.

```tsx
import { AdvancedFilterBar } from '@/components/design-system';

<AdvancedFilterBar
  searchValue={search}
  onSearchChange={setSearch}
  filters={[
    {
      key: 'status',
      label: 'Statut',
      value: statusFilter,
      options: [
        { value: 'all', label: 'Tous' },
        { value: 'active', label: 'Actif' },
        { value: 'inactive', label: 'Inactif' }
      ]
    }
  ]}
  onFilterChange={(key, value) => {
    if (key === 'status') setStatusFilter(value);
  }}
  onResetFilters={() => {
    setStatusFilter('all');
  }}
/>
```

### EmptyState
États vides cohérents pour toute l'application.

```tsx
import { EmptyState } from '@/components/design-system';

<EmptyState
  icon="📭"
  title="Aucune donnée"
  description="Commencez par créer votre premier élément"
  size="lg"
  action={
    <Button onClick={handleCreate}>
      Créer maintenant
    </Button>
  }
/>
```

### QuickActions
Bouton d'actions rapides flottant (FAB).

```tsx
import { QuickActions, QuickAction } from '@/components/design-system';
import { Plus, Upload, Download } from 'lucide-react';

const actions: QuickAction[] = [
  {
    label: 'Nouveau',
    icon: Plus,
    onClick: handleCreate,
    shortcut: 'Ctrl+N',
    color: 'bg-green-400'
  },
  {
    label: 'Importer',
    icon: Upload,
    onClick: handleImport,
    shortcut: 'Ctrl+I',
    color: 'bg-blue-400'
  }
];

<QuickActions
  actions={actions}
  position="bottom-right"
/>
```

## 🎨 Principes du Design System

### 1. Style "Brutal"
- Bordures épaisses (4px): `border-4 border-black`
- Ombres portées: `shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`
- Coins arrondis: `rounded-2xl`
- Typographie: `font-black` pour les titres, `font-bold` pour le corps

### 2. Couleurs Sémantiques
Toujours utiliser les tokens du design system:
- `bg-primary` - Jaune principal
- `bg-secondary` - Cyan
- `bg-accent` - Rose
- `bg-muted` - Gris clair
- `text-primary` - Noir
- `text-muted-foreground` - Gris foncé

### 3. Responsive Design
- Mobile first: `text-sm sm:text-base lg:text-xl`
- Grid responsive: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- Masquer sur mobile: `hidden sm:block`
- Afficher uniquement mobile: `block sm:hidden`

### 4. Interactions
- Hover: `hover:bg-yellow-50 transition-colors`
- Active: `active:translate-y-[2px]`
- Focus: `focus:ring-4 focus:ring-primary`
- Disabled: `disabled:opacity-50 disabled:cursor-not-allowed`

## 📝 Guidelines d'Utilisation

### DO ✅
- Utiliser DataTable pour toutes les listes paginées
- Utiliser BulkActions quand selectedCount > 0
- Utiliser EmptyState pour tous les états vides
- Utiliser AdvancedFilterBar pour les filtres combinés
- Garder les actions cohérentes (même icône = même action)

### DON'T ❌
- Ne pas créer de tables custom, utiliser DataTable
- Ne pas dupliquer le code de pagination
- Ne pas utiliser des couleurs hardcodées (text-white, bg-blue-500)
- Ne pas ignorer le responsive design
- Ne pas oublier les états de chargement

## 🚀 Migration

Pour migrer une page existante vers le Design System:

1. **Remplacer la table**:
```tsx
// Avant
<table>...</table>

// Après
<DataTable columns={columns} data={data} />
```

2. **Ajouter les filtres**:
```tsx
<AdvancedFilterBar {...filterProps} />
```

3. **Ajouter les actions bulk**:
```tsx
{selectedIds.size > 0 && (
  <BulkActions {...bulkProps} />
)}
```

4. **État vide**:
```tsx
// Avant
{data.length === 0 && <div>Aucune donnée</div>}

// Après
<EmptyState icon="📭" title="Aucune donnée" />
```

## 🔧 Personnalisation

Tous les composants acceptent des classes Tailwind via `className` pour la personnalisation:

```tsx
<DataTable
  className="custom-class"
  rowClassName={(item) => item.important ? 'bg-red-50' : ''}
/>
```

## 📚 Exemples Complets

Voir les pages suivantes pour des exemples d'implémentation:
- `/src/pages/Reglements.tsx` - DataTable + Filtres
- `/src/pages/Eleves.tsx` - DataTable + Sélection + Filtres avancés
- `/src/pages/Echeances.tsx` - BulkActions + EmptyState
