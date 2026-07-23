/**
 * Meme 梗图数据
 * @property id 梗图唯一标识
 * @property imageUrl 梗图图片地址
 * @property title 梗图标题
 * @property description 梗图描述
 * @property tags 梗图标签列表
 * @property ocrText AI 识别出的图片文字
 * @property status AI 分析状态
 * @property errorMessage AI 分析失败时的错误信息
 * @property createdAt 梗图创建时间
 * @property updatedAt 梗图最后更新时间
 */
export type Meme = {
  id: string
  imageUrl: string
  title: string
  description: string
  tags: string[]
  ocrText: string
  status: MemeStatus
  errorMessage?: string | null
  createdAt: string
  updatedAt: string
}

/**
 * Meme 梗图的 AI 分析状态
 * PROCESSING 分析中
 * COMPLETED 分析完成
 * FAILED 分析失败
 */
export type MemeStatus = 'PROCESSING' | 'COMPLETED' | 'FAILED'
