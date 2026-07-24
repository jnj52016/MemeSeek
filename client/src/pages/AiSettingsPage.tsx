import { useState } from 'react'
import { Button, Input, message, Switch, Tag } from 'antd'
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
  idPrefix: string
  title: string
  description: string
  settings: AiProviderSettings
  modelPlaceholder: string
  modelHelp: string
  disabled?: boolean
  onChange: (settings: AiProviderSettings) => void
}

function AiProviderCard({
  idPrefix,
  title,
  description,
  settings,
  modelPlaceholder,
  modelHelp,
  disabled = false,
  onChange,
}: AiProviderCardProps) {
  return (
    <section className="space-y-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>

      <div>
        <label
          className="mb-2 block text-sm font-medium text-slate-700"
          htmlFor={`${idPrefix}-base-url`}
        >
          API 地址
        </label>
        <Input
          id={`${idPrefix}-base-url`}
          value={settings.baseUrl}
          disabled={disabled}
          placeholder="例如 https://api.openai.com/v1"
          onChange={(event) =>
            onChange({ ...settings, baseUrl: event.target.value })
          }
        />
        <p className="mt-2 text-sm text-slate-500">
          填写 OpenAI 兼容接口的 Base URL，不要包含 /chat/completions。
        </p>
      </div>

      <div>
        <label
          className="mb-2 block text-sm font-medium text-slate-700"
          htmlFor={`${idPrefix}-api-key`}
        >
          OpenAI API Key
        </label>
        <Input.Password
          id={`${idPrefix}-api-key`}
          value={settings.apiKey}
          disabled={disabled}
          placeholder="请输入 OpenAI API Key"
          onChange={(event) =>
            onChange({ ...settings, apiKey: event.target.value })
          }
        />
      </div>

      <div>
        <label
          className="mb-2 block text-sm font-medium text-slate-700"
          htmlFor={`${idPrefix}-model`}
        >
          模型名称
        </label>
        <Input
          id={`${idPrefix}-model`}
          value={settings.model}
          disabled={disabled}
          placeholder={modelPlaceholder}
          onChange={(event) =>
            onChange({ ...settings, model: event.target.value })
          }
        />
        <p className="mt-2 text-sm text-slate-500">{modelHelp}</p>
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
    saveAiSettings(settings)
    message.success('AI 设置已保存')
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
            分别配置图片分析和内容生成使用的 OpenAI 模型。API Key 只保存在当前浏览器中。
          </p>
        </div>

        <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <AiProviderCard
            title="分析 AI"
            description="负责识别梗图、OCR，并生成标题、描述和标签。当前上传和重新分析流程使用此配置。"
            idPrefix="analysis-ai"
            settings={settings.analysis}
            modelPlaceholder="例如 gpt-4o"
            modelHelp="模型需要支持图片输入；默认使用 gpt-4o。"
            onChange={(analysis) => updateSettings({ analysis })}
          />

          <AiProviderCard
            title="内容 AI"
            description="预留给文案改写、自然语言搜索和批量内容生成等文本功能。"
            idPrefix="content-ai"
            settings={settings.content}
            modelPlaceholder="例如 gpt-4o-mini"
            modelHelp="当前版本尚未调用内容 AI；配置会保存在本地，供后续功能使用。"
            disabled={settings.useAnalysisForContent}
            onChange={(content) => updateSettings({ content })}
          />

          <div className="rounded-xl border border-orange-100 bg-orange-50 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-slate-800">
                  内容 AI 使用分析 AI 配置
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  适合分析和内容生成使用同一个 OpenAI 账号时开启。
                </p>
              </div>
              <Switch
                checked={settings.useAnalysisForContent}
                onChange={(useAnalysisForContent) =>
                  updateSettings({ useAnalysisForContent })
                }
              />
            </div>
          </div>

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
                两套配置都会保存到浏览器 localStorage，不会写入数据库。
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
