//梗图库页面

import { Button, Input } from 'antd'
import AppLayout from '../components/AppLayout'

const mockMemes = [
  { title: '猫猫震惊', color: 'from-blue-500 to-orange-400', emoji: '😳' },
  { title: '今天也要努力', color: 'from-orange-400 to-amber-300', emoji: '💪' },
  { title: '这合理吗', color: 'from-emerald-500 to-teal-300', emoji: '🤨' },
]

function MemeListPage() {
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
            className="flex min-h-56 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-orange-300 bg-orange-50 text-orange-700 transition hover:bg-orange-100"
          >
            <span className="mb-3 text-4xl font-light">+</span>
            <span className="font-medium">上传梗图</span>
          </button>

          {mockMemes.map((meme) => (
            <button
              key={meme.title}
              type="button"
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div
                className={`flex h-44 items-center justify-center bg-gradient-to-br ${meme.color} text-6xl`}
              >
                {meme.emoji}
              </div>
              <div className="p-4">
                <p className="font-semibold text-slate-900">{meme.title}</p>
                <p className="mt-1 text-sm text-slate-500">点击查看详情</p>
              </div>
            </button>
          ))}
        </div>
      </section>
    </AppLayout>
  )
}

export default MemeListPage
