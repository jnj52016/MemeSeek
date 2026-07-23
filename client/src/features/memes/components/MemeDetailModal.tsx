// 梗图详情弹窗，支持查看和编辑梗图信息。
import {
  Alert,
  Button,
  Input,
  message,
  Modal,
  Popconfirm,
  Tag,
} from 'antd'
import { useState } from 'react'
import type { Meme, MemeStatus } from '../../../types/meme'

type MemeDetailModalProps = {
  meme: Meme | null
  open: boolean
  onClose: () => void
  onUpdate: (meme: Meme) => void | Promise<void>
  onDelete: (meme: Meme) => void | Promise<void>
}

// statusText 把梗图状态值转换成详情弹窗中的中文说明。
const statusText: Record<MemeStatus, string> = {
  PROCESSING: '分析中',
  COMPLETED: '分析完成',
  FAILED: '分析失败',
}

function MemeDetailModal({
  meme,
  open,
  onClose,
  onUpdate,
  onDelete,
}: MemeDetailModalProps) {
  // 编辑状态和表单草稿：只在用户点击“编辑信息”后使用。
  const [isEditing, setIsEditing] = useState(false)
  const [draftTitle, setDraftTitle] = useState(meme?.title ?? '')
  const [draftDescription, setDraftDescription] = useState(
    meme?.description ?? '',
  )
  const [draftTags, setDraftTags] = useState<string[]>(meme?.tags ?? [])
  const [newTag, setNewTag] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleStartEditing = () => {
    if (!meme) {
      return
    }

    setDraftTitle(meme.title)
    setDraftDescription(meme.description)
    setDraftTags(meme.tags)
    setNewTag('')
    setIsEditing(true)
  }

  const handleAddTag = (value: string) => {
    const tag = value.trim()

    if (!tag || draftTags.includes(tag)) {
      setNewTag('')
      return
    }

    setDraftTags((currentTags) => [...currentTags, tag])
    setNewTag('')
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setDraftTags((currentTags) =>
      currentTags.filter((tag) => tag !== tagToRemove),
    )
  }

  const handleSave = async () => {
    if (!meme) {
      return
    }

    const title = draftTitle.trim()

    if (!title) {
      message.error('标题不能为空')
      return
    }

    const updatedMeme: Meme = {
      ...meme,
      title,
      description: draftDescription.trim(),
      tags: draftTags,
      updatedAt: new Date().toISOString(),
    }

    setIsSubmitting(true)

    try {
      await onUpdate(updatedMeme)
      setIsEditing(false)
      message.success('梗图信息已更新')
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : '梗图信息更新失败，请稍后重试。',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!meme) {
      return
    }

    setIsSubmitting(true)

    try {
      await onDelete(meme)
      message.success('梗图已删除')
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : '梗图删除失败，请稍后重试。',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      title={isEditing ? '编辑梗图' : meme?.title ?? '梗图详情'}
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
            {isEditing ? (
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-sm text-slate-500">
                    标题
                  </span>
                  <Input
                    value={draftTitle}
                    onChange={(event) => setDraftTitle(event.target.value)}
                    placeholder="请输入梗图标题"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm text-slate-500">
                    描述
                  </span>
                  <Input.TextArea
                    value={draftDescription}
                    onChange={(event) =>
                      setDraftDescription(event.target.value)
                    }
                    placeholder="请输入梗图描述"
                    autoSize={{ minRows: 3, maxRows: 6 }}
                  />
                </label>

                <div>
                  <p className="mb-2 text-sm text-slate-500">标签</p>
                  <div className="mb-3 flex flex-wrap gap-2">
                    {draftTags.map((tag) => (
                      <Tag
                        key={tag}
                        color="orange"
                        closable
                        onClose={() => handleRemoveTag(tag)}
                      >
                        #{tag}
                      </Tag>
                    ))}
                  </div>
                  <Input.Search
                    value={newTag}
                    allowClear
                    enterButton="添加"
                    onChange={(event) => setNewTag(event.target.value)}
                    onSearch={handleAddTag}
                    placeholder="输入新标签"
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <Button onClick={() => setIsEditing(false)}>取消</Button>
                  <Button
                    type="primary"
                    loading={isSubmitting}
                    onClick={handleSave}
                  >
                    保存
                  </Button>
                </div>
              </div>
            ) : (
              <>
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

                <Button onClick={handleStartEditing}>编辑信息</Button>
              </>
            )}

            <div>
              <p className="mb-2 text-sm text-slate-500">AI 分析状态</p>
              <p className="text-sm text-slate-700">
                {statusText[meme.status]}
              </p>
              {meme.status === 'FAILED' && (
                <Alert
                  className="mt-3"
                  type="error"
                  showIcon
                  message={meme.errorMessage ?? 'AI 分析失败，请稍后重试。'}
                />
              )}
            </div>

            {!isEditing && (
              <div className="border-t border-slate-200 pt-4">
                <Popconfirm
                  title="确认删除这张梗图吗？"
                  description="删除后无法恢复。"
                  okText="确认删除"
                  cancelText="取消"
                  okButtonProps={{ danger: true, loading: isSubmitting }}
                  onConfirm={handleConfirmDelete}
                >
                  <Button danger>删除梗图</Button>
                </Popconfirm>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}

export default MemeDetailModal
