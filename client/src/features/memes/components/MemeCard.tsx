// 这个是一个 MemeCard 组件，用于显示单个 meme 的信息，包括图片和标题。用户可以点击卡片查看详情。
import { Tag } from 'antd'
import { resolveMemeMediaUrl } from '../../../services/api-client'
import type { Meme } from '../../../types/meme'

type MemeCardProps = {
  meme: Meme
  onClick: () => void
}

// statusConfig 把后端状态值转换成卡片上展示的文字和颜色。
const statusConfig = {
  PROCESSING: { label: '分析中', color: 'blue' },
  COMPLETED: { label: '分析完成', color: 'green' },
  FAILED: { label: '分析失败', color: 'red' },
} as const

function MemeCard({ meme, onClick }: MemeCardProps) {
  const imageSource = meme.thumbnailUrl || meme.imageUrl

  return (
    <button
      type="button"
      onClick={onClick}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md"
    >
      {meme.mediaType === 'VIDEO' ? (
        <video
          src={resolveMemeMediaUrl(meme.imageUrl)}
          poster={
            meme.thumbnailUrl
              ? resolveMemeMediaUrl(meme.thumbnailUrl)
              : undefined
          }
          aria-label={meme.title}
          muted
          playsInline
          preload="metadata"
          className="h-44 w-full bg-slate-950 object-cover"
        />
      ) : (
        <img
          src={resolveMemeMediaUrl(imageSource)}
          alt={meme.title}
          loading="lazy"
          className="h-44 w-full object-cover"
        />
      )}

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-slate-900">{meme.title}</p>
          <Tag color={statusConfig[meme.status].color}>
            {statusConfig[meme.status].label}
          </Tag>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {meme.mediaType === 'VIDEO'
            ? '视频素材 · 点击查看详情'
            : meme.thumbnailUrl
              ? '动图素材 · 点击查看详情'
              : '点击查看详情'}
        </p>
      </div>
    </button>
  )
}

export default MemeCard
