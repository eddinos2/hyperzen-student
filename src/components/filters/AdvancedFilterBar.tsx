import { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AdvancedFilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  filters: FilterConfig[];
  onFilterChange: (filterKey: string, value: string) => void;
  onResetFilters: () => void;
}

interface FilterConfig {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  value: string;
}

export const AdvancedFilterBar = ({
  searchValue,
  onSearchChange,
  filters,
  onFilterChange,
  onResetFilters,
}: AdvancedFilterBarProps) => {
  const [showFilters, setShowFilters] = useState(false);
  
  const hasActiveFilters = filters.some(f => f.value !== 'all');

  return (
    <div className="brutal-card p-4 sm:p-6 mb-6 space-y-4">
      {/* Barre de recherche principale */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Rechercher par nom, prénom, email..."
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-14 pl-12 pr-4 text-lg font-bold border-4 border-black rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary"
          />
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={() => setShowFilters(!showFilters)}
            className={`brutal-button h-14 px-6 flex items-center gap-2 ${
              hasActiveFilters ? 'bg-primary' : 'bg-white'
            }`}
          >
            <Filter className="w-5 h-5" />
            <span className="hidden sm:inline">FILTRES</span>
            {hasActiveFilters && (
              <span className="ml-1 px-2 py-1 bg-black text-white rounded-lg text-xs font-black">
                {filters.filter(f => f.value !== 'all').length}
              </span>
            )}
          </Button>
          
          {hasActiveFilters && (
            <Button
              onClick={onResetFilters}
              className="brutal-button bg-red-100 h-14 px-4"
            >
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Filtres avancés (collapsible) */}
      {showFilters && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pt-4 border-t-4 border-black">
          {filters.map((filter) => (
            <div key={filter.key} className="space-y-2">
              <label className="text-sm font-black uppercase text-muted-foreground">
                {filter.label}
              </label>
              <Select
                value={filter.value}
                onValueChange={(value) => onFilterChange(filter.key, value)}
              >
                <SelectTrigger className="brutal-select h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="brutal-card">
                  {filter.options.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      className="font-bold"
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
