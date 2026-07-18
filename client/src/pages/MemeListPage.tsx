//梗图库页面
import { useState } from 'react'
import MemeDetailModal from '../features/memes/components/MemeDetailModal'
import type { Meme } from '../types/meme'
import { Button, Input } from 'antd'
import AppLayout from '../components/AppLayout'
import { mockMemes } from '../mocks/memes'


function MemeListPage() {
  const [selectedMeme, setSelectedMeme] = useState<Meme | null>(null)
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

          <Button type="primary" size="large">
            上传梗图
          </Button>
        </div>

        <Input.Search
          size="large"
          allowClear
          placeholder="搜索梗图名称或标签"
          aria-label="搜索梗图名称或标签"
        />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <button
            type="button"
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            <span className="mb-3 text-4xl font-light">+</span>
            <span className="font-medium">上传梗图</span>
          </button>

          {mockMemes.map((meme) => (
            <button
              key={meme.id}
              type="button"
              onClick={() => setSelectedMeme(meme)}
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
          ))}
        </div>
      </section>
      <MemeDetailModal
        meme={selectedMeme}
        open={selectedMeme !== null}
        onClose={() => setSelectedMeme(null)}
      />
    </AppLayout>
  )
}

export default MemeListPage
