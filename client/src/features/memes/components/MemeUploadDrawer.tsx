import { InboxOutlined } from '@ant-design/icons'
import { Alert, Button, Drawer, message, Progress, Upload } from 'antd'
import type { UploadProps } from 'antd'
import { useEffect, useRef, useState } from 'react'
import { memesApi } from '../../../services/api-client'
import { loadAiSettings } from '../../../services/ai-settings-storage'
import type { Meme } from '../../../types/meme'

type MemeUploadDrawerProps = {
  open: boolean
  onClose: () => void
  onUploaded: (meme: Meme) => void
}

type UploadStatus = 'IDLE' | 'UPLOADING' | 'COMPLETED' | 'FAILED'

function getTitleFromFileName(fileName: string) {
  return fileName.replace(/\.[^/.]+$/, '').trim() || '新上传梗图'
}

function MemeUploadDrawer({
  open,
  onClose,
  onUploaded,
}: MemeUploadDrawerProps) {
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
    setAnalysisError(null)
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
      let meme = await memesApi.upload(
        selectedFile,
        { title: getTitleFromFileName(selectedFile.name) },
        (nextProgress) => {
          if (!cancelledRef.current) {
            setProgress(nextProgress)
          }
        },
      )

      if (cancelledRef.current) {
        return
      }

      const aiSettings = loadAiSettings()

      if (aiSettings.analysis.apiKey.trim()) {
        meme = await memesApi.analyze(meme.id, {
          apiKey: aiSettings.analysis.apiKey.trim(),
          model: aiSettings.analysis.model,
          recommendedTags: aiSettings.recommendedTags,
        })
      }

      setProgress(100)
      setUploadStatus('COMPLETED')
      onUploaded(meme)

      if (meme.status === 'FAILED') {
        setAnalysisError(meme.errorMessage ?? 'AI 分析失败，请稍后重试')
        message.warning('梗图已上传，但 AI 分析失败')
      } else {
        message.success('梗图已上传并加入列表')
      }
    } catch (error) {
      if (cancelledRef.current) {
        return
      }

      setUploadStatus('FAILED')
      message.error(
        error instanceof Error ? error.message : '图片上传失败，请重试',
      )
    }
  }

  const isProcessing = uploadStatus === 'UPLOADING'

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
          name="file"
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

        {uploadStatus === 'COMPLETED' && !analysisError && (
          <Alert message="上传完成，梗图已加入列表" type="success" showIcon />
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
