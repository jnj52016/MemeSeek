import type {
  LocalDirectoryHandle,
  LocalFileHandle,
} from './local-library-access'

const INDEX_SCHEMA_VERSION = 1
const INTERNAL_DIRECTORY_NAME = '.memeseek'
const INDEX_FILE_NAME = 'index.json'

const MEDIA_EXTENSIONS = {
  gif: { mediaType: 'IMAGE', mimeType: 'image/gif' },
  jpeg: { mediaType: 'IMAGE', mimeType: 'image/jpeg' },
  jpg: { mediaType: 'IMAGE', mimeType: 'image/jpeg' },
  mov: { mediaType: 'VIDEO', mimeType: 'video/quicktime' },
  mp4: { mediaType: 'VIDEO', mimeType: 'video/mp4' },
  png: { mediaType: 'IMAGE', mimeType: 'image/png' },
  webm: { mediaType: 'VIDEO', mimeType: 'video/webm' },
  webp: { mediaType: 'IMAGE', mimeType: 'image/webp' },
} as const

export type LocalMediaType = 'IMAGE' | 'VIDEO'

export type LocalMemeRecord = {
  id: string
  relativePath: string
  thumbnailRelativePath?: string
  mediaType: LocalMediaType
  mimeType?: string
  title: string
  description: string
  tags: string[]
  ocrText: string
  transcript: string
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED'
  errorMessage?: string
  legacySourceId?: string
  createdAt: string
  updatedAt: string
}

type LocalLibraryIndex = {
  schemaVersion: number
  records: LocalMemeRecord[]
}

export type LocalLibrarySnapshot = {
  directory: LocalDirectoryHandle
  records: LocalMemeRecord[]
  scannedAt: string
}

type ScannedMedia = {
  relativePath: string
  mediaType: LocalMediaType
  mimeType: string
}

export class LocalLibraryIndexError extends Error {}

const writeQueues = new WeakMap<LocalDirectoryHandle, Promise<void>>()

async function runExclusiveWrite<T>(
  directory: LocalDirectoryHandle,
  operation: () => Promise<T>,
) {
  const previous = writeQueues.get(directory) ?? Promise.resolve()
  let release: (() => void) | undefined
  const current = new Promise<void>((resolve) => {
    release = resolve
  })
  writeQueues.set(directory, previous.then(() => current))

  await previous

  try {
    return await operation()
  } finally {
    release?.()
  }
}

function getRequiredDirectoryGetter(directory: LocalDirectoryHandle) {
  if (!directory.getDirectoryHandle) {
    throw new Error('当前浏览器不支持管理本地素材库所需的文件系统功能。')
  }

  return directory.getDirectoryHandle.bind(directory)
}

function getRequiredFileGetter(directory: LocalDirectoryHandle) {
  if (!directory.getFileHandle) {
    throw new Error('当前浏览器不支持管理本地素材库所需的文件系统功能。')
  }

  return directory.getFileHandle.bind(directory)
}

function getRequiredDirectoryValues(directory: LocalDirectoryHandle) {
  if (!directory.values) {
    throw new Error('当前浏览器不支持管理本地素材库所需的文件系统功能。')
  }

  return directory.values.bind(directory)
}

function getRequiredEntryRemover(directory: LocalDirectoryHandle) {
  if (!directory.removeEntry) {
    throw new Error('当前浏览器不支持删除本地素材库文件。')
  }

  return directory.removeEntry.bind(directory)
}

function getExtension(fileName: string) {
  const lastDotIndex = fileName.lastIndexOf('.')

  return lastDotIndex < 0 ? '' : fileName.slice(lastDotIndex + 1).toLowerCase()
}

function getMediaDetails(fileName: string) {
  const extension = getExtension(fileName)

  return MEDIA_EXTENSIONS[extension as keyof typeof MEDIA_EXTENSIONS] ?? null
}

function createRecordId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }

  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function getInitialTitle(relativePath: string) {
  const fileName = relativePath.split('/').at(-1) ?? relativePath
  const extension = getExtension(fileName)

  return extension ? fileName.slice(0, -(extension.length + 1)) : fileName
}

function createInitialRecord(media: ScannedMedia, now: string): LocalMemeRecord {
  return {
    id: createRecordId(),
    relativePath: media.relativePath,
    mediaType: media.mediaType,
    mimeType: media.mimeType,
    title: getInitialTitle(media.relativePath),
    description: '',
    tags: [],
    ocrText: '',
    transcript: '',
    status: 'COMPLETED',
    createdAt: now,
    updatedAt: now,
  }
}

function isRecord(value: unknown): value is LocalMemeRecord {
  if (!value || typeof value !== 'object') {
    return false
  }

  const record = value as Record<string, unknown>

  return (
    typeof record.id === 'string' &&
    typeof record.relativePath === 'string' &&
    (record.mediaType === 'IMAGE' || record.mediaType === 'VIDEO') &&
    typeof record.title === 'string' &&
    typeof record.description === 'string' &&
    Array.isArray(record.tags) &&
    record.tags.every((tag) => typeof tag === 'string') &&
    typeof record.ocrText === 'string' &&
    typeof record.transcript === 'string' &&
    (record.status === 'PROCESSING' ||
      record.status === 'COMPLETED' ||
      record.status === 'FAILED') &&
    typeof record.createdAt === 'string' &&
    typeof record.updatedAt === 'string'
    &&
    (record.legacySourceId === undefined || typeof record.legacySourceId === 'string')
  )
}

function parseIndex(content: string): LocalLibraryIndex {
  if (!content.trim()) {
    return { schemaVersion: INDEX_SCHEMA_VERSION, records: [] }
  }

  let parsed: unknown

  try {
    parsed = JSON.parse(content)
  } catch {
    throw new LocalLibraryIndexError(
      '本地索引文件不是有效 JSON。请先备份 `.memeseek/index.json`，再选择重建索引。',
    )
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new LocalLibraryIndexError('本地索引文件格式不正确。')
  }

  const index = parsed as Record<string, unknown>

  if (index.schemaVersion !== INDEX_SCHEMA_VERSION || !Array.isArray(index.records)) {
    throw new LocalLibraryIndexError('本地索引版本不受支持，无法安全读取。')
  }

  if (!index.records.every(isRecord)) {
    throw new LocalLibraryIndexError('本地索引包含格式不正确的记录，未进行任何覆盖。')
  }

  return {
    schemaVersion: INDEX_SCHEMA_VERSION,
    records: index.records,
  }
}

async function getMetadataDirectory(directory: LocalDirectoryHandle) {
  const getDirectoryHandle = getRequiredDirectoryGetter(directory)

  return getDirectoryHandle(INTERNAL_DIRECTORY_NAME, { create: true })
}

async function getIndexFileHandle(metadataDirectory: LocalDirectoryHandle) {
  const getFileHandle = getRequiredFileGetter(metadataDirectory)

  return getFileHandle(INDEX_FILE_NAME, { create: true })
}

async function writeIndex(
  indexFileHandle: LocalFileHandle,
  index: LocalLibraryIndex,
) {
  if (!indexFileHandle.createWritable) {
    throw new Error('当前浏览器不支持写入本地素材库索引。')
  }

  const writable = await indexFileHandle.createWritable()
  await writable.write(`${JSON.stringify(index, null, 2)}\n`)
  await writable.close()
}

async function readCurrentIndex(directory: LocalDirectoryHandle) {
  const metadataDirectory = await getMetadataDirectory(directory)
  const indexFileHandle = await getIndexFileHandle(metadataDirectory)
  const indexFile = await indexFileHandle.getFile()

  return {
    index: parseIndex(await indexFile.text()),
    indexFileHandle,
  }
}

async function scanDirectory(
  directory: LocalDirectoryHandle,
  prefix = '',
): Promise<ScannedMedia[]> {
  const values = getRequiredDirectoryValues(directory)
  const media: ScannedMedia[] = []

  for await (const entry of values()) {
    if (entry.kind === 'directory') {
      if (!prefix && entry.name === INTERNAL_DIRECTORY_NAME) {
        continue
      }

      media.push(...(await scanDirectory(entry, `${prefix}${entry.name}/`)))
      continue
    }

    const details = getMediaDetails(entry.name)

    if (details) {
      media.push({
        relativePath: `${prefix}${entry.name}`,
        mediaType: details.mediaType,
        mimeType: details.mimeType,
      })
    }
  }

  return media
}

function mergeIndexWithScan(
  index: LocalLibraryIndex,
  scannedMedia: ScannedMedia[],
  now: string,
) {
  const recordsByPath = new Map(
    index.records.map((record) => [record.relativePath, record]),
  )
  const records = scannedMedia
    .sort((left, right) => left.relativePath.localeCompare(right.relativePath))
    .map((media) => {
      const existingRecord = recordsByPath.get(media.relativePath)

      if (!existingRecord) {
        return createInitialRecord(media, now)
      }

      return {
        ...existingRecord,
        mediaType: media.mediaType,
        mimeType: media.mimeType,
      }
    })

  return {
    schemaVersion: INDEX_SCHEMA_VERSION,
    records,
  } satisfies LocalLibraryIndex
}

function hasIndexChanged(current: LocalLibraryIndex, next: LocalLibraryIndex) {
  return JSON.stringify(current) !== JSON.stringify(next)
}

async function initializeLocalLibraryNow(
  directory: LocalDirectoryHandle,
): Promise<LocalLibrarySnapshot> {
  const { index: currentIndex, indexFileHandle } =
    await readCurrentIndex(directory)
  const scannedMedia = await scanDirectory(directory)
  const nextIndex = mergeIndexWithScan(
    currentIndex,
    scannedMedia,
    new Date().toISOString(),
  )

  if (hasIndexChanged(currentIndex, nextIndex)) {
    await writeIndex(indexFileHandle, nextIndex)
  }

  return {
    directory,
    records: nextIndex.records,
    scannedAt: new Date().toISOString(),
  }
}

async function rebuildLocalLibraryIndexNow(directory: LocalDirectoryHandle) {
  const metadataDirectory = await getMetadataDirectory(directory)
  const indexFileHandle = await getIndexFileHandle(metadataDirectory)
  const now = new Date().toISOString()
  const rebuiltIndex: LocalLibraryIndex = {
    schemaVersion: INDEX_SCHEMA_VERSION,
    records: (await scanDirectory(directory))
      .sort((left, right) => left.relativePath.localeCompare(right.relativePath))
      .map((media) => createInitialRecord(media, now)),
  }

  await writeIndex(indexFileHandle, rebuiltIndex)
  return {
    directory,
    records: rebuiltIndex.records,
    scannedAt: now,
  } satisfies LocalLibrarySnapshot
}

async function exportLocalLibraryIndexNow(directory: LocalDirectoryHandle) {
  const { index } = await readCurrentIndex(directory)
  return `${JSON.stringify(index, null, 2)}\n`
}

function splitRelativePath(relativePath: string) {
  const normalizedPath = relativePath.replaceAll('\\', '/')
  const parts = normalizedPath.split('/').filter(Boolean)

  if (
    !parts.length ||
    normalizedPath.startsWith('/') ||
    parts.some((part) => part === '.' || part === '..')
  ) {
    throw new Error('本地媒体路径无效。')
  }

  return parts
}

export async function readLocalMediaFile(
  rootDirectory: LocalDirectoryHandle,
  relativePath: string,
): Promise<File> {
  const pathParts = splitRelativePath(relativePath)
  const fileName = pathParts.pop()

  if (!fileName) {
    throw new Error('本地媒体路径无效。')
  }

  let currentDirectory = rootDirectory

  for (const directoryName of pathParts) {
    const getDirectoryHandle = getRequiredDirectoryGetter(currentDirectory)
    currentDirectory = await getDirectoryHandle(directoryName)
  }

  const getFileHandle = getRequiredFileGetter(currentDirectory)
  const fileHandle = await getFileHandle(fileName)
  return fileHandle.getFile()
}

export async function createLocalMediaObjectUrl(
  rootDirectory: LocalDirectoryHandle,
  relativePath: string,
) {
  const file = await readLocalMediaFile(rootDirectory, relativePath)
  return URL.createObjectURL(file)
}

function createImportedFileName(file: File) {
  const extension = getExtension(file.name)

  if (!getMediaDetails(file.name) || !extension) {
    throw new Error('不支持的媒体文件类型。')
  }

  return `${createRecordId()}.${extension}`
}

async function writeLocalFile(
  directory: LocalDirectoryHandle,
  fileName: string,
  content: Blob,
) {
  const getFileHandle = getRequiredFileGetter(directory)
  const fileHandle = await getFileHandle(fileName, { create: true })

  if (!fileHandle.createWritable) {
    throw new Error('当前浏览器不支持写入本地素材文件。')
  }

  const writable = await fileHandle.createWritable()
  await writable.write(content)
  await writable.close()
}

function createImportedRecord(
  fileName: string,
  file: File,
  thumbnailFileName?: string,
): LocalMemeRecord {
  const details = getMediaDetails(fileName)

  if (!details) {
    throw new Error('不支持的媒体文件类型。')
  }

  const now = new Date().toISOString()
  return {
    id: createRecordId(),
    relativePath: fileName,
    thumbnailRelativePath: thumbnailFileName
      ? `${INTERNAL_DIRECTORY_NAME}/thumbnails/${thumbnailFileName}`
      : undefined,
    mediaType: details.mediaType,
    mimeType: file.type || details.mimeType,
    title: getInitialTitle(file.name),
    description: '',
    tags: [],
    ocrText: '',
    transcript: '',
    status: 'COMPLETED',
    createdAt: now,
    updatedAt: now,
  }
}

async function importLocalMediaNow(
  directory: LocalDirectoryHandle,
  file: File,
  thumbnail?: File,
) {
  const fileName = createImportedFileName(file)
  let thumbnailFileName: string | undefined

  try {
    await writeLocalFile(directory, fileName, file)

    if (thumbnail) {
      const metadataDirectory = await getMetadataDirectory(directory)
      const getDirectoryHandle = getRequiredDirectoryGetter(metadataDirectory)
      const thumbnailsDirectory = await getDirectoryHandle('thumbnails', {
        create: true,
      })
      thumbnailFileName = `${createRecordId()}.jpg`
      await writeLocalFile(thumbnailsDirectory, thumbnailFileName, thumbnail)
    }

    const { index, indexFileHandle } = await readCurrentIndex(directory)
    const record = createImportedRecord(fileName, file, thumbnailFileName)
    await writeIndex(indexFileHandle, {
      ...index,
      records: [record, ...index.records],
    })
    return record
  } catch (error) {
    await removeRelativeFile(directory, fileName).catch(() => undefined)

    if (thumbnailFileName) {
      await removeRelativeFile(
        directory,
        `${INTERNAL_DIRECTORY_NAME}/thumbnails/${thumbnailFileName}`,
      ).catch(() => undefined)
    }

    throw error
  }
}

async function updateLocalMemeRecordNow(
  directory: LocalDirectoryHandle,
  id: string,
  update: Pick<LocalMemeRecord, 'title' | 'description' | 'tags'>,
) {
  const { index, indexFileHandle } = await readCurrentIndex(directory)
  const recordIndex = index.records.findIndex((record) => record.id === id)

  if (recordIndex < 0) {
    throw new Error('本地索引中找不到这张梗图。')
  }

  const records = [...index.records]
  const updatedRecord: LocalMemeRecord = {
    ...records[recordIndex],
    ...update,
    updatedAt: new Date().toISOString(),
  }
  records[recordIndex] = updatedRecord
  await writeIndex(indexFileHandle, { ...index, records })
  return updatedRecord
}

async function updateLocalMemeAnalysisNow(
  directory: LocalDirectoryHandle,
  id: string,
  update: Pick<
    LocalMemeRecord,
    'title' | 'description' | 'tags' | 'ocrText' | 'status' | 'errorMessage'
  >,
) {
  const { index, indexFileHandle } = await readCurrentIndex(directory)
  const recordIndex = index.records.findIndex((record) => record.id === id)

  if (recordIndex < 0) {
    throw new Error('本地索引中找不到这张梗图。')
  }

  const records = [...index.records]
  const updatedRecord: LocalMemeRecord = {
    ...records[recordIndex],
    ...update,
    updatedAt: new Date().toISOString(),
  }
  records[recordIndex] = updatedRecord
  await writeIndex(indexFileHandle, { ...index, records })
  return updatedRecord
}

async function updateLocalMemeMetadataNow(
  directory: LocalDirectoryHandle,
  id: string,
  update: Pick<
    LocalMemeRecord,
    | 'title'
    | 'description'
    | 'tags'
    | 'ocrText'
    | 'transcript'
    | 'status'
    | 'errorMessage'
    | 'legacySourceId'
  >,
) {
  const { index, indexFileHandle } = await readCurrentIndex(directory)
  const recordIndex = index.records.findIndex((record) => record.id === id)

  if (recordIndex < 0) {
    throw new Error('本地索引中找不到待迁移的素材。')
  }

  const records = [...index.records]
  const updatedRecord: LocalMemeRecord = {
    ...records[recordIndex],
    ...update,
    updatedAt: new Date().toISOString(),
  }
  records[recordIndex] = updatedRecord
  await writeIndex(indexFileHandle, { ...index, records })
  return updatedRecord
}

async function removeRelativeFile(
  rootDirectory: LocalDirectoryHandle,
  relativePath: string,
) {
  const pathParts = splitRelativePath(relativePath)
  const entryName = pathParts.pop()

  if (!entryName) {
    throw new Error('本地媒体路径无效。')
  }

  let directory = rootDirectory

  for (const directoryName of pathParts) {
    const getDirectoryHandle = getRequiredDirectoryGetter(directory)
    directory = await getDirectoryHandle(directoryName)
  }

  const removeEntry = getRequiredEntryRemover(directory)
  await removeEntry(entryName)
}

async function deleteLocalMemeRecordNow(
  directory: LocalDirectoryHandle,
  id: string,
) {
  const { index, indexFileHandle } = await readCurrentIndex(directory)
  const record = index.records.find((item) => item.id === id)

  if (!record) {
    throw new Error('本地索引中找不到这张梗图。')
  }

  await removeRelativeFile(directory, record.relativePath)

  if (record.thumbnailRelativePath) {
    await removeRelativeFile(directory, record.thumbnailRelativePath).catch(
      () => undefined,
    )
  }

  await writeIndex(indexFileHandle, {
    ...index,
    records: index.records.filter((item) => item.id !== id),
  })
}

export function initializeLocalLibrary(directory: LocalDirectoryHandle) {
  return runExclusiveWrite(directory, () => initializeLocalLibraryNow(directory))
}

/** Exports metadata only; media files remain in the user-selected directory. */
export function exportLocalLibraryIndex(directory: LocalDirectoryHandle) {
  return runExclusiveWrite(directory, () => exportLocalLibraryIndexNow(directory))
}

/**
 * Recreates the index from files in the directory. Existing titles, tags,
 * OCR and AI status are deliberately discarded, so callers must ask the user
 * to export a backup first.
 */
export function rebuildLocalLibraryIndex(directory: LocalDirectoryHandle) {
  return runExclusiveWrite(directory, () => rebuildLocalLibraryIndexNow(directory))
}

export function importLocalMedia(
  directory: LocalDirectoryHandle,
  file: File,
  thumbnail?: File,
) {
  return runExclusiveWrite(directory, () =>
    importLocalMediaNow(directory, file, thumbnail),
  )
}

export function updateLocalMemeRecord(
  directory: LocalDirectoryHandle,
  id: string,
  update: Pick<LocalMemeRecord, 'title' | 'description' | 'tags'>,
) {
  return runExclusiveWrite(directory, () =>
    updateLocalMemeRecordNow(directory, id, update),
  )
}

export function updateLocalMemeAnalysis(
  directory: LocalDirectoryHandle,
  id: string,
  update: Pick<
    LocalMemeRecord,
    'title' | 'description' | 'tags' | 'ocrText' | 'status' | 'errorMessage'
  >,
) {
  return runExclusiveWrite(directory, () =>
    updateLocalMemeAnalysisNow(directory, id, update),
  )
}

export function updateLocalMemeMetadata(
  directory: LocalDirectoryHandle,
  id: string,
  update: Pick<
    LocalMemeRecord,
    | 'title'
    | 'description'
    | 'tags'
    | 'ocrText'
    | 'transcript'
    | 'status'
    | 'errorMessage'
    | 'legacySourceId'
  >,
) {
  return runExclusiveWrite(directory, () =>
    updateLocalMemeMetadataNow(directory, id, update),
  )
}

export function deleteLocalMemeRecord(
  directory: LocalDirectoryHandle,
  id: string,
) {
  return runExclusiveWrite(directory, () =>
    deleteLocalMemeRecordNow(directory, id),
  )
}
