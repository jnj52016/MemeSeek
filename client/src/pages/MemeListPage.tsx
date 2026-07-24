import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Button } from 'antd'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import AppLayout from '../components/AppLayout'
import MemeDetailModal from '../features/memes/components/MemeDetailModal'
import MemeGrid from '../features/memes/components/MemeGrid'
import MemeSearchBar from '../features/memes/components/MemeSearchBar'
import MemeUploadDrawer from '../features/memes/components/MemeUploadDrawer'
import { memesApi, type UpdateMemeInput } from '../services/api-client'
import { loadAiSettings } from '../services/ai-settings-storage'
import type { Meme } from '../types/meme'

type UpdateMemeVariables = {
  id: string
  body: UpdateMemeInput
}

function MemeListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const [selectedMeme, setSelectedMeme] = useState<Meme | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)

  const searchKeyword = searchParams.get('q') ?? ''
  const normalizedKeyword = searchKeyword.trim().toLowerCase()

  const memesQuery = useQuery({
    queryKey: ['memes', normalizedKeyword],
    queryFn: () =>
      memesApi.list(
        normalizedKeyword ? { q: normalizedKeyword } : undefined,
      ),
  })

  const updateMemeMutation = useMutation({
    mutationFn: ({ id, body }: UpdateMemeVariables) =>
      memesApi.update(id, body),
    onSuccess: async (updatedMeme) => {
      setSelectedMeme(updatedMeme)
      await queryClient.invalidateQueries({ queryKey: ['memes'] })
    },
  })

  const deleteMemeMutation = useMutation({
    mutationFn: (id: string) => memesApi.remove(id),
    onSuccess: async () => {
      setSelectedMeme(null)
      await queryClient.invalidateQueries({ queryKey: ['memes'] })
    },
  })

  const handleSearch = (nextKeyword: string) => {
    const nextSearchParams = new URLSearchParams(searchParams)

    if (nextKeyword.trim()) {
      nextSearchParams.set('q', nextKeyword.trim())
    } else {
      nextSearchParams.delete('q')
    }

    setSearchParams(nextSearchParams, { replace: true })
  }

  const handleClearSearch = () => {
    handleSearch('')
  }

  const handleUpdateMeme = async (updatedMeme: Meme) => {
    await updateMemeMutation.mutateAsync({
      id: updatedMeme.id,
      body: {
        title: updatedMeme.title,
        description: updatedMeme.description,
        tags: updatedMeme.tags,
      },
    })
  }

  const handleDeleteMeme = async (memeToDelete: Meme) => {
    await deleteMemeMutation.mutateAsync(memeToDelete.id)
  }

  const handleAnalyzeMeme = async (memeToAnalyze: Meme) => {
    const aiSettings = loadAiSettings()

    if (!aiSettings.analysis.apiKey.trim()) {
      throw new Error('请先在 AI 设置中配置 AI API Key。')
    }

    const analyzedMeme = await memesApi.analyze(memeToAnalyze.id, {
      apiKey: aiSettings.analysis.apiKey.trim(),
      model: aiSettings.analysis.model,
      recommendedTags: aiSettings.recommendedTags,
    })

    setSelectedMeme(analyzedMeme)
    await queryClient.invalidateQueries({ queryKey: ['memes'] })
    return analyzedMeme
  }

  const memes: Meme[] = memesQuery.data?.items ?? []
  const queryErrorMessage =
    memesQuery.error instanceof Error
      ? memesQuery.error.message
      : '梗图列表加载失败，请稍后重试。'

  return (
    <AppLayout>
      <section className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-sm font-medium text-orange-600">
              我的梗图库
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              找到合适的梗图
            </h1>
            <p className="mt-2 text-slate-500">
              搜索、整理和管理你的梗图素材。
            </p>
          </div>
        </div>

        <MemeSearchBar
          key={searchKeyword}
          initialValue={searchKeyword}
          onSearch={handleSearch}
          onClear={handleClearSearch}
        />

        {memesQuery.isError ? (
          <Alert
            type="error"
            showIcon
            message="梗图列表加载失败"
            description={queryErrorMessage}
            action={
              <Button onClick={() => void memesQuery.refetch()}>重试</Button>
            }
          />
        ) : (
          <MemeGrid
            memes={memes}
            loading={memesQuery.isPending}
            hasSearchKeyword={Boolean(normalizedKeyword)}
            onUpload={() => setUploadOpen(true)}
            onSelect={setSelectedMeme}
            onClearSearch={handleClearSearch}
          />
        )}
      </section>

      <MemeDetailModal
        key={
          selectedMeme
            ? `${selectedMeme.id}-${selectedMeme.updatedAt}`
            : 'empty'
        }
        meme={selectedMeme}
        open={selectedMeme !== null}
        onClose={() => setSelectedMeme(null)}
        onUpdate={handleUpdateMeme}
        onDelete={handleDeleteMeme}
        onAnalyze={handleAnalyzeMeme}
      />

      <MemeUploadDrawer
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={() => {
          void queryClient.invalidateQueries({ queryKey: ['memes'] })
        }}
      />
    </AppLayout>
  )
}

export default MemeListPage
