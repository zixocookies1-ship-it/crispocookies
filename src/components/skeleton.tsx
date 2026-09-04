export function ProductCardSkeleton() {
  return (
    <div className="bg-surface rounded-2xl shadow-warm overflow-hidden animate-pulse">
      <div className="aspect-square bg-gray-200" />
      <div className="p-4 space-y-3">
        <div className="flex gap-2">
          <div className="h-5 w-16 bg-gray-200 rounded-full" />
        </div>
        <div className="h-5 w-3/4 bg-gray-200 rounded" />
        <div className="h-4 w-full bg-gray-200 rounded" />
        <div className="h-4 w-2/3 bg-gray-200 rounded" />
        <div className="flex items-center justify-between pt-2">
          <div className="h-6 w-20 bg-gray-200 rounded" />
          <div className="h-9 w-9 bg-gray-200 rounded-full" />
        </div>
        <div className="h-10 w-full bg-gray-200 rounded-full" />
      </div>
    </div>
  );
}

export function TableSkeleton({
  rows = 5,
  cols = 4,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="w-full animate-pulse space-y-3">
      <div className="flex gap-4 pb-3 border-b border-gray-200">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-4 flex-1 bg-gray-200 rounded" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="flex gap-4">
          {Array.from({ length: cols }).map((_, colIdx) => (
            <div key={colIdx} className="h-4 flex-1 bg-gray-200 rounded" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function StatsCardSkeleton() {
  return (
    <div className="bg-surface rounded-2xl shadow-warm p-6 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 w-24 bg-gray-200 rounded" />
        <div className="h-10 w-10 bg-gray-200 rounded-xl" />
      </div>
      <div className="h-8 w-32 bg-gray-200 rounded mb-2" />
      <div className="h-3 w-20 bg-gray-200 rounded" />
    </div>
  );
}
