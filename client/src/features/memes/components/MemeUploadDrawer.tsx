// 这个是一个 MemeUploadModal 组件，用于显示一个上传梗图的模态框。
// 用户可以选择图片文件进行上传，并预览所选图片。
import { InboxOutlined } from '@ant-design/icons'
import { Button, Drawer, message, Upload } from 'antd'
import type { UploadProps } from 'antd'
import { useEffect, useState } from 'react'

type MemeUploadDrawerProps = {
  open: boolean
  onClose: () => void
}

function MemeUploadDrawer({ open, onClose }: MemeUploadDrawerProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

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

    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    return false
  }

  const handleClear = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
  }

  const handleClose = () => {
    handleClear()
    onClose()
  }

  const handleMockUpload = () => {
    message.info('当前是 Mock 阶段，图片暂不会保存到服务器')
  }

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
              <Button type="link" danger onClick={handleClear}>
                移除
              </Button>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button onClick={handleClose}>取消</Button>
          <Button
            type="primary"
            disabled={!selectedFile}
            onClick={handleMockUpload}
          >
            开始上传
          </Button>
        </div>
      </div>
    </Drawer>
  )
}

export default MemeUploadDrawer
