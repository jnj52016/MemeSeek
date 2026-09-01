const DATABASE_NAME = 'memeseek-local-library'
const DATABASE_VERSION = 1
const STORE_NAME = 'settings'
const DIRECTORY_HANDLE_KEY = 'directory-handle'

export type DirectoryPermissionMode = 'read' | 'readwrite'

export type LocalFileHandle = {
  kind: 'file'
  name: string
  getFile: () => Promise<File>
  createWritable?: () => Promise<{
    write: (data: string | Blob) => Promise<void>
    close: () => Promise<void>
  }>
}

export type LocalDirectoryHandle = {
  kind?: 'directory'
  name: string
  queryPermission: (descriptor?: {
    mode?: DirectoryPermissionMode
  }) => Promise<PermissionState>
  requestPermission: (descriptor?: {
    mode?: DirectoryPermissionMode
  }) => Promise<PermissionState>
  values?: () => AsyncIterable<LocalDirectoryHandle | LocalFileHandle>
  getDirectoryHandle?: (
    name: string,
    options?: { create?: boolean },
  ) => Promise<LocalDirectoryHandle>
  getFileHandle?: (
    name: string,
    options?: { create?: boolean },
  ) => Promise<LocalFileHandle>
  removeEntry?: (
    name: string,
    options?: { recursive?: boolean },
  ) => Promise<void>
}

type DirectoryPickerWindow = Window & {
  showDirectoryPicker?: (options?: {
    id?: string
    mode?: DirectoryPermissionMode
  }) => Promise<LocalDirectoryHandle>
}

export type LocalLibraryAccessState =
  | { kind: 'checking' }
  | { kind: 'ready'; directory: LocalDirectoryHandle }
  | { kind: 'needs-selection' }
  | { kind: 'needs-permission'; directory: LocalDirectoryHandle }
  | { kind: 'unsupported'; reason: 'insecure-context' | 'browser' }
  | { kind: 'error'; message: string }

function getBrowserWindow(): DirectoryPickerWindow | null {
  if (typeof window === 'undefined') {
    return null
  }

  return window as DirectoryPickerWindow
}

function getSupportState(): Extract<
  LocalLibraryAccessState,
  { kind: 'unsupported' }
> | null {
  const browserWindow = getBrowserWindow()

  if (!browserWindow || !browserWindow.isSecureContext) {
    return { kind: 'unsupported', reason: 'insecure-context' }
  }

  if (!browserWindow.showDirectoryPicker || !browserWindow.indexedDB) {
    return { kind: 'unsupported', reason: 'browser' }
  }

  return null
}

function openDatabase(): Promise<IDBDatabase> {
  const browserWindow = getBrowserWindow()

  if (!browserWindow?.indexedDB) {
    return Promise.reject(new Error('当前浏览器无法使用 IndexedDB。'))
  }

  return new Promise((resolve, reject) => {
    const request = browserWindow.indexedDB.open(DATABASE_NAME, DATABASE_VERSION)

    request.addEventListener('upgradeneeded', () => {
      const database = request.result

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME)
      }
    })
    request.addEventListener('success', () => resolve(request.result))
    request.addEventListener('error', () => {
      reject(request.error ?? new Error('无法打开本地设置数据库。'))
    })
  })
}

async function readStoredDirectory(): Promise<LocalDirectoryHandle | null> {
  const database = await openDatabase()

  try {
    return await new Promise<LocalDirectoryHandle | null>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readonly')
      const request = transaction.objectStore(STORE_NAME).get(DIRECTORY_HANDLE_KEY)

      request.addEventListener('success', () => {
        resolve((request.result as LocalDirectoryHandle | undefined) ?? null)
      })
      request.addEventListener('error', () => {
        reject(request.error ?? new Error('无法读取已保存的素材库目录。'))
      })
    })
  } finally {
    database.close()
  }
}

async function saveDirectory(directory: LocalDirectoryHandle): Promise<void> {
  const database = await openDatabase()

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite')
      transaction.objectStore(STORE_NAME).put(directory, DIRECTORY_HANDLE_KEY)
      transaction.addEventListener('complete', () => resolve())
      transaction.addEventListener('abort', () => {
        reject(transaction.error ?? new Error('无法保存素材库目录。'))
      })
      transaction.addEventListener('error', () => {
        reject(transaction.error ?? new Error('无法保存素材库目录。'))
      })
    })
  } finally {
    database.close()
  }
}

function toAccessState(
  directory: LocalDirectoryHandle,
  permission: PermissionState,
): LocalLibraryAccessState {
  if (permission === 'granted') {
    return { kind: 'ready', directory }
  }

  if (permission === 'prompt') {
    return { kind: 'needs-permission', directory }
  }

  return { kind: 'needs-selection' }
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return ''
  }

  return error instanceof Error && error.message ? error.message : fallback
}

export async function inspectStoredDirectory(): Promise<LocalLibraryAccessState> {
  const unsupported = getSupportState()

  if (unsupported) {
    return unsupported
  }

  try {
    const directory = await readStoredDirectory()

    if (!directory) {
      return { kind: 'needs-selection' }
    }

    const permission = await directory.queryPermission({ mode: 'readwrite' })
    return toAccessState(directory, permission)
  } catch (error) {
    return {
      kind: 'error',
      message: getErrorMessage(error, '无法恢复之前选择的素材库目录。'),
    }
  }
}

export async function selectLocalLibrary(): Promise<LocalLibraryAccessState> {
  const unsupported = getSupportState()

  if (unsupported) {
    return unsupported
  }

  try {
    const directory = await getBrowserWindow()!.showDirectoryPicker!({
      id: 'memeseek-library',
      mode: 'readwrite',
    })
    const permission = await directory.queryPermission({ mode: 'readwrite' })

    if (permission !== 'granted') {
      return toAccessState(directory, permission)
    }

    await saveDirectory(directory)
    return { kind: 'ready', directory }
  } catch (error) {
    const message = getErrorMessage(error, '无法选择素材库目录。')
    return message ? { kind: 'error', message } : { kind: 'needs-selection' }
  }
}

export async function requestStoredDirectoryPermission(
  directory: LocalDirectoryHandle,
): Promise<LocalLibraryAccessState> {
  try {
    const permission = await directory.requestPermission({ mode: 'readwrite' })
    return toAccessState(directory, permission)
  } catch (error) {
    const message = getErrorMessage(error, '无法恢复素材库目录访问权限。')
    return message
      ? { kind: 'error', message }
      : { kind: 'needs-permission', directory }
  }
}
