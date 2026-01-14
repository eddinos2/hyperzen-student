import { ReactNode } from 'react';
import { X, LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface BulkAction {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  variant?: 'default' | 'danger' | 'success' | 'warning';
  disabled?: boolean;
}

interface BulkActionsProps {
  selectedCount: number;
  onClearSelection: () => void;
  actions: BulkAction[];
  totalCount?: number;
}

export const BulkActions = ({
  selectedCount,
  onClearSelection,
  actions,
  totalCount,
}: BulkActionsProps) => {
  if (selectedCount === 0) return null;

  const getVariantClasses = (variant: BulkAction['variant']) => {
    switch (variant) {
      case 'danger':
        return 'bg-red-500 text-white hover:bg-red-600';
      case 'success':
        return 'bg-green-500 text-white hover:bg-green-600';
      case 'warning':
        return 'bg-yellow-400 text-black hover:bg-yellow-500';
      default:
        return 'bg-cyan-400 text-black hover:bg-cyan-500';
    }
  };

  return (
    <div className="brutal-card p-4 mb-6 bg-gradient-to-r from-primary/20 to-primary/10 border-2 border-primary">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Info sélection */}
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-full bg-primary border-2 border-black flex items-center justify-center font-black text-lg">
            {selectedCount}
          </div>
          <div>
            <p className="font-black text-base sm:text-lg">
              {selectedCount} élément{selectedCount > 1 ? 's' : ''} sélectionné{selectedCount > 1 ? 's' : ''}
            </p>
            {totalCount && (
              <p className="text-sm font-bold text-muted-foreground">
                sur {totalCount} au total
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {actions.map((action, index) => (
            <Button
              key={index}
              onClick={action.onClick}
              disabled={action.disabled}
              className={`brutal-button h-10 px-4 flex items-center gap-2 text-sm ${getVariantClasses(action.variant)}`}
            >
              <action.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{action.label}</span>
            </Button>
          ))}

          {/* Bouton effacer sélection */}
          <Button
            onClick={onClearSelection}
            className="brutal-button bg-white h-10 px-3 border-2 border-black hover:bg-red-50"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline ml-2">Annuler</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
