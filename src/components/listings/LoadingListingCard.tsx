export function LoadingListingCard() {
  return (
    <div className="rounded-lg border shadow-sm p-4">
      <div className="space-y-3">
        <div className="h-48 bg-muted animate-pulse rounded"></div>
        <div className="space-y-2">
          <div className="h-4 bg-muted animate-pulse rounded w-3/4"></div>
          <div className="h-4 bg-muted animate-pulse rounded w-1/2"></div>
          <div className="h-4 bg-muted animate-pulse rounded w-2/3"></div>
        </div>
      </div>
    </div>
  );
} 