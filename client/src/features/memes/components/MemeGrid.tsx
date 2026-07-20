//这个是一个 MemeGrid 组件，用于显示梗图的网格布局。它接收一个梗图数组、上传回调函数和选择回调函数作为属性，并根据梗图数量渲染相应的内容。
import type { Meme } from '../../../types/meme'
import MemeCard from './MemeCard'
import MemeUploadTile from './MemeUploadTile'

type MemeGridProps = {
  memes: Meme[]
  onUpload: () => void
  onSelect: (meme: Meme) => void
}

function MemeGrid({ memes, onUpload, onSelect }: MemeGridProps) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <MemeUploadTile onClick={onUpload} />

      {memes.length > 0 ? (
        memes.map((meme) => (
          <MemeCard
            key={meme.id}
            meme={meme}
            onClick={() => onSelect(meme)}
          />
        ))
      ) : (
        <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
          没有找到匹配的梗图
        </div>
      )}
    </div>
  )
}

export default MemeGrid
