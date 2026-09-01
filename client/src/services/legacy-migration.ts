import { memesApi, resolveMemeMediaUrl, type Meme } from './api-client'
import {
  importLocalMedia,
  updateLocalMemeMetadata,
  type LocalMemeRecord,
} from './local-library'
import type { LocalDirectoryHandle } from './local-library-access'

export type LegacyMigrationProgress = {
  completed: number
  total: number
  currentTitle: string
}

export type LegacyMigrationResult = {
  migrated: number
  failed: Array<{ title: string; reason: string }>
}

async function downloadMedia(url: string, fallbackName: string) {
  const response = await fetch(resolveMemeMediaUrl(url))

  if (!response.ok) {
    throw new Error(`无法读取旧媒体文件（HTTP ${response.status}）。`)
  }

  const blob = await response.blob()
  const pathName = new URL(resolveMemeMediaUrl(url), window.location.origin)
    .pathname.split('/')
    .at(-1)
  return new File([blob], pathName || fallbackName, { type: blob.type })
}

async function loadAllLegacyMemes() {
  const items: Meme[] = []
  let page = 1
  const pageSize = 100

  while (true) {
    const response = await memesApi.list({ page, pageSize })
    items.push(...response.items)

    if (items.length >= response.total) {
      return items
    }

    page += 1
  }
}

export async function migrateLegacyLibrary(
  directory: LocalDirectoryHandle,
  existingRecords: LocalMemeRecord[],
  onProgress?: (progress: LegacyMigrationProgress) => void,
): Promise<LegacyMigrationResult> {
  const legacyMemes = await loadAllLegacyMemes()
  const result: LegacyMigrationResult = { migrated: 0, failed: [] }
  const migratedSourceIds = new Set(
    existingRecords.flatMap((record) =>
      record.legacySourceId ? [record.legacySourceId] : [],
    ),
  )

  for (const [index, legacyMeme] of legacyMemes.entries()) {
    onProgress?.({
      completed: index,
      total: legacyMemes.length,
      currentTitle: legacyMeme.title || legacyMeme.id,
    })

    if (migratedSourceIds.has(legacyMeme.id)) {
      continue
    }

    try {
      const [media, thumbnail] = await Promise.all([
        downloadMedia(legacyMeme.imageUrl, `legacy-${legacyMeme.id}`),
        legacyMeme.thumbnailUrl
          ? downloadMedia(legacyMeme.thumbnailUrl, `legacy-${legacyMeme.id}-thumbnail.jpg`)
          : Promise.resolve(undefined),
      ])
      const record = await importLocalMedia(directory, media, thumbnail)
      await updateLocalMemeMetadata(directory, record.id, {
        title: legacyMeme.title,
        description: legacyMeme.description,
        tags: legacyMeme.tags,
        ocrText: legacyMeme.ocrText,
        transcript: legacyMeme.transcript,
        status: legacyMeme.status,
        errorMessage: legacyMeme.errorMessage ?? undefined,
        legacySourceId: legacyMeme.id,
      })
      result.migrated += 1
      migratedSourceIds.add(legacyMeme.id)
    } catch (error) {
      result.failed.push({
        title: legacyMeme.title || legacyMeme.id,
        reason: error instanceof Error ? error.message : '未知迁移错误。',
      })
    }
  }

  onProgress?.({
    completed: legacyMemes.length,
    total: legacyMemes.length,
    currentTitle: '',
  })
  return result
}
