//梗图库页面
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import MemeDetailModal from '../features/memes/components/MemeDetailModal'
import MemeUploadDrawer from '../features/memes/components/MemeUploadDrawer'
import MemeGrid from '../features/memes/components/MemeGrid'
import MemeSearchBar from '../features/memes/components/MemeSearchBar'
import type { Meme } from '../types/meme'
import AppLayout from '../components/AppLayout'
import { mockMemes } from '../mocks/memes'


function MemeListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedMeme, setSelectedMeme] = useState<Meme | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [memes, setMemes] = useState<Meme[]>(mockMemes)
  const [inputValue, setInputValue] = useState(
    () => searchParams.get('q') ?? '',
  )
  const searchKeyword = searchParams.get('q') ?? ''

  const normalizedKeyword = searchKeyword.trim().toLowerCase()
  const filteredMemes = normalizedKeyword
    ? memes.filter((meme) => {
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
          onUpload={() => setUploadOpen(true)}
          onSelect={setSelectedMeme}
        />
      </section>
      <MemeDetailModal
        meme={selectedMeme}
        open={selectedMeme !== null}
        onClose={() => setSelectedMeme(null)}
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
