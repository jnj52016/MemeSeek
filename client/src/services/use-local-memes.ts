import { useEffect, useRef, useState } from 'react'
import {
  createLocalMediaObjectUrl,
  type LocalLibrarySnapshot,
  type LocalMemeRecord,
} from './local-library'
import type { Meme } from '../types/meme'

type LocalMemeListState = {
  loading: boolean
  memes: Meme[]
  error: Error | null
}

function toMeme(
  record: LocalMemeRecord,
  imageUrl: string,
  thumbnailUrl: string | null,
): Meme {
  return {
    id: record.id,
    imageUrl,
    thumbnailUrl,
    mediaType: record.mediaType,
    mimeType: record.mimeType ?? null,
    duration: null,
    title: record.title,
    description: record.description,
    tags: record.tags,
    ocrText: record.ocrText,
    transcript: record.transcript,
    status: record.status,
    errorMessage: record.errorMessage ?? null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }
}

export function useLocalMemes(
  library: LocalLibrarySnapshot,
  records: LocalMemeRecord[],
  searchKeyword: string,
) {
  const urlsRef = useRef(new Map<string, string>())
  const [state, setState] = useState<LocalMemeListState>({
    loading: true,
    memes: [],
    error: null,
  })

  useEffect(() => {
    const objectUrls = urlsRef.current

    return () => {
      for (const objectUrl of objectUrls.values()) {
        URL.revokeObjectURL(objectUrl)
      }
      objectUrls.clear()
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const normalizedKeyword = searchKeyword.trim().toLowerCase()
    const matchingRecords = records
      .filter((record) => {
        if (!normalizedKeyword) {
          return true
        }

        return [
          record.title,
          record.description,
          record.ocrText,
          record.transcript,
          ...record.tags,
        ].some((value) => value.toLowerCase().includes(normalizedKeyword))
      })
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))

    queueMicrotask(() => {
      if (!cancelled) {
        setState((current) => ({ ...current, loading: true, error: null }))
      }
    })

    void Promise.all(
      matchingRecords.map(async (record) => {
        const mediaKey = `media:${record.relativePath}`
        let imageUrl = urlsRef.current.get(mediaKey)

        if (!imageUrl) {
          imageUrl = await createLocalMediaObjectUrl(
            library.directory,
            record.relativePath,
          )
          urlsRef.current.set(mediaKey, imageUrl)
        }

        let thumbnailUrl: string | null = null

        if (record.thumbnailRelativePath) {
          const thumbnailKey = `thumbnail:${record.thumbnailRelativePath}`
          thumbnailUrl = urlsRef.current.get(thumbnailKey) ?? null

          if (!thumbnailUrl) {
            thumbnailUrl = await createLocalMediaObjectUrl(
              library.directory,
              record.thumbnailRelativePath,
            )
            urlsRef.current.set(thumbnailKey, thumbnailUrl)
          }
        }

        return toMeme(record, imageUrl, thumbnailUrl)
      }),
    )
      .then((memes) => {
        if (!cancelled) {
          setState({ loading: false, memes, error: null })
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            loading: false,
            memes: [],
            error:
              error instanceof Error
                ? error
                : new Error('无法读取本地素材文件。'),
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [library, records, searchKeyword])

  return state
}
