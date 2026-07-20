// 这个是一个 MemeCard 组件，用于显示单个 meme 的信息，包括图片和标题。用户可以点击卡片查看详情。
import type { Meme } from '../../../types/meme'

type MemeCardProps = {
  meme: Meme
  onClick: () => void
}

function MemeCard({ meme, onClick }: MemeCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md"
    >
      <img
        src={meme.imageUrl}
        alt={meme.title}
        className="h-44 w-full object-cover"
      />

      <div className="p-4">
        <p className="font-semibold text-slate-900">{meme.title}</p>
        <p className="mt-1 text-sm text-slate-500">点击查看详情</p>
      </div>
    </button>
  )
}

export default MemeCard
