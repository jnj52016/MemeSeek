// AI 设置页面：管理 DeepSeek API Key、模型和推荐标签。
import { useState } from 'react'
import { Button, Input, message, Select, Tag } from 'antd'
import AppLayout from '../components/AppLayout'
import { defaultAiSettings } from '../mocks/ai-settings'
import {
  loadAiSettings,
  saveAiSettings,
} from '../services/ai-settings-storage'
import type { AiSettings } from '../types/ai-settings'

function AiSettingsPage() {
  // 页面状态：settings 保存表单内容，newTag 保存正在输入的新标签。
  const [settings, setSettings] = useState<AiSettings>(() => loadAiSettings())
  const [newTag, setNewTag] = useState('')

  // 标签操作：添加一个新的推荐标签。
  const handleAddTag = (value: string) => {
    const tag = value.trim().replace(/^#/, '')

    if (!tag || settings.recommendedTags.includes(tag)) {
      setNewTag('')
      return
    }

    setSettings((currentSettings) => ({
      ...currentSettings,
      recommendedTags: [...currentSettings.recommendedTags, tag],
    }))
    setNewTag('')
  }

  // 标签操作：删除一个已有的推荐标签。
  const handleRemoveTag = (tagToRemove: string) => {
    setSettings((currentSettings) => ({
      ...currentSettings,
      recommendedTags: currentSettings.recommendedTags.filter(
        (tag) => tag !== tagToRemove,
      ),
    }))
  }

  // 设置操作：把当前表单内容保存到浏览器 localStorage。
  const handleSave = () => {
    saveAiSettings(settings)
    message.success('AI 设置已保存')
  }

  // 设置操作：恢复默认设置，但需要点击保存后才会写入 localStorage。
  const handleReset = () => {
    setSettings(defaultAiSettings)
    setNewTag('')
    message.info('已恢复默认设置，点击保存后生效')
  }

  return (
    <AppLayout>
      {/* 页面标题区域 */}
      <section className="mx-auto max-w-3xl space-y-8">
        <div>
          <p className="mb-2 text-sm font-medium text-orange-600">系统设置</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            DeepSeek AI 设置
          </h1>
          <p className="mt-2 text-slate-500">
            设置 DeepSeek 分析梗图时使用的标签规则和 API Key。
          </p>
        </div>

        {/* AI 设置表单区域 */}
        <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {/* DeepSeek API Key：仅个人本地使用时保存在浏览器中。 */}
          <div>
            <label
              className="mb-2 block text-sm font-medium text-slate-700"
              htmlFor="api-key"
            >
              DeepSeek API Key
            </label>
            <Input.Password
              id="api-key"
              value={settings.apiKey}
              placeholder="请输入 DeepSeek API Key"
              onChange={(event) =>
                setSettings((currentSettings) => ({
                  ...currentSettings,
                  apiKey: event.target.value,
                }))
              }
            />
            <p className="mt-2 text-sm text-amber-600">
              API Key 会保存在当前浏览器中，仅建议个人本地使用。
            </p>
          </div>

          {/* 推荐标签：AI 分析时可以优先参考这些标签。 */}
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">推荐标签</p>
            <div className="mb-3 flex flex-wrap gap-2">
              {settings.recommendedTags.map((tag, index) => (
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

          {/* DeepSeek 模型选择 */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="model">
              DeepSeek 模型
            </label>
            <Select
              id="model"
              className="w-full"
              value={settings.model}
              onChange={(model) =>
                setSettings((currentSettings) => ({
                  ...currentSettings,
                  model,
                }))
              }
              options={[
                { value: 'deepseek-chat', label: 'deepseek-chat' },
                { value: 'deepseek-reasoner', label: 'deepseek-reasoner' },
              ]}
            />
          </div>

          {/* 底部操作：恢复默认和保存设置 */}
          <div className="flex flex-col gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">本地设置</p>
              <p className="mt-1 text-sm text-slate-500">
                保存后，之后调用 DeepSeek 时会使用当前 API Key。
              </p>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleReset}>恢复默认</Button>
              <Button type="primary" onClick={handleSave}>
                保存设置
              </Button>
            </div>
          </div>
        </div>
      </section>
    </AppLayout>
  )
}

export default AiSettingsPage
