import { useState } from 'react'
import type { Profile } from '../features/profiles/profileService'
import type { ShopItem } from '../types/app'

type Store = 'name_color' | 'avatar_frame' | 'coming_soon'

type PointShopModalProps = {
  profile: Profile
  items: ShopItem[]
  ownedItemIds: string[]
  isUpdating: boolean
  message: string
  onSelectItem: (item: ShopItem) => void
  onClose: () => void
}

export function PointShopModal({ profile, items, ownedItemIds, isUpdating, message, onSelectItem, onClose }: PointShopModalProps) {
  const [store, setStore] = useState<Store | null>(null)
  const visibleItems = store === 'coming_soon' || !store ? [] : items.filter((item) => item.type === store)

  function isEquipped(item: ShopItem) {
    return item.type === 'avatar_frame'
      ? profile.selected_avatar_frame === item.value
      : profile.selected_name_color === item.value
  }

  function isOwned(item: ShopItem) {
    return ownedItemIds.includes(item.id) || isEquipped(item)
  }

  function nameColorClass(value: string | null) {
    switch (value) {
      case 'name-gold': return 'text-amber-200'
      case 'name-cyan': return 'text-[#67e8f9]'
      case 'name-rose': return 'text-rose-200'
      case 'name-emerald': return 'text-emerald-200'
      case 'name-violet': return 'text-violet-200'
      case 'name-blue': return 'text-blue-200'
      case 'name-orange': return 'text-orange-200'
      case 'name-fire': return 'text-orange-400'
      case 'name-white': return 'text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.65)]'
      default: return 'text-white'
    }
  }

  function frameClass(value: string | null) {
    switch (value) {
      case 'frame-cyan': return 'border-[#67e8f9] shadow-[#67e8f9]/30'
      case 'frame-gold': return 'border-amber-300 shadow-amber-300/30'
      case 'frame-fire': return 'border-orange-400 shadow-orange-400/40'
      case 'frame-rose': return 'border-rose-300 shadow-rose-300/30'
      case 'frame-violet': return 'border-violet-300 shadow-violet-300/30'
      case 'frame-emerald': return 'border-emerald-300 shadow-emerald-300/30'
      case 'frame-blue': return 'border-blue-300 shadow-blue-300/30'
      case 'frame-orange': return 'border-orange-300 shadow-orange-300/30'
      case 'frame-white': return 'border-white shadow-white/40'
      default: return 'border-white/15'
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-8" role="dialog" aria-modal="true" aria-labelledby="point-shop-title">
      <section className="max-h-full w-full max-w-3xl overflow-y-auto rounded-lg border border-white/10 bg-slate-950 p-6 shadow-2xl shadow-cyan-950/60">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">Rewards</p><h2 id="point-shop-title" className="mt-2 text-2xl font-bold">{store ? store === 'name_color' ? 'Name Color Store' : store === 'avatar_frame' ? 'Profile Border Store' : 'Coming Soon' : 'Point Shop'}</h2><p className="mt-2 text-sm text-slate-300">Current balance: {profile.total_points} points</p></div><div className="flex gap-2">{store ? <button type="button" onClick={() => setStore(null)} className="rounded-md border border-white/15 px-3 py-2 text-sm font-semibold transition hover:border-cyan-300 hover:text-cyan-200">Back to stores</button> : null}<button type="button" onClick={onClose} className="rounded-md border border-white/15 px-3 py-2 text-sm font-semibold transition hover:border-cyan-300 hover:text-cyan-200">Close</button></div></div>

        {!store ? <div className="mt-6 grid gap-4 md:grid-cols-3">
          <button type="button" onClick={() => setStore('name_color')} className="rounded-xl border border-white/10 bg-white/[0.04] p-5 text-left transition hover:border-cyan-300/70 hover:bg-white/[0.08]"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-300/10 text-xl font-black text-amber-200">Aa</span><h3 className="mt-4 font-bold text-white">Name Colors</h3><p className="mt-2 text-sm leading-5 text-slate-300">Customize how your name appears throughout Waypoint.</p></button>
          <button type="button" onClick={() => setStore('avatar_frame')} className="rounded-xl border border-white/10 bg-white/[0.04] p-5 text-left transition hover:border-cyan-300/70 hover:bg-white/[0.08]"><span className="flex h-11 w-11 items-center justify-center rounded-full border-4 border-[#67e8f9] text-sm font-bold text-white shadow-lg shadow-[#67e8f9]/30">WP</span><h3 className="mt-4 font-bold text-white">Profile Borders</h3><p className="mt-2 text-sm leading-5 text-slate-300">Frame your avatar with a color you have earned.</p></button>
          <button type="button" onClick={() => setStore('coming_soon')} className="rounded-xl border border-white/10 bg-white/[0.04] p-5 text-left transition hover:border-white/25 hover:bg-white/[0.08]"><span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-xl text-slate-300">…</span><h3 className="mt-4 font-bold text-white">Coming Soon</h3><p className="mt-2 text-sm leading-5 text-slate-300">More ways to spend points are on the way.</p></button>
        </div> : store === 'coming_soon' ? <div className="mt-6 rounded-lg border border-dashed border-white/15 p-10 text-center"><h3 className="text-xl font-bold">More rewards are being charted</h3><p className="mt-2 text-sm text-slate-300">Check back in a future Waypoint update.</p></div> : <div className="mt-6 grid gap-3 md:grid-cols-2">{visibleItems.map((item) => { const equipped = isEquipped(item); const owned = isOwned(item); const canAfford = profile.total_points >= item.cost; return <article key={item.id} className="rounded-lg border border-white/10 bg-white/[0.04] p-4"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-3">{item.type === 'avatar_frame' ? <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-4 bg-slate-900 text-xs font-bold text-white shadow-lg ${frameClass(item.value)}`}>WP</span> : null}<div><h3 className={`font-semibold ${item.type === 'name_color' ? nameColorClass(item.value) : 'text-white'}`}>{item.label}</h3><p className="mt-1 text-sm leading-5 text-slate-300">{item.description}</p></div></div><span className="shrink-0 rounded-full bg-cyan-300 px-3 py-1 text-xs font-bold text-slate-950">{owned ? 'Owned' : `${item.cost} pts`}</span></div><button type="button" disabled={isUpdating || equipped || (!owned && !canAfford)} onClick={() => onSelectItem(item)} className="mt-4 w-full rounded-md border border-white/15 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-300 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-60">{equipped ? 'Equipped' : owned ? isUpdating ? 'Equipping…' : 'Equip' : canAfford ? isUpdating ? 'Buying…' : 'Buy and equip' : 'Need more points'}</button></article> })}</div>}

        {message ? <p className="mt-5 rounded-md border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-sm text-cyan-100">{message}</p> : null}
      </section>
    </div>
  )
}
