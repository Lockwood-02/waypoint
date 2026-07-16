import { colorwayOptions } from '../config/appConfig'
import type { Profile } from '../features/profiles/profileService'
import type { Colorway, ShopItem } from '../types/app'

type SettingsModalProps = { colorway: Colorway; profile: Profile; ownedFlareItems: ShopItem[]; isUpdatingProfile: boolean; flareMessage: string; onSelectColorway: (colorway: Colorway) => void; onToggleFlare: (item: ShopItem) => void; onClose: () => void }

export function SettingsModal({ colorway, profile, ownedFlareItems, isUpdatingProfile, flareMessage, onSelectColorway, onToggleFlare, onClose }: SettingsModalProps) {
  const nameFlares = ownedFlareItems.filter((item) => item.type === 'name_color')
  const frameFlares = ownedFlareItems.filter((item) => item.type === 'avatar_frame')

  function isEquipped(item: ShopItem) {
    return item.type === 'name_color'
      ? profile.selected_name_color === item.value
      : profile.selected_avatar_frame === item.value
  }

  function nameFlareClass(value: string | null) {
    switch (value) {
      case 'name-gold': return 'text-amber-200'
      case 'name-rose': return 'text-rose-200'
      case 'name-emerald': return 'text-emerald-200'
      case 'name-violet': return 'text-violet-200'
      case 'name-blue': return 'text-blue-200'
      case 'name-orange': return 'text-orange-200'
      case 'name-fire': return 'text-orange-400'
      default: return 'text-[#67e8f9]'
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 px-4 py-8" role="dialog" aria-modal="true" aria-labelledby="settings-modal-title" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="max-h-full w-full max-w-2xl overflow-y-auto rounded-xl border border-white/10 bg-slate-950 p-6 shadow-2xl shadow-cyan-950/60">
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
        <section className="mt-8 border-t border-white/10 pt-7">
          <h3 className="font-bold text-white">Profile flares</h3>
          <p className="mt-1 text-sm text-slate-400">Equip or unequip rewards you own from the Point Shop.</p>

          {flareMessage ? <p className="mt-4 rounded-md border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-sm text-cyan-100">{flareMessage}</p> : null}

          <div className="mt-5 space-y-5">
            <div>
              <p className="text-sm font-semibold text-slate-200">Name color</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {nameFlares.length === 0 ? <p className="rounded-md border border-dashed border-white/15 p-3 text-sm text-slate-400 sm:col-span-2">No name colors owned yet.</p> : null}
                {nameFlares.map((item) => { const equipped = isEquipped(item); return <button key={item.id} type="button" disabled={isUpdatingProfile} onClick={() => onToggleFlare(item)} className={`flex items-center justify-between rounded-lg border p-3 text-left transition disabled:opacity-60 ${equipped ? 'border-cyan-300 bg-cyan-300/10 ring-1 ring-cyan-300' : 'border-white/10 bg-white/[0.04] hover:border-white/25'}`}><span className={`font-bold ${nameFlareClass(item.value)}`}>{item.label}</span><span className="text-xs font-semibold text-slate-300">{equipped ? 'Unequip' : 'Equip'}</span></button> })}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">Avatar frame</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {frameFlares.length === 0 ? <p className="rounded-md border border-dashed border-white/15 p-3 text-sm text-slate-400 sm:col-span-2">No avatar frames owned yet.</p> : null}
                {frameFlares.map((item) => { const equipped = isEquipped(item); return <button key={item.id} type="button" disabled={isUpdatingProfile} onClick={() => onToggleFlare(item)} className={`flex items-center justify-between rounded-lg border p-3 text-left transition disabled:opacity-60 ${equipped ? 'border-cyan-300 bg-cyan-300/10 ring-1 ring-cyan-300' : 'border-white/10 bg-white/[0.04] hover:border-white/25'}`}><span className="font-bold text-white">{item.label}</span><span className="text-xs font-semibold text-slate-300">{equipped ? 'Unequip' : 'Equip'}</span></button> })}
              </div>
            </div>
          </div>
        </section>
      </section>
    </div>
  )
}
