import { ReactNode, useState } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, LucideIcon } from 'lucide-react';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { EmptyState } from './EmptyState';

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (item: T) => ReactNode;
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  isLoading?: boolean;
  emptyState?: {
    icon: string;
    title: string;
    description?: string;
  };
  // Pagination
  currentPage?: number;
  totalPages?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  // Tri
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (column: string) => void;
  // Actions
  onRowClick?: (item: T) => void;
  rowClassName?: (item: T) => string;
  // Sélection
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  getItemId?: (item: T) => string;
}

export function DataTable<T>({
  data,
  columns,
  isLoading,
  emptyState,
  currentPage = 1,
  totalPages = 1,
  pageSize = 25,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [25, 50, 100],
  sortBy,
  sortDirection,
  onSort,
  onRowClick,
  rowClassName,
  selectable,
  selectedIds = new Set(),
  onSelectionChange,
  getItemId = (item: any) => item.id,
}: DataTableProps<T>) {
  const [selectAll, setSelectAll] = useState(false);

  const handleSelectAll = () => {
    if (selectAll) {
      onSelectionChange?.(new Set());
      setSelectAll(false);
    } else {
      const allIds = new Set(data.map(getItemId));
      onSelectionChange?.(allIds);
      setSelectAll(true);
    }
  };

  const handleSelectRow = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    onSelectionChange?.(newSelection);
    setSelectAll(newSelection.size === data.length);
  };

  const renderSortIcon = (columnKey: string) => {
    if (!onSort) return null;
    
    if (sortBy === columnKey) {
      return sortDirection === 'asc' ? (
        <ArrowUp className="h-4 w-4" />
      ) : (
        <ArrowDown className="h-4 w-4" />
      );
    }
    return <ArrowUpDown className="h-4 w-4 opacity-50" />;
  };

  if (isLoading) {
    return (
      <div className="brutal-card overflow-hidden">
        <TableSkeleton rows={pageSize} columns={columns.length} />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return emptyState ? (
      <EmptyState
        icon={emptyState.icon}
        title={emptyState.title}
        description={emptyState.description}
      />
    ) : null;
  }

  return (
    <>
      <div className="brutal-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-black text-white">
              <tr>
                {selectable && (
                  <th className="px-4 lg:px-6 py-3 lg:py-4 w-12">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={handleSelectAll}
                      className="w-5 h-5 rounded border-2 border-white cursor-pointer"
                    />
                  </th>
                )}
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={`px-4 lg:px-6 py-3 lg:py-4 text-left font-black text-sm lg:text-lg uppercase tracking-wide ${
                      column.sortable && onSort
                        ? 'cursor-pointer hover:bg-gray-800 transition-colors'
                        : ''
                    } ${column.headerClassName || ''}`}
                    onClick={() => column.sortable && onSort?.(column.key)}
                  >
                    <div className="flex items-center gap-2">
                      {column.label}
                      {column.sortable && renderSortIcon(column.key)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y-2 divide-black">
              {data.map((item) => {
                const itemId = getItemId(item);
                const isSelected = selectedIds.has(itemId);
                
                return (
                  <tr
                    key={itemId}
                    className={`hover:bg-yellow-50 transition-colors ${
                      onRowClick ? 'cursor-pointer' : ''
                    } ${rowClassName?.(item) || ''}`}
                    onClick={() => onRowClick?.(item)}
                  >
                    {selectable && (
                      <td
                        className="px-4 lg:px-6 py-3 lg:py-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(itemId)}
                          className="w-5 h-5 rounded border-2 border-black cursor-pointer"
                        />
                      </td>
                    )}
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={`px-4 lg:px-6 py-3 lg:py-4 ${column.className || ''}`}
                      >
                        {column.render
                          ? column.render(item)
                          : (item as any)[column.key]}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm sm:text-base">Afficher:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
              className="brutal-input h-10 px-3 text-sm sm:text-base"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
          
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => onPageChange?.(Math.max(1, currentPage - 1))}
                  className={
                    currentPage === 1
                      ? 'pointer-events-none opacity-50'
                      : 'cursor-pointer'
                  }
                />
              </PaginationItem>
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <PaginationItem key={i}>
                    <PaginationLink
                      onClick={() => onPageChange?.(pageNum)}
                      isActive={currentPage === pageNum}
                      className="cursor-pointer"
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}

              <PaginationItem>
                <PaginationNext
                  onClick={() =>
                    onPageChange?.(Math.min(totalPages, currentPage + 1))
                  }
                  className={
                    currentPage === totalPages
                      ? 'pointer-events-none opacity-50'
                      : 'cursor-pointer'
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </>
  );
}
