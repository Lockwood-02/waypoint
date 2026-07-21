import type { ActiveDashboard } from '../types/app'

type AppNavigationProps = {
  activeDashboard: ActiveDashboard
  onDashboardChange: (dashboard: ActiveDashboard) => void
  onOpenSettings: () => void
  onSignOut: () => void
}

const dashboardLinks: { id: ActiveDashboard; label: string }[] = [
  { id: 'notes', label: 'Notes' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'groups', label: 'Groups' },
  { id: 'weekly-report', label: 'Reports' },
  { id: 'stats', label: 'Stats' },
]

export function AppNavigation({ activeDashboard, onDashboardChange, onOpenSettings, onSignOut }: AppNavigationProps) {
  return (
    <nav className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">Waypoint</p>
        <div className="mt-2 flex flex-wrap items-end gap-x-4 gap-y-2">
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
      <div className="flex items-center gap-2">
        <button type="button" onClick={onOpenSettings} aria-label="Open settings" title="Settings" className="flex h-9 w-9 items-center justify-center rounded-md border border-white/15 text-slate-300 transition hover:border-cyan-300 hover:text-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-300">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.6 3.4 10 2h4l.4 1.4a2 2 0 0 0 2.8 1.2l1.3-.7 2 3.5-1.1.9a2 2 0 0 0 0 3.4l1.1.9-2 3.5-1.3-.7a2 2 0 0 0-2.8 1.2L14 18h-4l-.4-1.4a2 2 0 0 0-2.8-1.2l-1.3.7-2-3.5 1.1-.9a2 2 0 0 0 0-3.4l-1.1-.9 2-3.5 1.3.7a2 2 0 0 0 2.8-1.2Z" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
        </button>
        <button type="button" onClick={onSignOut} className="rounded-md border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:border-cyan-300 hover:text-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-300">Sign out</button>
      </div>
    </nav>
  )
}
