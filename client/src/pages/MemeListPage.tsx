//梗图库页面
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import MemeDetailModal from '../features/memes/components/MemeDetailModal'
import MemeUploadDrawer from '../features/memes/components/MemeUploadDrawer'
import MemeGrid from '../features/memes/components/MemeGrid'
import MemeSearchBar from '../features/memes/components/MemeSearchBar'
import type { Meme } from '../types/meme'
import AppLayout from '../components/AppLayout'
import { mockMemes } from '../mocks/memes'


function MemeListPage() {
  // URL 搜索参数：负责读取和更新地址栏中的 ?q=关键词。
  const [searchParams, setSearchParams] = useSearchParams()

  // 页面交互状态：当前选中的梗图、上传抽屉是否打开。
  const [selectedMeme, setSelectedMeme] = useState<Meme | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)

  // memes 是当前页面维护的梗图列表，Mock 阶段暂时从 mockMemes 开始。
  const [memes, setMemes] = useState<Meme[]>(mockMemes)

  // inputValue 是搜索框正在输入的内容，避免中文输入法输入过程中 URL 频繁变化。
  const [inputValue, setInputValue] = useState(
    () => searchParams.get('q') ?? '',
  )

  // Mock 加载状态：以后由 TanStack Query 的 isPending 替代。
  const [isLoading, setIsLoading] = useState(true)

  // searchKeyword 是从 URL 读取的最终搜索关键词。
  const searchKeyword = searchParams.get('q') ?? ''

  // Mock 阶段模拟一次初始加载，接入 TanStack Query 后由 query.isPending 接管。
  useEffect(() => {
    const loadingTimer = window.setTimeout(() => {
      setIsLoading(false)
    }, 500)

    return () => window.clearTimeout(loadingTimer)
  }, [])

  // normalizedKeyword 是清除首尾空格并转为小写后的关键词，用于匹配。
  const normalizedKeyword = searchKeyword.trim().toLowerCase()

  // filteredMemes 是根据搜索关键词筛选后，真正交给网格展示的列表。
  const filteredMemes = normalizedKeyword
    ? memes.filter((meme) => {
        // searchableText 汇总标题、描述、OCR 文字和标签，作为统一搜索文本。
        const searchableText = [
          meme.title,
          meme.description,
          meme.ocrText,
          ...meme.tags,
        ]
          .join(' ')
          .toLowerCase()

        return searchableText.includes(normalizedKeyword)
      })
    : memes

  const handleSearch = (nextKeyword: string) => {
    const nextSearchParams = new URLSearchParams(searchParams)

    if (nextKeyword.trim()) {
      nextSearchParams.set('q', nextKeyword)
    } else {
      nextSearchParams.delete('q')
    }

    setSearchParams(nextSearchParams, { replace: true })
  }

  const handleClearSearch = () => {
    setInputValue('')
    handleSearch('')
  }

  const handleUploaded = (meme: Meme) => {
    setMemes((currentMemes) => [meme, ...currentMemes])
  }

  const handleUpdateMeme = (updatedMeme: Meme) => {
    setMemes((currentMemes) =>
      currentMemes.map((meme) =>
        meme.id === updatedMeme.id ? updatedMeme : meme,
      ),
    )
    setSelectedMeme(updatedMeme)
  }

  const handleDeleteMeme = (memeToDelete: Meme) => {
    setMemes((currentMemes) =>
      currentMemes.filter((meme) => meme.id !== memeToDelete.id),
    )
    setSelectedMeme(null)
  }

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

        </div>

        <MemeSearchBar
          value={inputValue}
          onChange={setInputValue}
          onSearch={handleSearch}
          onClear={handleClearSearch}
        />

        <MemeGrid
          memes={filteredMemes}
          loading={isLoading}
          hasSearchKeyword={Boolean(normalizedKeyword)}
          onUpload={() => setUploadOpen(true)}
          onSelect={setSelectedMeme}
          onClearSearch={handleClearSearch}
        />
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
      />
      <MemeUploadDrawer
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={handleUploaded}
      />
    </AppLayout>
  )
}

export default MemeListPage
