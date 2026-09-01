import { InboxOutlined } from '@ant-design/icons'
import { Alert, Button, Drawer, message, Progress, Upload } from 'antd'
import type { UploadProps } from 'antd'
import type { ClipboardEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import {
  importLocalMedia,
  type LocalMemeRecord,
} from '../../../services/local-library'
import { useLocalLibrary } from '../../../services/local-library-context'

type MemeUploadDrawerProps = {
  open: boolean
  onClose: () => void
  onUploaded: (record: LocalMemeRecord) => void
}

type UploadStatus = 'IDLE' | 'UPLOADING' | 'COMPLETED' | 'FAILED'

const MAX_IMAGE_SIZE = 10 * 1024 * 1024
const MAX_VIDEO_SIZE = 500 * 1024 * 1024
const VIDEO_MIME_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
])
const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp'])

function getUploadMediaType(file: File) {
  const mimeType = file.type.toLowerCase()
  const extension = file.name.split('.').pop()?.toLowerCase()

  if (mimeType.startsWith('image/') || IMAGE_EXTENSIONS.has(extension ?? '')) {
    return 'IMAGE' as const
  }

  if (
    VIDEO_MIME_TYPES.has(mimeType) ||
    ['mp4', 'webm', 'mov'].includes(extension ?? '')
  ) {
    return 'VIDEO' as const
  }

  return null
}

async function createJpegThumbnail(
  source: CanvasImageSource,
  width: number,
  height: number,
  fileName: string,
): Promise<File> {
  if (!width || !height) {
    throw new Error('媒体尺寸无效')
  }

  const maxDimension = 640
  const scale = Math.min(1, maxDimension / Math.max(width, height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width * scale))
  canvas.height = Math.max(1, Math.round(height * scale))

  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('当前浏览器不支持生成 JPEG 封面')
  }

  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(source, 0, 0, canvas.width, canvas.height)

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.88),
  )

  if (!blob) {
    throw new Error('无法生成 JPEG 封面')
  }

  const baseName = fileName.replace(/\.[^/.]+$/, '').trim() || 'meme'
  return new File([blob], `${baseName}-thumbnail.jpg`, {
    type: 'image/jpeg',
    lastModified: Date.now(),
  })
}

async function createImageThumbnail(file: File): Promise<File> {
  const objectUrl = URL.createObjectURL(file)

  try {
    const image = new Image()
    image.decoding = 'async'

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('无法读取图片内容'))
      image.src = objectUrl
    })

    return createJpegThumbnail(
      image,
      image.naturalWidth,
      image.naturalHeight,
      file.name,
    )
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

async function createVideoThumbnail(file: File): Promise<File> {
  const objectUrl = URL.createObjectURL(file)

  try {
    const video = document.createElement('video')
    video.preload = 'auto'
    video.muted = true
    video.playsInline = true

    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve()
      video.onerror = () => reject(new Error('无法读取视频内容'))
      video.src = objectUrl
      video.load()
    })

    return createJpegThumbnail(
      video,
      video.videoWidth,
      video.videoHeight,
      file.name,
    )
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

function getPastedFileName(mimeType: string) {
  const extensionByMimeType: Record<string, string> = {
    'image/gif': 'gif',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  }

  return `pasted-image-${Date.now()}.${extensionByMimeType[mimeType] ?? 'png'}`
}

function MemeUploadDrawer({
  open,
  onClose,
  onUploaded,
}: MemeUploadDrawerProps) {
  const library = useLocalLibrary()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('IDLE')
  const [progress, setProgress] = useState(0)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const cancelledRef = useRef(false)

  useEffect(() => {
    return () => {
      cancelledRef.current = true
    }
  }, [])

  useEffect(() => {
    if (!previewUrl) {
      return
    }

    return () => URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  const selectFile = (file: File) => {
    const mediaType = getUploadMediaType(file)

    if (!mediaType) {
      message.error('请选择 JPG、PNG、GIF、WebP、MP4、WebM 或 MOV 文件')
      return false
    }

    const maxSize = mediaType === 'VIDEO' ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE

    if (file.size > maxSize) {
      message.error(
        mediaType === 'VIDEO'
          ? '视频大小不能超过 500MB'
          : '图片大小不能超过 10MB',
      )
      return false
    }

    cancelledRef.current = false
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setUploadStatus('IDLE')
    setProgress(0)
    setAnalysisError(null)
    return false
  }

  const handleBeforeUpload: UploadProps['beforeUpload'] = (file) =>
    selectFile(file)

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    if (!open || isProcessing || uploadStatus === 'COMPLETED') {
      return
    }

    const imageItem = Array.from(event.clipboardData.items).find((item) =>
      item.type.startsWith('image/'),
    )

    if (!imageItem) {
      message.info('剪贴板中没有图片，请先复制一张图片')
      return
    }

    const pastedFile = imageItem.getAsFile()

    if (!pastedFile) {
      event.preventDefault()
      message.error('无法读取剪贴板中的图片，请改用拖拽或文件选择')
      return
    }

    event.preventDefault()

    const file = pastedFile.name.trim()
      ? pastedFile
      : new File([pastedFile], getPastedFileName(imageItem.type), {
          type: pastedFile.type || imageItem.type,
          lastModified: Date.now(),
        })

    selectFile(file)
  }

  const handleClear = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setUploadStatus('IDLE')
    setProgress(0)
    setAnalysisError(null)
  }

  const handleClose = () => {
    cancelledRef.current = true
    handleClear()
    onClose()
  }

  const handleUpload = async () => {
    if (!selectedFile || uploadStatus !== 'IDLE') {
      return
    }

    cancelledRef.current = false
    setProgress(0)
    setUploadStatus('UPLOADING')
    setAnalysisError(null)

    try {
      const selectedMediaType = getUploadMediaType(selectedFile)
      const needsThumbnail =
        selectedMediaType === 'VIDEO'
          ? true
          : ['image/gif', 'image/webp'].includes(selectedFile.type.toLowerCase())
      const thumbnail = needsThumbnail
        ? selectedMediaType === 'VIDEO'
          ? await createVideoThumbnail(selectedFile)
          : await createImageThumbnail(selectedFile)
        : undefined

      setProgress(45)
      const record = await importLocalMedia(
        library.directory,
        selectedFile,
        thumbnail,
      )

      if (cancelledRef.current) {
        return
      }

      setProgress(100)
      setUploadStatus('COMPLETED')
      onUploaded(record)
      message.success('素材已保存到本地梗图文件夹')
    } catch (error) {
      if (cancelledRef.current) {
        return
      }

      setUploadStatus('FAILED')
      message.error(
        error instanceof Error ? error.message : '媒体上传失败，请重试',
      )
    }
  }

  const isProcessing = uploadStatus === 'UPLOADING'
  const isVideo =
    selectedFile !== null && getUploadMediaType(selectedFile) === 'VIDEO'

  return (
    <Drawer
      title="上传梗图"
      placement="right"
      width={480}
      open={open}
      onClose={handleClose}
    >
      <div className="space-y-6">
        <div
          aria-label="媒体上传区域，支持点击、拖拽或粘贴图片"
          className="rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
          data-testid="meme-upload-zone"
          onClick={(event) => event.currentTarget.focus()}
          onPaste={handlePaste}
          role="region"
          tabIndex={0}
        >
          <Upload.Dragger
            name="file"
            accept="image/*,video/mp4,video/webm,video/quicktime,.mov"
            multiple={false}
            disabled={isProcessing || uploadStatus === 'COMPLETED'}
            showUploadList={false}
            beforeUpload={handleBeforeUpload}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">
              点击、拖拽上传视频，或 Ctrl+V 粘贴图片
            </p>
            <p className="ant-upload-hint">
              图片不超过 10MB，视频不超过 500MB；支持 MP4、WebM 和 MOV
            </p>
          </Upload.Dragger>
        </div>

        {previewUrl && selectedFile && (
          <div className="space-y-3">
            <p className="font-medium text-slate-900">
              {isVideo ? '视频预览' : '图片预览'}
            </p>
            {isVideo ? (
              <video
                src={previewUrl}
                controls
                preload="metadata"
                className="max-h-72 w-full rounded-xl bg-slate-950 object-contain"
              />
            ) : (
              <img
                src={previewUrl}
                alt={selectedFile.name}
                className="max-h-72 w-full rounded-xl object-contain"
              />
            )}
            <div className="flex items-center justify-between gap-3">
              <p className="truncate text-sm text-slate-500">
                {selectedFile.name}
              </p>
              <Button
                type="link"
                danger
                disabled={isProcessing}
                onClick={handleClear}
              >
                移除
              </Button>
            </div>
          </div>
        )}

        {uploadStatus === 'UPLOADING' && (
          <Progress percent={progress} status="active" />
        )}

        {uploadStatus === 'COMPLETED' && !analysisError && (
          <Alert
            message={isVideo ? '视频已保存到本地文件夹' : '图片已保存到本地文件夹'}
            type="success"
            showIcon
          />
        )}

        {uploadStatus === 'COMPLETED' && analysisError && (
          <Alert
            message="上传完成，但 AI 分析失败"
            description={analysisError}
            type="warning"
            showIcon
          />
        )}

        {uploadStatus === 'FAILED' && (
          <Alert message="上传失败，可以重新尝试" type="error" showIcon />
        )}

        <div className="flex justify-end gap-3">
          <Button onClick={handleClose}>关闭</Button>
          <Button
            type="primary"
            disabled={!selectedFile || isProcessing || uploadStatus === 'COMPLETED'}
            onClick={() => void handleUpload()}
          >
            {isProcessing ? '上传中...' : '开始上传'}
          </Button>
        </div>
      </div>
    </Drawer>
  )
}

export default MemeUploadDrawer
