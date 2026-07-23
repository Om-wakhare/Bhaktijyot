export function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-stone-100 shadow-sm">
      <div className="aspect-square shimmer-bg" />
      <div className="p-4 space-y-2.5">
        <div className="h-3.5 rounded-full shimmer-bg w-3/4" />
        <div className="h-3 rounded-full shimmer-bg w-1/2" />
        <div className="flex justify-between items-center pt-1">
          <div className="h-4 rounded-full shimmer-bg w-16" />
          <div className="h-7 w-7 rounded-full shimmer-bg" />
        </div>
      </div>
    </div>
  );
}
