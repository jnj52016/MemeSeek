//这个是应用的布局组件，包含了头部导航栏和内容区域

import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router'

type AppLayoutProps = {
  children: ReactNode
}

function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation()

  const navItems = [
    { to: '/', label: '梗图列表' },
    { to: '/ai-settings', label: 'AI 设置' },
  ]

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="text-xl font-bold text-slate-900">
            MemeSeek
          </Link>

          <nav className="flex items-center gap-2" aria-label="主导航">
            {navItems.map((item) => {
              const isActive = location.pathname === item.to

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  aria-current={isActive ? 'page' : undefined}
                  className={`rounded-lg px-3 py-2 text-sm transition ${
                    isActive
                      ? 'bg-orange-100 font-medium text-orange-700'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  )
}

export default AppLayout
