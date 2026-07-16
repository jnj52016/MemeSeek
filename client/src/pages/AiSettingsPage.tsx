//AI设置页面

import { useState } from 'react'
import { Button, Input, Select, Tag } from 'antd'
import AppLayout from '../components/AppLayout'

function AiSettingsPage() {
  const [tags, setTags] = useState(['猫', '动物', '表情', '吐槽', '日常'])
  const [newTag, setNewTag] = useState('')

  const handleAddTag = (value: string) => {
    const tag = value.trim().replace(/^#/, '')

    if (!tag || tags.includes(tag)) {
      return
    }

    setTags((currentTags) => [...currentTags, tag])
    setNewTag('')
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags((currentTags) =>
      currentTags.filter((tag) => tag !== tagToRemove),
    )
  }

  return (
    <AppLayout>
      <section className="mx-auto max-w-3xl space-y-8">
        <div>
          <p className="mb-2 text-sm font-medium text-orange-600">系统设置</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            AI 提示词设置
          </h1>
          <p className="mt-2 text-slate-500">
            设置 AI 分析梗图时使用的提示词和标签规则。
          </p>
        </div>

        <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="prompt">
              分析提示词
            </label>
            <Input.TextArea
              id="prompt"
              rows={6}
              defaultValue="请识别这张梗图的情绪、主体和使用场景，生成简短中文标题、描述、OCR 文字和相关标签。"
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">推荐标签</p>
            <div className="mb-3 flex flex-wrap gap-2">
              {tags.map((tag, index) => (
                <Tag
                  key={tag}
                  closable
                  color={['orange', 'blue', 'green', 'purple', 'gold'][index % 5]}
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
              placeholder="输入新标签并按回车"
              onChange={(event) => setNewTag(event.target.value)}
              onSearch={handleAddTag}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="model">
              AI 模型
            </label>
            <Select
              id="model"
              className="w-full"
              defaultValue="gemini-2.5-flash"
              options={[
                { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
                { value: 'other-multimodal-model', label: '其他多模态模型' },
              ]}
            />
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-5">
            <span className="text-sm text-slate-500">API Key：已配置</span>
            <Button type="primary">保存设置</Button>
          </div>
        </div>
      </section>
    </AppLayout>
  )
}

export default AiSettingsPage
