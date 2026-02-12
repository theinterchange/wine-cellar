export function SkeletonBox({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded-xl ${className}`} />;
}

export function SkeletonStatCard() {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 text-center space-y-2">
      <SkeletonBox className="h-7 w-12 mx-auto rounded-lg" />
      <SkeletonBox className="h-3 w-16 mx-auto rounded-lg" />
    </div>
  );
}

export function SkeletonWineCard() {
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="flex">
        <SkeletonBox className="w-24 h-28 flex-shrink-0 rounded-none" />
        <div className="flex-1 p-4 space-y-2.5">
          <SkeletonBox className="h-5 w-3/4 rounded-lg" />
          <SkeletonBox className="h-3 w-1/2 rounded-lg" />
          <SkeletonBox className="h-5 w-20 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonWineDetail() {
  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      <SkeletonBox className="h-4 w-16 rounded-lg" />
      <SkeletonBox className="w-full h-72 rounded-2xl" />
      <SkeletonBox className="h-8 w-2/3 rounded-lg" />
      <div className="flex gap-2">
        <SkeletonBox className="h-8 w-20 rounded-full" />
        <SkeletonBox className="h-8 w-16 rounded-full" />
        <SkeletonBox className="h-8 w-24 rounded-full" />
      </div>
      <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
        <SkeletonBox className="h-5 w-32 rounded-lg" />
        <SkeletonBox className="h-5 w-24 rounded-full" />
        <SkeletonBox className="h-2 w-full rounded-full" />
      </div>
      <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
        <SkeletonBox className="h-5 w-40 rounded-lg" />
        <SkeletonBox className="h-9 w-16 rounded-lg" />
        <SkeletonBox className="h-3 w-full rounded-lg" />
      </div>
    </div>
  );
}
