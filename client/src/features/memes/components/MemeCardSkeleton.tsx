// 梗图卡片的加载占位，避免数据加载时页面突然跳动。
function MemeCardSkeleton() {
  return (
    <div
      aria-label="正在加载梗图"
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="h-44 animate-pulse bg-slate-200" />
      <div className="space-y-3 p-4">
        <div className="h-5 w-3/4 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100" />
      </div>
    </div>
  )
}

export default MemeCardSkeleton
