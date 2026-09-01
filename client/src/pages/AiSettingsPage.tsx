import { useState } from 'react'
import { Alert, Button, Input, message, Tag } from 'antd'
import AppLayout from '../components/AppLayout'
import { defaultAiSettings } from '../mocks/ai-settings'
import {
  loadAiSettings,
  saveAiSettings,
} from '../services/ai-settings-storage'
import type {
  AiProviderSettings,
  AiSettings,
} from '../types/ai-settings'

type AiProviderCardProps = {
  settings: AiProviderSettings
  onChange: (settings: AiProviderSettings) => void
}

function AiProviderCard({
  settings,
  onChange,
}: AiProviderCardProps) {
  return (
    <section className="space-y-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">DeepSeek 图片分析</h2>
        <p className="mt-1 text-sm text-slate-500">
          负责识别梗图、OCR，并生成标题、描述和标签。
        </p>
      </div>

      <div>
        <label
          className="mb-2 block text-sm font-medium text-slate-700"
          htmlFor="deepseek-base-url"
        >
          API 地址
        </label>
        <Input
          id="deepseek-base-url"
          value={settings.baseUrl}
          disabled
        />
        <p className="mt-2 text-sm text-slate-500">
          已固定为 DeepSeek 官方 API，无需修改。
        </p>
      </div>

      <div>
        <label
          className="mb-2 block text-sm font-medium text-slate-700"
          htmlFor="deepseek-api-key"
        >
          DeepSeek API Key
        </label>
        <Input.Password
          id="deepseek-api-key"
          value={settings.apiKey}
          placeholder="请输入在 DeepSeek 开放平台创建的 API Key"
          onChange={(event) =>
            onChange({ ...settings, apiKey: event.target.value })
          }
        />
      </div>

      <div>
        <label
          className="mb-2 block text-sm font-medium text-slate-700"
          htmlFor="deepseek-model"
        >
          模型名称
        </label>
        <Input
          id="deepseek-model"
          value={settings.model}
          disabled
        />
        <p className="mt-2 text-sm text-slate-500">
          已固定为 DeepSeek 官方图片理解模型。
        </p>
      </div>
    </section>
  )
}

function cloneDefaultSettings(): AiSettings {
  return {
    analysis: { ...defaultAiSettings.analysis },
    content: { ...defaultAiSettings.content },
    useAnalysisForContent: defaultAiSettings.useAnalysisForContent,
    recommendedTags: [...defaultAiSettings.recommendedTags],
  }
}

function AiSettingsPage() {
  const [settings, setSettings] = useState<AiSettings>(() => loadAiSettings())
  const [newTag, setNewTag] = useState('')

  const updateSettings = (next: Partial<AiSettings>) => {
    setSettings((currentSettings) => ({ ...currentSettings, ...next }))
  }

  const handleAddTag = (value: string) => {
    const tag = value.trim().replace(/^#/, '')

    if (!tag || settings.recommendedTags.includes(tag)) {
      setNewTag('')
      return
    }

    updateSettings({
      recommendedTags: [...settings.recommendedTags, tag],
    })
    setNewTag('')
  }

  const handleRemoveTag = (tagToRemove: string) => {
    updateSettings({
      recommendedTags: settings.recommendedTags.filter(
        (tag) => tag !== tagToRemove,
      ),
    })
  }

  const handleSave = () => {
    const deepSeekSettings = {
      ...settings,
      analysis: {
        ...defaultAiSettings.analysis,
        apiKey: settings.analysis.apiKey.trim(),
      },
      content: {
        ...defaultAiSettings.content,
        apiKey: settings.analysis.apiKey.trim(),
      },
      useAnalysisForContent: true,
    }
    setSettings(deepSeekSettings)
    saveAiSettings(deepSeekSettings)
    message.success('DeepSeek 设置已保存')
  }

  const handleReset = () => {
    setSettings(cloneDefaultSettings())
    setNewTag('')
    message.info('已恢复默认设置，点击保存后生效')
  }

  return (
    <AppLayout>
      <section className="mx-auto max-w-3xl space-y-8">
        <div>
          <p className="mb-2 text-sm font-medium text-orange-600">系统设置</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            AI 设置
          </h1>
          <p className="mt-2 text-slate-500">
            MemeSeek 仅使用 DeepSeek 官方图片模型。你只需要填写 DeepSeek API Key，密钥只保存在当前浏览器中。
          </p>
        </div>

        <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <AiProviderCard
            settings={settings.analysis}
            onChange={(analysis) => updateSettings({ analysis })}
          />

          <Alert
            type="info"
            showIcon
            message="这里只能使用 DeepSeek"
            description="API 地址和视觉模型已经自动配置。旧的 OpenAI、Modcon 或其他服务设置会被清除，请填写 DeepSeek 开放平台创建的 API Key。"
          />

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

          <div className="flex flex-col gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">本地设置</p>
              <p className="mt-1 text-sm text-slate-500">
                DeepSeek API Key 保存在浏览器 localStorage，不会写入服务器数据库。
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
