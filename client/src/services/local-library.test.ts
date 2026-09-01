import { describe, expect, it } from 'vitest'
import {
  createLocalMediaObjectUrl,
  LocalLibraryIndexError,
  initializeLocalLibrary,
  readLocalMediaFile,
} from './local-library'
import type {
  LocalDirectoryHandle,
  LocalFileHandle,
} from './local-library-access'

class MemoryFileHandle implements LocalFileHandle {
  readonly kind = 'file' as const
  writeCount = 0
  readonly name: string
  private content: string
  private readonly type: string

  constructor(name: string, content = '', type = '') {
    this.name = name
    this.content = content
    this.type = type
  }

  async getFile() {
    return new File([this.content], this.name, { type: this.type })
  }

  async createWritable() {
    return {
      write: async (data: string | Blob) => {
        this.content = typeof data === 'string' ? data : await data.text()
        this.writeCount += 1
      },
      close: async () => undefined,
    }
  }

  readContent() {
    return this.content
  }
}

class MemoryDirectoryHandle implements LocalDirectoryHandle {
  readonly kind = 'directory' as const
  readonly name: string
  readonly children = new Map<
    string,
    MemoryDirectoryHandle | MemoryFileHandle
  >()

  constructor(name: string) {
    this.name = name
  }

  async queryPermission() {
    return 'granted' as PermissionState
  }

  async requestPermission() {
    return 'granted' as PermissionState
  }

  async getDirectoryHandle(name: string, options?: { create?: boolean }) {
    const existing = this.children.get(name)

    if (existing instanceof MemoryDirectoryHandle) {
      return existing
    }

    if (!options?.create) {
      throw new DOMException('Directory not found', 'NotFoundError')
    }

    const directory = new MemoryDirectoryHandle(name)
    this.children.set(name, directory)
    return directory
  }

  async getFileHandle(name: string, options?: { create?: boolean }) {
    const existing = this.children.get(name)

    if (existing instanceof MemoryFileHandle) {
      return existing
    }

    if (!options?.create) {
      throw new DOMException('File not found', 'NotFoundError')
    }

    const file = new MemoryFileHandle(name)
    this.children.set(name, file)
    return file
  }

  async *values() {
    yield* this.children.values()
  }
}

function getDirectory(
  parent: MemoryDirectoryHandle,
  name: string,
): MemoryDirectoryHandle {
  const child = parent.children.get(name)

  if (!(child instanceof MemoryDirectoryHandle)) {
    throw new Error(`Missing directory: ${name}`)
  }

  return child
}

function getFile(parent: MemoryDirectoryHandle, name: string): MemoryFileHandle {
  const child = parent.children.get(name)

  if (!(child instanceof MemoryFileHandle)) {
    throw new Error(`Missing file: ${name}`)
  }

  return child
}

describe('initializeLocalLibrary', () => {
  it('scans supported media and writes an initial local index', async () => {
    const library = new MemoryDirectoryHandle('我的梗图')
    library.children.set('cat.png', new MemoryFileHandle('cat.png'))
    library.children.set('notes.txt', new MemoryFileHandle('notes.txt'))
    const nestedDirectory = new MemoryDirectoryHandle('reaction')
    nestedDirectory.children.set('wow.mp4', new MemoryFileHandle('wow.mp4'))
    library.children.set('reaction', nestedDirectory)

    const snapshot = await initializeLocalLibrary(library)

    expect(snapshot.records).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          relativePath: 'cat.png',
          mediaType: 'IMAGE',
          title: 'cat',
        }),
        expect.objectContaining({
          relativePath: 'reaction/wow.mp4',
          mediaType: 'VIDEO',
          title: 'wow',
        }),
      ]),
    )
    expect(snapshot.records).toHaveLength(2)

    const metadataDirectory = getDirectory(library, '.memeseek')
    const index = JSON.parse(getFile(metadataDirectory, 'index.json').readContent())
    expect(index.schemaVersion).toBe(1)
    expect(index.records).toHaveLength(2)
  })

  it('keeps existing local metadata when rescanning a library', async () => {
    const library = new MemoryDirectoryHandle('我的梗图')
    library.children.set('cat.png', new MemoryFileHandle('cat.png'))

    const firstSnapshot = await initializeLocalLibrary(library)
    const originalRecord = firstSnapshot.records[0]
    const metadataDirectory = getDirectory(library, '.memeseek')
    const indexFile = getFile(metadataDirectory, 'index.json')
    const index = JSON.parse(indexFile.readContent())
    index.records[0].title = '猫猫反应'
    index.records[0].tags = ['猫', '反应']
    await (await indexFile.createWritable()).write(JSON.stringify(index))

    const secondSnapshot = await initializeLocalLibrary(library)

    expect(secondSnapshot.records).toEqual([
      expect.objectContaining({
        id: originalRecord.id,
        title: '猫猫反应',
        tags: ['猫', '反应'],
      }),
    ])
  })

  it('does not overwrite a malformed local index', async () => {
    const library = new MemoryDirectoryHandle('我的梗图')
    const metadataDirectory = new MemoryDirectoryHandle('.memeseek')
    const indexFile = new MemoryFileHandle('index.json', '{ invalid json')
    metadataDirectory.children.set('index.json', indexFile)
    library.children.set('.memeseek', metadataDirectory)
    library.children.set('cat.png', new MemoryFileHandle('cat.png'))

    await expect(initializeLocalLibrary(library)).rejects.toBeInstanceOf(
      LocalLibraryIndexError,
    )
    expect(indexFile.readContent()).toBe('{ invalid json')
    expect(indexFile.writeCount).toBe(0)
  })

  it('reads a media file by its safe relative path for local preview', async () => {
    const library = new MemoryDirectoryHandle('我的梗图')
    const reactions = new MemoryDirectoryHandle('reaction')
    reactions.children.set(
      'wow.png',
      new MemoryFileHandle('wow.png', 'image-content', 'image/png'),
    )
    library.children.set('reaction', reactions)

    const file = await readLocalMediaFile(library, 'reaction/wow.png')
    const objectUrl = await createLocalMediaObjectUrl(
      library,
      'reaction/wow.png',
    )

    expect(file.name).toBe('wow.png')
    expect(file.type).toBe('image/png')
    expect(objectUrl).toBe('blob:test-image')
    await expect(readLocalMediaFile(library, '../wow.png')).rejects.toThrow(
      '本地媒体路径无效。',
    )
  })
})
