import { Alert, Button, message, Popconfirm } from 'antd'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import AppLayout from '../components/AppLayout'
import MemeDetailModal from '../features/memes/components/MemeDetailModal'
import MemeGrid from '../features/memes/components/MemeGrid'
import MemeSearchBar from '../features/memes/components/MemeSearchBar'
import MemeUploadDrawer from '../features/memes/components/MemeUploadDrawer'
import {
  deleteLocalMemeRecord,
  exportLocalLibraryIndex,
  initializeLocalLibrary,
  readLocalMediaFile,
  rebuildLocalLibraryIndex,
  updateLocalMemeAnalysis,
  updateLocalMemeRecord,
  type LocalMemeRecord,
} from '../services/local-library'
import { analyzeLocalMedia } from '../services/local-ai-api'
import { loadAiSettings } from '../services/ai-settings-storage'
import { migrateLegacyLibrary } from '../services/legacy-migration'
import { useLocalLibrary } from '../services/local-library-context'
import { useLocalMemes } from '../services/use-local-memes'
import type { Meme } from '../types/meme'

function MemeListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const library = useLocalLibrary()
  const [records, setRecords] = useState<LocalMemeRecord[]>(library.records)
  const [selectedMeme, setSelectedMeme] = useState<Meme | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [isRescanning, setIsRescanning] = useState(false)
  const [isExportingIndex, setIsExportingIndex] = useState(false)
  const [isRebuildingIndex, setIsRebuildingIndex] = useState(false)
  const [isMigratingLegacy, setIsMigratingLegacy] = useState(false)

  const searchKeyword = searchParams.get('q') ?? ''
  const normalizedKeyword = searchKeyword.trim().toLowerCase()

  const localMemes = useLocalMemes(library, records, normalizedKeyword)

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

  const handleRescan = async () => {
    setIsRescanning(true)

    try {
      const snapshot = await initializeLocalLibrary(library.directory)
      setRecords(snapshot.records)
      message.success(`已同步 ${snapshot.records.length} 个本地素材`)
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : '重新扫描本地素材库失败。',
      )
    } finally {
      setIsRescanning(false)
    }
  }

  const handleExportIndex = async () => {
    setIsExportingIndex(true)

    try {
      const content = await exportLocalLibraryIndex(library.directory)
      const objectUrl = URL.createObjectURL(
        new Blob([content], { type: 'application/json' }),
      )
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = `memeseek-index-backup-${new Date().toISOString().slice(0, 10)}.json`
      link.click()
      URL.revokeObjectURL(objectUrl)
      message.success('索引备份已下载；其中不包含图片或视频文件。')
    } catch (error) {
      message.error(error instanceof Error ? error.message : '导出索引备份失败。')
    } finally {
      setIsExportingIndex(false)
    }
  }

  const handleRebuildIndex = async () => {
    setIsRebuildingIndex(true)

    try {
      const snapshot = await rebuildLocalLibraryIndex(library.directory)
      setRecords(snapshot.records)
      setSelectedMeme(null)
      message.success(`索引已重建，共发现 ${snapshot.records.length} 个本地素材。`)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '重建索引失败。')
    } finally {
      setIsRebuildingIndex(false)
    }
  }

  const handleLegacyMigration = async () => {
    setIsMigratingLegacy(true)

    try {
      const result = await migrateLegacyLibrary(library.directory, records, ({ completed, total, currentTitle }) => {
        message.loading({
          key: 'legacy-migration',
          content: `正在迁移 ${completed}/${total}：${currentTitle}`,
          duration: 0,
        })
      })
      const snapshot = await initializeLocalLibrary(library.directory)
      setRecords(snapshot.records)
      message.success({
        key: 'legacy-migration',
        content: result.failed.length
          ? `已迁移 ${result.migrated} 个素材，${result.failed.length} 个失败。`
          : `已迁移 ${result.migrated} 个旧素材。`,
        duration: 5,
      })
    } catch (error) {
      message.error({
        key: 'legacy-migration',
        content: error instanceof Error ? error.message : '读取旧素材库失败。',
      })
    } finally {
      setIsMigratingLegacy(false)
    }
  }

  const handleUpdateMeme = async (updatedMeme: Meme) => {
    const updatedRecord = await updateLocalMemeRecord(
      library.directory,
      updatedMeme.id,
      {
        title: updatedMeme.title,
        description: updatedMeme.description,
        tags: updatedMeme.tags,
      },
    )
    setRecords((currentRecords) =>
      currentRecords.map((record) =>
        record.id === updatedRecord.id ? updatedRecord : record,
      ),
    )
    setSelectedMeme(updatedMeme)
  }

  const handleDeleteMeme = async (memeToDelete: Meme) => {
    await deleteLocalMemeRecord(library.directory, memeToDelete.id)
    setRecords((currentRecords) =>
      currentRecords.filter((record) => record.id !== memeToDelete.id),
    )
    setSelectedMeme(null)
  }

  const handleAnalyzeMeme = async (memeToAnalyze: Meme) => {
    const record = records.find((item) => item.id === memeToAnalyze.id)

    if (!record) {
      throw new Error('本地索引中找不到这张梗图。')
    }

    const processingRecord = await updateLocalMemeAnalysis(
      library.directory,
      record.id,
      {
        title: record.title,
        description: record.description,
        tags: record.tags,
        ocrText: record.ocrText,
        status: 'PROCESSING',
        errorMessage: undefined,
      },
    )
    setRecords((current) =>
      current.map((item) => (item.id === record.id ? processingRecord : item)),
    )

    try {
      const useThumbnail = Boolean(record.thumbnailRelativePath)
      const file = await readLocalMediaFile(
        library.directory,
        useThumbnail ? record.thumbnailRelativePath! : record.relativePath,
      )
      const settings = loadAiSettings()
      const analysis = await analyzeLocalMedia({
        file,
        sourceMediaType:
          record.mediaType === 'VIDEO'
            ? 'VIDEO_FIRST_FRAME'
            : useThumbnail
              ? 'ANIMATED_IMAGE_FIRST_FRAME'
              : 'IMAGE',
        currentTitle: record.title,
        currentDescription: record.description,
        recommendedTags: settings.recommendedTags,
        baseUrl: settings.analysis.baseUrl,
        model: settings.analysis.model,
        apiKey: settings.analysis.apiKey,
      })
      const completedRecord = await updateLocalMemeAnalysis(
        library.directory,
        record.id,
        { ...analysis, status: 'COMPLETED', errorMessage: undefined },
      )
      setRecords((current) =>
        current.map((item) =>
          item.id === completedRecord.id ? completedRecord : item,
        ),
      )
      const completedMeme = {
        ...memeToAnalyze,
        ...completedRecord,
      }
      setSelectedMeme(completedMeme)
      return completedMeme
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'AI 分析失败，请稍后重试。'
      const failedRecord = await updateLocalMemeAnalysis(
        library.directory,
        record.id,
        {
          title: record.title,
          description: record.description,
          tags: record.tags,
          ocrText: record.ocrText,
          status: 'FAILED',
          errorMessage,
        },
      )
      setRecords((current) =>
        current.map((item) => (item.id === failedRecord.id ? failedRecord : item)),
      )
      const failedMeme = { ...memeToAnalyze, ...failedRecord }
      setSelectedMeme(failedMeme)
      return failedMeme
    }
  }

  const queryErrorMessage = localMemes.error?.message ?? '梗图列表加载失败，请稍后重试。'

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
          <div className="flex flex-wrap gap-2">
            <Button loading={isRescanning} onClick={() => void handleRescan()}>
              重新扫描
            </Button>
            <Button loading={isExportingIndex} onClick={() => void handleExportIndex()}>
              备份索引
            </Button>
            <Popconfirm
              title="确认迁移旧素材？"
              description="将从当前旧后端读取媒体和元数据，复制到此本地素材库；不会删除旧文件或数据库记录。"
              okText="开始迁移"
              cancelText="取消"
              okButtonProps={{ loading: isMigratingLegacy }}
              onConfirm={() => handleLegacyMigration()}
            >
              <Button loading={isMigratingLegacy}>迁移旧素材</Button>
            </Popconfirm>
            <Popconfirm
              title="确认重建本地索引？"
              description="将按当前文件夹中的媒体重新建立索引；标题、标签、OCR 和 AI 分析结果会被清除。建议先备份索引。"
              okText="重建索引"
              cancelText="取消"
              okButtonProps={{ danger: true, loading: isRebuildingIndex }}
              onConfirm={() => handleRebuildIndex()}
            >
              <Button danger loading={isRebuildingIndex}>
                重建索引
              </Button>
            </Popconfirm>
          </div>
        </div>

        <MemeSearchBar
          key={searchKeyword}
          initialValue={searchKeyword}
          onSearch={handleSearch}
          onClear={handleClearSearch}
        />

        {localMemes.error ? (
          <Alert
            type="error"
            showIcon
            message="梗图列表加载失败"
            description={queryErrorMessage}
            action={
              <Button onClick={() => window.location.reload()}>重新加载</Button>
            }
          />
        ) : (
          <MemeGrid
            memes={localMemes.memes}
            loading={localMemes.loading}
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
        onUploaded={(record) => setRecords((currentRecords) => [record, ...currentRecords])}
      />
    </AppLayout>
  )
}

export default MemeListPage
