//这个是一个用于上传梗图的抽屉组件
// 使用了 Ant Design 的 Drawer、Upload、Progress 和 Alert 组件。
// 用户可以通过拖拽或点击上传图片，组件会显示图片预览，并模拟上传和 AI 分析的过程。
// 上传状态包括空闲、上传中、分析中、完成和失败，每个状态对应不同的提示和按钮状态。
import { InboxOutlined } from '@ant-design/icons'
import {
  Alert,
  Button,
  Drawer,
  message,
  Progress,
  Upload,
} from 'antd'
import type { UploadProps } from 'antd'
import { useEffect, useRef, useState } from 'react'
import type { Meme } from '../../../types/meme'

type MemeUploadDrawerProps = {
  open: boolean
  onClose: () => void
  onUploaded: (meme: Meme) => void
}

// 上传流程的状态机：每个状态对应抽屉中的不同提示和按钮状态。
type UploadStatus =
  | 'IDLE'
  | 'UPLOADING'
  | 'ANALYZING'
  | 'COMPLETED'
  | 'FAILED'

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function getTitleFromFileName(fileName: string) {
  return fileName.replace(/\.[^/.]+$/, '').trim() || '新上传梗图'
}

function MemeUploadDrawer({
  open,
  onClose,
  onUploaded,
}: MemeUploadDrawerProps) {
  // selectedFile 是用户当前选择、准备上传的图片文件。
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  // previewUrl 是本地生成的临时预览地址，不是后端图片地址。
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // uploadStatus 控制上传进度、AI 分析中、成功和失败等页面状态。
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('IDLE')

  // progress 保存模拟上传进度，取值范围为 0 到 100。
  const [progress, setProgress] = useState(0)

  // 下面的 Ref 保存定时器和流程控制值，避免定时器变化触发重新渲染。
  const uploadTimerRef = useRef<number | null>(null)
  const analysisTimerRef = useRef<number | null>(null)
  const progressRef = useRef(0)
  const cancelledRef = useRef(false)

  useEffect(() => {
    return () => {
      cancelledRef.current = true

      if (uploadTimerRef.current !== null) {
        window.clearInterval(uploadTimerRef.current)
      }

      if (analysisTimerRef.current !== null) {
        window.clearTimeout(analysisTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!previewUrl) {
      return
    }

    return () => URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  const handleBeforeUpload: UploadProps['beforeUpload'] = (file) => {
    if (!file.type.startsWith('image/')) {
      message.error('请选择图片文件')
      return false
    }

    if (file.size > 10 * 1024 * 1024) {
      message.error('图片大小不能超过 10MB')
      return false
    }

    cancelledRef.current = false
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setUploadStatus('IDLE')
    setProgress(0)
    return false
  }

  const handleClear = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setUploadStatus('IDLE')
    setProgress(0)
  }

  const handleClose = () => {
    cancelledRef.current = true

    if (uploadTimerRef.current !== null) {
      window.clearInterval(uploadTimerRef.current)
      uploadTimerRef.current = null
    }

    if (analysisTimerRef.current !== null) {
      window.clearTimeout(analysisTimerRef.current)
      analysisTimerRef.current = null
    }

    handleClear()
    onClose()
  }

  const finishMockUpload = async () => {
    if (!selectedFile || cancelledRef.current) {
      return
    }

    try {
      const imageUrl = await fileToDataUrl(selectedFile)

      if (cancelledRef.current) {
        return
      }

      const now = new Date().toISOString()

      onUploaded({
        id: `meme-${Date.now()}`,
        imageUrl,
        title: getTitleFromFileName(selectedFile.name),
        description: 'Mock AI 生成的梗图描述。',
        tags: ['待整理'],
        ocrText: '',
        status: 'COMPLETED',
        createdAt: now,
        updatedAt: now,
      })

      setUploadStatus('COMPLETED')
      message.success('梗图已加入列表')
    } catch {
      setUploadStatus('FAILED')
      message.error('Mock 上传失败，请重试')
    }
  }

  const handleMockUpload = () => {
    if (!selectedFile || uploadStatus !== 'IDLE') {
      return
    }

    cancelledRef.current = false
    progressRef.current = 0
    setProgress(0)
    setUploadStatus('UPLOADING')

    uploadTimerRef.current = window.setInterval(() => {
      const nextProgress = Math.min(progressRef.current + 20, 100)
      progressRef.current = nextProgress
      setProgress(nextProgress)

      if (nextProgress === 100) {
        if (uploadTimerRef.current !== null) {
          window.clearInterval(uploadTimerRef.current)
          uploadTimerRef.current = null
        }

        setUploadStatus('ANALYZING')
        analysisTimerRef.current = window.setTimeout(() => {
          void finishMockUpload()
        }, 1200)
      }
    }, 300)
  }

  // isProcessing 用于统一控制上传过程中的禁用状态。
  const isProcessing =
    uploadStatus === 'UPLOADING' || uploadStatus === 'ANALYZING'

  return (
    <Drawer
      title="上传梗图"
      placement="right"
      width={480}
      open={open}
      onClose={handleClose}
    >
      <div className="space-y-6">
        <Upload.Dragger
          name="meme"
          accept="image/*"
          multiple={false}
          disabled={isProcessing || uploadStatus === 'COMPLETED'}
          showUploadList={false}
          beforeUpload={handleBeforeUpload}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽图片到这里上传</p>
          <p className="ant-upload-hint">支持常见图片格式，大小不超过 10MB</p>
        </Upload.Dragger>

        {previewUrl && selectedFile && (
          <div className="space-y-3">
            <p className="font-medium text-slate-900">图片预览</p>
            <img
              src={previewUrl}
              alt={selectedFile.name}
              className="max-h-72 w-full rounded-xl object-contain"
            />
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

        {uploadStatus === 'ANALYZING' && (
          <Alert message="AI 正在分析图片，请稍候" type="info" showIcon />
        )}

        {uploadStatus === 'COMPLETED' && (
          <Alert message="分析完成，梗图已加入列表" type="success" showIcon />
        )}

        {uploadStatus === 'FAILED' && (
          <Alert message="处理失败，可以重新尝试上传" type="error" showIcon />
        )}

        <div className="flex justify-end gap-3">
          <Button onClick={handleClose}>关闭</Button>
          <Button
            type="primary"
            disabled={!selectedFile || isProcessing || uploadStatus === 'COMPLETED'}
            onClick={handleMockUpload}
          >
            {isProcessing ? '处理中...' : '开始上传'}
          </Button>
        </div>
      </div>
    </Drawer>
  )
}

export default MemeUploadDrawer
