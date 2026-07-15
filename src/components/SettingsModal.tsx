import { colorwayOptions } from '../config/appConfig'
import type { Colorway } from '../types/app'

type SettingsModalProps = { colorway: Colorway; onSelectColorway: (colorway: Colorway) => void; onClose: () => void }

export function SettingsModal({ colorway, onSelectColorway, onClose }: SettingsModalProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 px-4 py-8" role="dialog" aria-modal="true" aria-labelledby="settings-modal-title" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="w-full max-w-lg rounded-xl border border-white/10 bg-slate-950 p-6 shadow-2xl shadow-cyan-950/60">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">Settings</p><h2 id="settings-modal-title" className="mt-2 text-2xl font-bold">Make Waypoint yours</h2><p className="mt-2 text-sm leading-6 text-slate-300">Your choices are saved automatically on this device.</p></div>
          <button type="button" onClick={onClose} aria-label="Close settings" className="rounded-md border border-white/15 px-3 py-2 text-sm font-semibold transition hover:border-cyan-300 hover:text-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-300">Close</button>
        </div>
        <fieldset className="mt-7">
          <legend className="font-bold text-white">Colorway</legend><p className="mt-1 text-sm text-slate-400">Choose the palette used throughout the application.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {colorwayOptions.map((option) => {
              const isSelected = colorway === option.id
              return <label key={option.id} className={`cursor-pointer rounded-lg border p-4 transition ${isSelected ? 'border-cyan-300 bg-cyan-300/10 ring-1 ring-cyan-300' : 'border-white/10 bg-white/[0.04] hover:border-white/25'}`}>
                <input type="radio" name="colorway" value={option.id} checked={isSelected} onChange={() => onSelectColorway(option.id)} className="sr-only" />
                <span className="flex items-center justify-between gap-3"><span className="font-bold">{option.label}</span><span className="flex -space-x-1" aria-hidden="true">{option.swatches.map((swatch) => <span key={swatch} className="h-5 w-5 rounded-full border-2 border-slate-950" style={{ backgroundColor: swatch }} />)}</span></span>
                <span className="mt-2 block text-sm leading-5 text-slate-300">{option.description}</span>{isSelected ? <span className="mt-3 block text-xs font-bold uppercase tracking-wider text-cyan-300">Selected</span> : null}
              </label>
            })}
          </div>
        </fieldset>
      </section>
    </div>
  )
}
