//这个页面是梗图详情弹窗，展示梗图的标题、标签、描述和AI分析状态等信息。
import { Modal, Tag } from 'antd'
import type { Meme, MemeStatus } from '../../../types/meme'

//梗图详情弹窗组件的属性类型定义
type MemeDetailModalProps = {
  meme: Meme | null
  open: boolean
  onClose: () => void
}

// 定义不同状态对应的文字描述
const statusText: Record<MemeStatus, string> = {
  PROCESSING: '分析中',
  COMPLETED: '分析完成',
  FAILED: '分析失败',
}

//梗图详情弹窗组件
function MemeDetailModal({
  meme,
  open,
  onClose,
}: MemeDetailModalProps) {
  return (
    <Modal
      title={meme?.title ?? '梗图详情'}
      open={open}
      onCancel={onClose}
      footer={null}
      width={720}
    >
      {meme && (
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_240px]">
          <img
            src={meme.imageUrl}
            alt={meme.title}
            className="max-h-[520px] w-full rounded-xl object-contain"
          />

          <div className="space-y-5">
            <div>
              <p className="mb-2 text-sm text-slate-500">标题</p>
              <p className="text-lg font-semibold text-slate-900">
                {meme.title}
              </p>
            </div>

            <div>
              <p className="mb-2 text-sm text-slate-500">标签</p>
              <div className="flex flex-wrap gap-2">
                {meme.tags.map((tag) => (
                  <Tag key={tag} color="orange">
                    #{tag}
                  </Tag>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm text-slate-500">描述</p>
              <p className="text-sm leading-6 text-slate-700">
                {meme.description || '暂无描述'}
              </p>
            </div>

            <div>
              <p className="mb-2 text-sm text-slate-500">AI 分析状态</p>
              <p className="text-sm text-slate-700">
                {statusText[meme.status]}
              </p>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}

export default MemeDetailModal