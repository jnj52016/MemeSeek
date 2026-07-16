//配置路由
//react-router-dom v6.4+版本使用createBrowserRouter来创建路由
//目前有两个页面，分别是梗图库页面和AI设置页面
import { createBrowserRouter } from 'react-router'
import AiSettingsPage from './pages/AiSettingsPage'
import MemeListPage from './pages/MemeListPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MemeListPage />,
  },
  {
    path: '/ai-settings',
    element: <AiSettingsPage />,
  },
])
