import { useState, type ChangeEvent } from 'react'
import { ProgressionSummary } from '../progression/ProgressionPanel'
import {
  getProgressionLevel,
  getProgressionPath,
  getProgressionTitle,
  progressionPaths,
  type ProgressionPathId,
} from '../progression/progressionConfig'
import type {
  CompletedProgressionPath,
  ProfileProgression,
  ProfileShowcaseBadge,
  ShowcaseBadgeSelection,
} from '../progression/progressionService'
import type { Profile } from './profileService'

type ProfileDashboardProps = {
  profile: Profile | null
  profileError: string
  profileMessage: string
  nameClass: string
  avatarFrameClass: string
  progression: ProfileProgression | null
  completedPaths: CompletedProgressionPath[]
  showcaseBadges: ProfileShowcaseBadge[]
  isLoadingProgression: boolean
  isUpdatingProfile: boolean
  isUpdatingShowcase: boolean
  openTaskCount: number
  completedTaskCount: number
  onAvatarUpload: (event: ChangeEvent<HTMLInputElement>) => void
  onOpenProgression: () => void
  onOpenShop: () => void
  onOpenCustomization: () => void
  onSaveShowcaseBadges: (badges: ShowcaseBadgeSelection[]) => Promise<boolean>
}

export function ProfileDashboard({
  profile,
  profileError,
  profileMessage,
  nameClass,
  avatarFrameClass,
  progression,
  completedPaths,
  showcaseBadges,
  isLoadingProgression,
  isUpdatingProfile,
  isUpdatingShowcase,
  openTaskCount,
  completedTaskCount,
  onAvatarUpload,
  onOpenProgression,
  onOpenShop,
  onOpenCustomization,
  onSaveShowcaseBadges,
}: ProfileDashboardProps) {
  const [isBadgeEditorOpen, setIsBadgeEditorOpen] = useState(false)
  const [draftBadgeKeys, setDraftBadgeKeys] = useState<string[]>([])
  const path = getProgressionPath(progression?.path_id)
  const level = path && progression ? getProgressionLevel(path, progression.xp) : null
  const equippedTitle = getProgressionTitle(progression?.equipped_title_id)
  const activeBadges = path && progression
    ? path.badges.filter((badge) => progression.xp >= badge.requiredXp).length
    : 0
  const completedOtherBadges = completedPaths.filter((item) => item.path_id !== progression?.path_id).length * 3
  const earnedBadgeCount = activeBadges + completedOtherBadges
  const completedPathIds = new Set(completedPaths.map((item) => item.path_id))
  const earnedBadges = progressionPaths.flatMap((badgePath) => {
    const pathIsCompleted = completedPathIds.has(badgePath.id)
    const activePathXp = progression?.path_id === badgePath.id ? progression.xp : 0
    return badgePath.badges
      .filter((badge) => pathIsCompleted || activePathXp >= badge.requiredXp)
      .map((badge) => ({ ...badge, pathId: badgePath.id, pathName: badgePath.name, accentClass: badgePath.accentClass }))
  })
  const showcasedBadgeDetails = showcaseBadges.flatMap((selection) => {
    const badgePath = getProgressionPath(selection.path_id)
    const badge = badgePath?.badges.find((item) => item.id === selection.badge_id)
    return badgePath && badge ? [{ ...badge, pathId: badgePath.id, pathName: badgePath.name, accentClass: badgePath.accentClass }] : []
  })

  function openBadgeEditor() {
    setDraftBadgeKeys(showcaseBadges.map((badge) => `${badge.path_id}:${badge.badge_id}`))
    setIsBadgeEditorOpen(true)
  }

  function toggleDraftBadge(pathId: ProgressionPathId, badgeId: string) {
    const key = `${pathId}:${badgeId}`
    setDraftBadgeKeys((current) => current.includes(key)
      ? current.filter((item) => item !== key)
      : current.length < 3 ? [...current, key] : current)
  }

  async function saveBadgeShowcase() {
    const selections = draftBadgeKeys.map((key) => {
      const separatorIndex = key.indexOf(':')
      return {
        path_id: key.slice(0, separatorIndex) as ProgressionPathId,
        badge_id: key.slice(separatorIndex + 1),
      }
    })
    if (await onSaveShowcaseBadges(selections)) setIsBadgeEditorOpen(false)
  }

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-cyan-950/30">
      <div>
        <h2 className="text-2xl font-bold">Profile</h2>
        <p className="mt-1 text-sm text-slate-300">Manage your identity, rewards, progression paths, and customization.</p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <article className="rounded-lg border border-white/10 bg-slate-950/35 p-6">
          <div className="flex flex-wrap items-center gap-5">
            <label className={`group relative flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-full border-4 bg-slate-900 text-3xl font-bold shadow-lg transition focus-within:ring-2 focus-within:ring-cyan-300 focus-within:ring-offset-2 focus-within:ring-offset-slate-950 ${avatarFrameClass}`}>
              {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : <span className="text-cyan-100">{(profile?.display_name ?? 'Player').charAt(0).toUpperCase()}</span>}
              <span className="absolute inset-0 flex items-center justify-center bg-slate-950/70 text-xs font-bold text-white opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">Upload</span>
              <input type="file" accept="image/*" disabled={isUpdatingProfile} onChange={onAvatarUpload} className="sr-only" />
            </label>
            <div className="min-w-0">
              <p className="text-sm font-medium text-cyan-200">Waypoint profile</p>
              <h3 className={`mt-2 break-words text-3xl font-bold ${nameClass}`}>{profile?.display_name ?? 'Player'}</h3>
              {equippedTitle ? <p className={`mt-1 font-semibold ${equippedTitle.path.accentClass}`}>{equippedTitle.level.title}</p> : <p className="mt-1 text-sm text-slate-400">Choose a path to earn your first title.</p>}
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-3 gap-3 border-t border-white/10 pt-5">
            {[
              ['Total points', profile?.total_points ?? 0],
              ['Open tasks', openTaskCount],
              ['Completed tasks', completedTaskCount],
            ].map(([label, value]) => <div key={label}><dt className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</dt><dd className="mt-1 text-lg font-bold text-white">{value}</dd></div>)}
          </dl>

          <div className="mt-5 border-t border-white/10 pt-5">
            <div className="flex items-center justify-between gap-3">
              <div><h4 className="font-bold text-white">Badge showcase</h4><p className="mt-1 text-xs text-slate-400">Show off up to three earned badges.</p></div>
              <button type="button" disabled={!earnedBadges.length} onClick={openBadgeEditor} className="rounded-md border border-white/15 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-cyan-300 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-50">Edit showcase</button>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {Array.from({ length: 3 }, (_, index) => {
                const badge = showcasedBadgeDetails[index]
                return badge ? (
                  <div key={`${badge.pathId}:${badge.id}`} className="min-w-0 rounded-lg border border-cyan-300/25 bg-cyan-300/10 p-3 text-center">
                    <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-full border border-cyan-300/40 text-cyan-100">◆</span>
                    <p className={`mt-2 truncate text-xs font-bold ${badge.accentClass}`} title={badge.label}>{badge.label}</p>
                    <p className="mt-1 truncate text-[0.65rem] text-slate-400">{badge.pathName}</p>
                  </div>
                ) : (
                  <div key={`empty-${index}`} className="flex min-h-24 items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/[0.02] p-2 text-center text-xs text-slate-500">Empty badge slot</div>
                )
              })}
            </div>
          </div>

          {profileError ? <p className="mt-5 rounded-md border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">Profile could not be loaded: {profileError}</p> : null}
          {profileMessage ? <p className="mt-5 rounded-md border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-sm text-cyan-100">{profileMessage}</p> : null}
        </article>

        <article className="rounded-lg border border-white/10 bg-slate-950/35 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h3 className="text-lg font-bold">Path progression</h3><p className="mt-1 text-sm text-slate-400">Your active journey and earned achievements.</p></div>
            {path ? <span className={`rounded-full border border-white/10 px-3 py-1 text-xs font-bold ${path.accentClass}`}>{path.name}</span> : null}
          </div>
          <div className="mt-5"><ProgressionSummary progression={progression} isLoading={isLoadingProgression} onOpen={onOpenProgression} /></div>
          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ['Level', level?.level ?? 0],
              ['Total XP', progression?.xp ?? 0],
              ['Badges', earnedBadgeCount],
              ['Paths completed', completedPaths.length],
            ].map(([label, value]) => <div key={label} className="rounded-md border border-white/10 bg-white/[0.03] p-3"><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 font-bold text-white">{value}</dd></div>)}
          </dl>
          {completedPaths.length ? <div className="mt-5"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Completed paths</p><div className="mt-2 flex flex-wrap gap-2">{completedPaths.map((item) => { const completedPath = getProgressionPath(item.path_id); return <span key={item.path_id} className={`rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold ${completedPath?.accentClass ?? 'text-cyan-100'}`}>{completedPath?.name ?? item.path_id}</span> })}</div></div> : null}
        </article>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <button type="button" onClick={onOpenShop} className="rounded-lg border border-white/10 bg-slate-950/35 p-5 text-left transition hover:border-cyan-300/70 hover:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-cyan-300"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-300 text-2xl font-bold text-slate-950">$</span><span className="mt-4 block font-bold text-white">Point Shop</span><span className="mt-1 block text-sm leading-5 text-slate-300">Spend points on name colors and profile borders.</span></button>
        <button type="button" onClick={onOpenCustomization} className="rounded-lg border border-white/10 bg-slate-950/35 p-5 text-left transition hover:border-cyan-300/70 hover:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-cyan-300"><span className="flex h-12 w-12 items-center justify-center rounded-full border border-violet-300/40 bg-violet-300/10 text-xl text-violet-100">✦</span><span className="mt-4 block font-bold text-white">Customization</span><span className="mt-1 block text-sm leading-5 text-slate-300">Equip owned colors, borders, and application themes.</span></button>
        <button type="button" disabled className="rounded-lg border border-white/10 bg-slate-950/25 p-5 text-left opacity-65"><span className="flex h-12 w-12 items-center justify-center rounded-full border border-amber-300/50 bg-amber-300/10 text-2xl font-bold text-amber-100">!</span><span className="mt-4 block font-bold text-slate-200">Coming Soon</span><span className="mt-1 block text-sm leading-5 text-slate-400">More achievements and profile rewards are being planned.</span></button>
      </div>

      {isBadgeEditorOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4" role="dialog" aria-modal="true" aria-labelledby="badge-showcase-title" onMouseDown={(event) => { if (event.target === event.currentTarget && !isUpdatingShowcase) setIsBadgeEditorOpen(false) }}>
          <section className="max-h-full w-full max-w-2xl overflow-y-auto rounded-xl border border-white/10 bg-slate-950 p-6 shadow-2xl shadow-cyan-950/60">
            <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">Profile badges</p><h2 id="badge-showcase-title" className="mt-2 text-2xl font-bold">Edit badge showcase</h2><p className="mt-2 text-sm text-slate-300">Choose up to three badges you have earned. {draftBadgeKeys.length}/3 selected.</p></div><button type="button" disabled={isUpdatingShowcase} onClick={() => setIsBadgeEditorOpen(false)} className="rounded-md border border-white/15 px-3 py-2 text-sm font-semibold transition hover:border-cyan-300 hover:text-cyan-100 disabled:opacity-50">Close</button></div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {earnedBadges.map((badge) => {
                const key = `${badge.pathId}:${badge.id}`
                const selected = draftBadgeKeys.includes(key)
                const cannotAdd = !selected && draftBadgeKeys.length >= 3
                return <button key={key} type="button" disabled={cannotAdd || isUpdatingShowcase} onClick={() => toggleDraftBadge(badge.pathId, badge.id)} className={`rounded-lg border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-45 ${selected ? 'border-cyan-300 bg-cyan-300/10' : 'border-white/10 bg-white/[0.04] hover:border-white/25'}`}><span className="flex items-start gap-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${selected ? 'border-cyan-300/50 text-cyan-100' : 'border-white/15 text-slate-400'}`}>◆</span><span><span className={`block font-bold ${badge.accentClass}`}>{badge.label}</span><span className="mt-1 block text-xs text-slate-400">{badge.pathName} · {badge.description}</span></span></span></button>
              })}
            </div>
            <div className="mt-6 flex justify-end gap-2"><button type="button" disabled={isUpdatingShowcase} onClick={() => setIsBadgeEditorOpen(false)} className="rounded-md border border-white/15 px-4 py-2 text-sm font-semibold transition hover:border-cyan-300 hover:text-cyan-100 disabled:opacity-50">Cancel</button><button type="button" disabled={isUpdatingShowcase} onClick={() => void saveBadgeShowcase()} className="rounded-md bg-cyan-300 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-50">{isUpdatingShowcase ? 'Saving…' : 'Save showcase'}</button></div>
          </section>
        </div>
      ) : null}
    </section>
  )
}
