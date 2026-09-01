import { Alert, Button, Card, Spin } from 'antd'
import { useEffect, useState, type ReactNode } from 'react'
import {
  inspectStoredDirectory,
  requestStoredDirectoryPermission,
  selectLocalLibrary,
  type LocalLibraryAccessState,
} from '../services/local-library-access'
import {
  initializeLocalLibrary,
  type LocalLibrarySnapshot,
} from '../services/local-library'
import { LocalLibraryProvider } from '../services/local-library-context'

type LocalLibraryGateProps = {
  children: ReactNode
}

function getUnsupportedDescription(reason: 'insecure-context' | 'browser') {
  if (reason === 'insecure-context') {
    return '本地素材库需要在 HTTPS 网站或 localhost 开发环境中使用。'
  }

  return '请使用最新版桌面 Chrome 或 Edge，并确认浏览器允许网站访问本地文件。'
}

function LocalLibraryGate({ children }: LocalLibraryGateProps) {
  const [accessState, setAccessState] = useState<LocalLibraryAccessState>({
    kind: 'checking',
  })
  const [isActing, setIsActing] = useState(false)
  const [library, setLibrary] = useState<LocalLibrarySnapshot | null>(null)
  const [libraryError, setLibraryError] = useState<{
    directory: LocalLibrarySnapshot['directory']
    message: string
  } | null>(null)

  useEffect(() => {
    let cancelled = false

    void inspectStoredDirectory().then((nextState) => {
      if (!cancelled) {
        setAccessState(nextState)
      }
    })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    if (accessState.kind !== 'ready') {
      return undefined
    }

    void initializeLocalLibrary(accessState.directory)
      .then((nextLibrary) => {
        if (!cancelled) {
          setLibrary(nextLibrary)
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLibraryError({
            directory: accessState.directory,
            message:
              error instanceof Error
                ? error.message
                : '无法初始化本地素材库。',
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [accessState])

  const chooseDirectory = async () => {
    setIsActing(true)

    try {
      setAccessState(await selectLocalLibrary())
    } finally {
      setIsActing(false)
    }
  }

  const restorePermission = async () => {
    if (accessState.kind !== 'needs-permission') {
      return
    }

    setIsActing(true)

    try {
      setAccessState(await requestStoredDirectoryPermission(accessState.directory))
    } finally {
      setIsActing(false)
    }
  }

  if (
    accessState.kind === 'ready' &&
    library?.directory === accessState.directory
  ) {
    return <LocalLibraryProvider library={library}>{children}</LocalLibraryProvider>
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-10 text-slate-900">
      <Card className="w-full max-w-xl shadow-sm">
        <div className="space-y-6">
          <div>
            <p className="mb-2 text-sm font-medium text-orange-600">MemeSeek 本地素材库</p>
            <h1 className="m-0 text-3xl font-bold tracking-tight">先选择你的梗图文件夹</h1>
          </div>

          {accessState.kind === 'checking' ? (
            <div className="flex items-center gap-3 text-slate-600">
              <Spin size="small" />
              正在检查本地素材库权限…
            </div>
          ) : null}

          {accessState.kind === 'ready' &&
          library?.directory !== accessState.directory &&
          libraryError?.directory !== accessState.directory ? (
            <div className="flex items-center gap-3 text-slate-600">
              <Spin size="small" />
              正在扫描“{accessState.directory.name}”并初始化本地索引…
            </div>
          ) : null}

          {accessState.kind === 'ready' &&
          libraryError?.directory === accessState.directory ? (
            <>
              <Alert
                type="error"
                showIcon
                message="无法初始化本地素材库"
                description={libraryError.message}
              />
              <Button disabled={isActing} onClick={() => void chooseDirectory()}>
                重新选择文件夹
              </Button>
            </>
          ) : null}

          {accessState.kind === 'needs-selection' ? (
            <>
              <p className="m-0 leading-7 text-slate-600">
                选择一个电脑上的文件夹后，图片、视频和梗图索引都会保存在这里，不会被永久上传到 MemeSeek 服务器。
              </p>
              <Button type="primary" size="large" loading={isActing} onClick={() => void chooseDirectory()}>
                选择梗图文件夹
              </Button>
            </>
          ) : null}

          {accessState.kind === 'needs-permission' ? (
            <>
              <Alert
                type="info"
                showIcon
                message="需要恢复文件夹访问权限"
                description={`MemeSeek 记住了“${accessState.directory.name}”，请点击下方按钮允许继续访问，无需重新选择目录。`}
              />
              <div className="flex flex-wrap gap-3">
                <Button type="primary" loading={isActing} onClick={() => void restorePermission()}>
                  继续访问：{accessState.directory.name}
                </Button>
                <Button disabled={isActing} onClick={() => void chooseDirectory()}>
                  重新选择文件夹
                </Button>
              </div>
            </>
          ) : null}

          {accessState.kind === 'unsupported' ? (
            <Alert
              type="warning"
              showIcon
              message="当前环境无法使用本地素材库"
              description={getUnsupportedDescription(accessState.reason)}
            />
          ) : null}

          {accessState.kind === 'error' ? (
            <>
              <Alert type="error" showIcon message="无法访问本地素材库" description={accessState.message} />
              <Button type="primary" loading={isActing} onClick={() => void chooseDirectory()}>
                重新选择文件夹
              </Button>
            </>
          ) : null}
        </div>
      </Card>
    </main>
  )
}

export default LocalLibraryGate
