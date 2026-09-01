//配置路由
// 使用 Hash Router，确保 CloudBase 静态应用域名刷新子页面时不依赖服务器回退。
//目前有两个页面，分别是梗图库页面和AI设置页面
import { createHashRouter } from 'react-router'
import AiSettingsPage from './pages/AiSettingsPage'
import MemeListPage from './pages/MemeListPage'

export const router = createHashRouter([
  {
    path: '/',
    element: <MemeListPage />,
  },
  {
    path: '/ai-settings',
    element: <AiSettingsPage />,
  },
])
