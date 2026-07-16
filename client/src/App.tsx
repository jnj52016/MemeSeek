import { Button, Space } from 'antd'

function App() {
  return (
    <main style={{ padding: 24 }}>
      <h1>MemeSeek</h1>
      <div className="text-3xl font-bold text-blue-600">
        MemeSeek
      </div>
      <Space>
        <Button type="primary">上传梗图</Button>   {/* 上传梗图 */}
        <Button>打开 AI 设置</Button>
      </Space>
    </main>
  )
}

export default App