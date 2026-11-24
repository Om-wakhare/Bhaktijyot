/** Loading placeholder shaped like a ProductCard (same .bj-card surface). */
export function SkeletonCard() {
  return (
    <div className="bj-card flex flex-col" aria-hidden="true">
      <div className="aspect-square shimmer-bg" />
      <div className="p-3 space-y-2.5">
        <div className="h-3 rounded-full shimmer-bg" />
        <div className="h-3 rounded-full shimmer-bg w-2/3" />
        <div className="h-4 rounded-full shimmer-bg w-1/2" />
        <div className="h-8 rounded-md shimmer-bg mt-1" />
      </div>
    </div>
  );
}
