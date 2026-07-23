//这个是一个 MemeGrid 组件，用于显示梗图的网格布局。它接收一个梗图数组、上传回调函数和选择回调函数作为属性，并根据梗图数量渲染相应的内容。
import { Button } from 'antd'
import type { Meme } from '../../../types/meme'
import MemeCard from './MemeCard'
import MemeCardSkeleton from './MemeCardSkeleton'
import MemeUploadTile from './MemeUploadTile'

type MemeGridProps = {
  memes: Meme[]
  loading: boolean
  hasSearchKeyword: boolean
  onUpload: () => void
  onSelect: (meme: Meme) => void
  onClearSearch: () => void
}

function MemeGrid({
  // memes 是筛选后的梗图列表，不一定等于全部梗图。
  memes,
  // loading 为 true 时显示 Skeleton，不显示真实卡片。
  loading,
  // hasSearchKeyword 用来区分“暂无梗图”和“搜索无结果”。
  hasSearchKeyword,
  // 下面三个回调由页面传入，组件只负责触发，不负责修改页面数据。
  onUpload,
  onSelect,
  onClearSearch,
}: MemeGridProps) {
  return (
    <div
      aria-busy={loading}
      className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
    >
      <MemeUploadTile onClick={onUpload} />

      {loading ? (
        Array.from({ length: 7 }, (_, index) => (
          <MemeCardSkeleton key={index} />
        ))
      ) : memes.length > 0 ? (
        memes.map((meme) => (
          <MemeCard
            key={meme.id}
            meme={meme}
            onClick={() => onSelect(meme)}
          />
        ))
      ) : (
        <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="font-medium text-slate-700">
            {hasSearchKeyword ? '没有找到匹配的梗图' : '暂时还没有梗图'}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {hasSearchKeyword
              ? '试试其他关键词，或者清空搜索条件。'
              : '点击上方的加号，上传你的第一张梗图。'}
          </p>
          {hasSearchKeyword && (
            <Button type="link" onClick={onClearSearch}>
              清空搜索
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

export default MemeGrid
