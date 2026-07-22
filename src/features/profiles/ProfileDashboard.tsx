import type { ChangeEvent } from 'react'
import { ProgressionSummary } from '../progression/ProgressionPanel'
import {
  getProgressionLevel,
  getProgressionPath,
  getProgressionTitle,
} from '../progression/progressionConfig'
import type {
  CompletedProgressionPath,
  ProfileProgression,
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
  isLoadingProgression: boolean
  isUpdatingProfile: boolean
  openTaskCount: number
  completedTaskCount: number
  onAvatarUpload: (event: ChangeEvent<HTMLInputElement>) => void
  onOpenProgression: () => void
  onOpenShop: () => void
  onOpenCustomization: () => void
}

export function ProfileDashboard({
  profile,
  profileError,
  profileMessage,
  nameClass,
  avatarFrameClass,
  progression,
  completedPaths,
  isLoadingProgression,
  isUpdatingProfile,
  openTaskCount,
  completedTaskCount,
  onAvatarUpload,
  onOpenProgression,
  onOpenShop,
  onOpenCustomization,
}: ProfileDashboardProps) {
  const path = getProgressionPath(progression?.path_id)
  const level = path && progression ? getProgressionLevel(path, progression.xp) : null
  const equippedTitle = getProgressionTitle(progression?.equipped_title_id)
  const activeBadges = path && progression
    ? path.badges.filter((badge) => progression.xp >= badge.requiredXp).length
    : 0
  const completedOtherBadges = completedPaths.filter((item) => item.path_id !== progression?.path_id).length * 3
  const earnedBadgeCount = activeBadges + completedOtherBadges

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
    </section>
  )
}
