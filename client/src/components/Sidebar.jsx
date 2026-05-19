import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Upload, FileEdit, Table2,
  BarChart3, History, Settings, Zap, LogOut
} from 'lucide-react'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/upload', label: 'Uploads', icon: Upload },
  { to: '/review', label: 'Review & Edit', icon: FileEdit },
  { to: '/history', label: 'Records', icon: Table2 },
  // { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/history', label: 'History', icon: History },
  // { to: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar() {
  return (
    <aside className="w-52 bg-[#0f1117] text-white flex flex-col min-h-screen flex-shrink-0">
      {/* Logo */}
      <div className="px-5 py-4 flex items-center gap-2.5">
        <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <Zap size={14} className="text-white" />
        </div>
        <span className="font-bold text-base tracking-tight">BiztelAI</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5">
        {navItems.map(({ to, label, icon: Icon }, i) => (
          <NavLink
            key={i}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-[#1e2235] text-white font-medium border-l-2 border-blue-500'
                  : 'text-slate-400 hover:bg-[#1a1f2e] hover:text-white'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold flex-shrink-0">
            A
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">Raju Ansary</p>
            <p className="text-xs text-slate-500">Admin</p>
          </div>
          <LogOut size={14} className="text-slate-500 hover:text-white cursor-pointer flex-shrink-0" />
        </div>
      </div>
    </aside>
  )
}
