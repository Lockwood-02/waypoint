import { useEffect, useRef, useState } from 'react'
import type { ActiveDashboard } from '../types/app'
import { appVersion } from '../config/appConfig'

type AppNavigationProps = {
  activeDashboard: ActiveDashboard
  avatarUrl: string | null
  avatarFrameClass: string
  displayName: string
  onDashboardChange: (dashboard: ActiveDashboard) => void
  onOpenChangelog: () => void
  onOpenSettings: () => void
  onSignOut: () => void
}

const dashboardLinks: { id: ActiveDashboard; label: string }[] = [
  { id: 'notes', label: 'Notes' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'groups', label: 'Groups' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'weekly-report', label: 'Reports' },
  { id: 'stats', label: 'Stats' },
]

export function AppNavigation({ activeDashboard, avatarUrl, avatarFrameClass, displayName, onDashboardChange, onOpenChangelog, onOpenSettings, onSignOut }: AppNavigationProps) {
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false)
  const accountMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isAccountMenuOpen) return
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) setIsAccountMenuOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsAccountMenuOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isAccountMenuOpen])

  return (
    <nav className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <div className="flex items-baseline gap-2">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">Waypoint</p>
          <button
            type="button"
            onClick={onOpenChangelog}
            title={`View ${appVersion} update notes`}
            className="cursor-pointer text-[0.65rem] font-semibold tracking-normal text-slate-500 underline-offset-2 transition hover:text-cyan-200 hover:underline focus:outline-none focus:text-cyan-200 focus:underline"
          >
            {appVersion}
          </button>
        </div>
        <div className="mt-2 flex min-h-9 flex-wrap items-end gap-x-4 gap-y-2">
          {dashboardLinks.map((link) => (
            <button
              key={link.id}
              type="button"
              onClick={() => onDashboardChange(link.id)}
              className={`text-left font-bold transition hover:text-cyan-100 ${activeDashboard === link.id ? 'text-3xl text-white' : 'text-lg text-slate-400'}`}
            >
              {link.label}
            </button>
          ))}
        </div>
      </div>
      <div ref={accountMenuRef} className="relative self-start">
        <button
          type="button"
          aria-label="Open account menu"
          aria-haspopup="menu"
          aria-expanded={isAccountMenuOpen}
          onClick={() => setIsAccountMenuOpen((current) => !current)}
          className={`flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 bg-slate-900 font-bold text-cyan-100 shadow-lg transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-slate-950 ${avatarFrameClass}`}
        >
          {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : displayName.charAt(0).toUpperCase()}
        </button>
        {isAccountMenuOpen ? (
          <div role="menu" className="absolute right-0 z-40 mt-3 w-56 overflow-hidden rounded-lg border border-white/10 bg-slate-950 p-2 shadow-2xl shadow-black/50">
            <div className="border-b border-white/10 px-3 py-2">
              <p className="truncate text-sm font-bold text-white">{displayName}</p>
              <p className="mt-0.5 text-xs text-slate-400">Waypoint account</p>
            </div>
            <button type="button" role="menuitem" onClick={() => { onDashboardChange('profile'); setIsAccountMenuOpen(false) }} className={`mt-2 w-full rounded-md px-3 py-2 text-left text-sm font-semibold transition hover:bg-white/[0.07] hover:text-cyan-100 ${activeDashboard === 'profile' ? 'bg-cyan-300/10 text-cyan-200' : 'text-slate-200'}`}>Profile</button>
            <button type="button" role="menuitem" onClick={() => { onOpenSettings(); setIsAccountMenuOpen(false) }} className="w-full rounded-md px-3 py-2 text-left text-sm font-semibold text-slate-200 transition hover:bg-white/[0.07] hover:text-cyan-100">Settings</button>
            <div className="my-2 border-t border-white/10" />
            <button type="button" role="menuitem" onClick={() => { setIsAccountMenuOpen(false); onSignOut() }} className="w-full rounded-md px-3 py-2 text-left text-sm font-semibold text-rose-200 transition hover:bg-rose-300/10 hover:text-rose-100">Sign out</button>
          </div>
        ) : null}
      </div>
    </nav>
  )
}
