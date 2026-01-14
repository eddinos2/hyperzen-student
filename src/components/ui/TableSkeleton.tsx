import { Skeleton } from './skeleton';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 5 }: TableSkeletonProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 items-center">
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton key={j} className="h-12 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
