//梗图库页面
import { useState } from 'react'
import MemeCard from '../features/memes/components/MemeCard'
import MemeDetailModal from '../features/memes/components/MemeDetailModal'
import MemeUploadDrawer from '../features/memes/components/MemeUploadDrawer'
import MemeUploadTile from '../features/memes/components/MemeUploadTile'
import type { Meme } from '../types/meme'
import { Input } from 'antd'
import AppLayout from '../components/AppLayout'
import { mockMemes } from '../mocks/memes'


function MemeListPage() {
  const [selectedMeme, setSelectedMeme] = useState<Meme | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [memes, setMemes] = useState<Meme[]>(mockMemes)

  const handleUploaded = (meme: Meme) => {
    setMemes((currentMemes) => [meme, ...currentMemes])
  }

  return (
    <AppLayout>
      <section className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-sm font-medium text-orange-600">我的梗图库</p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              找到合适的梗图
            </h1>
            <p className="mt-2 text-slate-500">
              搜索、整理和管理你的梗图素材。
            </p>
          </div>

        </div>

        <Input.Search
          size="large"
          allowClear
          placeholder="搜索梗图名称或标签"
          aria-label="搜索梗图名称或标签"
        />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <MemeUploadTile onClick={() => setUploadOpen(true)} />

          {memes.map((meme) => (
            <MemeCard
              key={meme.id}
              meme={meme}
              onClick={() => setSelectedMeme(meme)}
            />
          ))}
        </div>
      </section>
      <MemeDetailModal
        meme={selectedMeme}
        open={selectedMeme !== null}
        onClose={() => setSelectedMeme(null)}
      />
      <MemeUploadDrawer
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={handleUploaded}
      />
    </AppLayout>
  )
}

export default MemeListPage
