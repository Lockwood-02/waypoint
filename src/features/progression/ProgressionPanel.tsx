import { useState } from 'react'
import type { Profile } from '../profiles/profileService'
import {
  getNextProgressionLevel,
  getProgressionLevel,
  getProgressionPath,
  getProgressionTitle,
  maximumProgressionXp,
  progressionPaths,
  xpBundles,
  type ProgressionPath,
  type ProgressionPathId,
  type XpBundle,
} from './progressionConfig'
import type { CompletedProgressionPath, ProfileProgression } from './progressionService'

type ProgressionSummaryProps = {
  progression: ProfileProgression | null
  isLoading: boolean
  onOpen: () => void
}

type ProgressionModalProps = {
  profile: Profile
  progression: ProfileProgression | null
  completedPaths: CompletedProgressionPath[]
  isUpdating: boolean
  message: string
  onChoosePath: (pathId: ProgressionPathId) => void
  onSwitchPath: (pathId: ProgressionPathId) => void
  onBuyBundle: (bundle: XpBundle) => void
  onEquipTitle: (titleId: string) => void
  onClose: () => void
}

function progressDetails(path: ProgressionPath, xp: number) {
  const currentLevel = getProgressionLevel(path, xp)
  const nextLevel = getNextProgressionLevel(path, xp)
  const percentage = nextLevel
    ? Math.max(0, Math.min(100, ((xp - currentLevel.requiredXp) / (nextLevel.requiredXp - currentLevel.requiredXp)) * 100))
    : 100
  return { currentLevel, nextLevel, percentage }
}

export function ProgressionSummary({ progression, isLoading, onOpen }: ProgressionSummaryProps) {
  const path = getProgressionPath(progression?.path_id)
  const details = path && progression ? progressDetails(path, progression.xp) : null

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-lg border border-white/10 bg-white/[0.06] p-5 text-left shadow-xl shadow-cyan-950/20 transition hover:border-cyan-300/60 hover:bg-white/[0.09] focus:outline-none focus:ring-2 focus:ring-cyan-300"
    >
      <span className="flex items-center justify-between gap-3">
        <span>
          <span className="block text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Progression path</span>
          <span className={`mt-1 block font-bold ${path?.accentClass ?? 'text-white'}`}>
            {isLoading ? 'Loading…' : path && details ? `${path.name} · Level ${details.currentLevel.level}` : 'Choose your path'}
          </span>
        </span>
        <span className="text-sm font-semibold text-cyan-200">{path ? 'View path' : 'Begin'} →</span>
      </span>
      <span className="mt-4 block h-3 overflow-hidden rounded-full bg-slate-900 ring-1 ring-white/10">
        <span
          className={`block h-full rounded-full bg-gradient-to-r transition-all duration-500 ${path?.barClass ?? 'from-slate-600 to-slate-500'}`}
          style={{ width: `${details?.percentage ?? 0}%` }}
        />
      </span>
      <span className="mt-2 flex justify-between gap-3 text-xs text-slate-400">
        <span>{details?.currentLevel.title ?? 'No path locked in'}</span>
        <span>{details?.nextLevel ? `${progression?.xp ?? 0}/${details.nextLevel.requiredXp} XP` : path ? `${maximumProgressionXp} XP · Mastered` : '0 XP'}</span>
      </span>
    </button>
  )
}

export function ProgressionModal({
  profile,
  progression,
  completedPaths,
  isUpdating,
  message,
  onChoosePath,
  onSwitchPath,
  onBuyBundle,
  onEquipTitle,
  onClose,
}: ProgressionModalProps) {
  const [selectedPathId, setSelectedPathId] = useState<ProgressionPathId | null>(null)
  const [isChangingPath, setIsChangingPath] = useState(false)
  const path = getProgressionPath(progression?.path_id)
  const selectedPath = getProgressionPath(selectedPathId)
  const details = path && progression ? progressDetails(path, progression.xp) : null
  const equippedTitle = getProgressionTitle(progression?.equipped_title_id)
  const completedPathIds = new Set(completedPaths.map((item) => item.path_id))
  const completedLegacyPaths = progressionPaths.filter(
    (option) => completedPathIds.has(option.id) && option.id !== progression?.path_id,
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 px-4 py-8" role="dialog" aria-modal="true" aria-labelledby="progression-title" onMouseDown={(event) => { if (event.target === event.currentTarget && !isUpdating) onClose() }}>
      <section className="max-h-full w-full max-w-4xl overflow-y-auto rounded-xl border border-white/10 bg-slate-950 p-6 shadow-2xl shadow-cyan-950/60">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-300">Waypoint paths</p>
            <h2 id="progression-title" className="mt-2 text-2xl font-bold">{path ? `${path.name} progression` : 'Choose your path'}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              {path ? 'Spend earned points on XP, unlock titles, and collect badges as you advance. You can change paths, but unfinished progress will be reset.' : 'Your path determines the titles and badges you can earn. You can change later, but only completed paths preserve their progress.'}
            </p>
          </div>
          <button type="button" disabled={isUpdating} onClick={onClose} className="shrink-0 rounded-md border border-white/15 px-3 py-2 text-sm font-semibold transition hover:border-cyan-300 hover:text-cyan-200 disabled:opacity-60">Close</button>
        </div>

        {!path ? (
          <>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {progressionPaths.map((option) => (
                <button key={option.id} type="button" onClick={() => setSelectedPathId(option.id)} className={`rounded-lg border p-4 text-left transition ${selectedPathId === option.id ? 'border-cyan-300 bg-cyan-300/10' : 'border-white/10 bg-white/[0.04] hover:border-white/25 hover:bg-white/[0.07]'}`}>
                  <span className={`font-bold ${option.accentClass}`}>{option.name}</span>
                  <span className="mt-2 block text-sm leading-5 text-slate-300">{option.description}</span>
                  <span className="mt-3 block text-xs text-slate-400">Final title: {option.levels[option.levels.length - 1].title}</span>
                </button>
              ))}
            </div>
            {selectedPath ? (
              <div className="mt-6 rounded-lg border border-amber-300/30 bg-amber-300/10 p-4">
                <h3 className="font-bold text-amber-100">Begin the {selectedPath.name} path?</h3>
                <p className="mt-1 text-sm leading-5 text-amber-50/80">You will begin as “{selectedPath.levels[0].title}” with 0 XP. Changing paths before completion will erase that path’s progress.</p>
                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <button type="button" disabled={isUpdating} onClick={() => setSelectedPathId(null)} className="rounded-md border border-white/15 px-4 py-2 text-sm font-semibold transition hover:border-cyan-300 hover:text-cyan-200 disabled:opacity-60">Choose another</button>
                  <button type="button" disabled={isUpdating} onClick={() => onChoosePath(selectedPath.id)} className="rounded-md bg-cyan-300 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-60">{isUpdating ? 'Starting path…' : 'Begin path'}</button>
                </div>
              </div>
            ) : null}
          </>
        ) : progression && details ? (
          <>
            <div className="mt-6 rounded-lg border border-white/10 bg-white/[0.04] p-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div><p className={`text-xl font-bold ${equippedTitle?.path.accentClass ?? path.accentClass}`}>{equippedTitle?.level.title ?? details.currentLevel.title}</p><p className="mt-1 text-sm text-slate-300">Level {details.currentLevel.level} · {progression.xp} total XP</p></div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-cyan-100">{profile.total_points} points available</p>
                  <button type="button" disabled={isUpdating} onClick={() => { setSelectedPathId(null); setIsChangingPath((current) => !current) }} className="rounded-md border border-white/15 px-3 py-2 text-sm font-semibold transition hover:border-cyan-300 hover:text-cyan-200 disabled:opacity-60">{isChangingPath ? 'Keep current path' : 'Change path'}</button>
                </div>
              </div>
              <div className="mt-4 h-4 overflow-hidden rounded-full bg-slate-900 ring-1 ring-white/10"><div className={`h-full rounded-full bg-gradient-to-r ${path.barClass}`} style={{ width: `${details.percentage}%` }} /></div>
              <div className="mt-2 flex justify-between gap-3 text-xs text-slate-400"><span>{details.currentLevel.title}</span><span>{details.nextLevel ? `${details.nextLevel.requiredXp - progression.xp} XP until ${details.nextLevel.title}` : 'Path mastered'}</span></div>
            </div>

            {isChangingPath ? (
              <section className="mt-6 rounded-lg border border-amber-300/30 bg-amber-300/10 p-5">
                <h3 className="font-bold text-amber-100">Choose a different active path</h3>
                <p className="mt-1 text-sm leading-5 text-amber-50/80">
                  {progression.xp >= maximumProgressionXp
                    ? `${path.name} is complete, so its titles, badges, and completion will be preserved.`
                    : `Leaving ${path.name} now will permanently erase its ${progression.xp} XP and unfinished rewards.`}
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {progressionPaths.filter((option) => option.id !== path.id).map((option) => {
                    const completed = completedPathIds.has(option.id)
                    return (
                      <button key={option.id} type="button" onClick={() => setSelectedPathId(option.id)} className={`rounded-lg border p-3 text-left transition ${selectedPathId === option.id ? 'border-cyan-300 bg-cyan-300/10' : 'border-white/10 bg-slate-950/40 hover:border-white/25'}`}>
                        <span className={`font-bold ${option.accentClass}`}>{option.name}</span>
                        <span className="mt-2 block text-xs text-slate-300">{completed ? 'Completed · progress preserved' : 'Starts at 0 XP'}</span>
                      </button>
                    )
                  })}
                </div>
                {selectedPath ? (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-amber-200/15 pt-4">
                    <p className="text-sm text-amber-50/90">
                      Switch to <strong>{selectedPath.name}</strong>? {completedPathIds.has(selectedPath.id) ? 'It will reopen at full completion.' : 'It will begin at 0 XP.'}
                    </p>
                    <button type="button" disabled={isUpdating} onClick={() => { onSwitchPath(selectedPath.id); setSelectedPathId(null); setIsChangingPath(false) }} className="rounded-md bg-amber-300 px-4 py-2 text-sm font-bold text-amber-950 transition hover:bg-amber-200 disabled:opacity-60">{isUpdating ? 'Changing path…' : 'Confirm path change'}</button>
                  </div>
                ) : null}
              </section>
            ) : null}

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <section>
                <h3 className="text-lg font-bold">Buy XP</h3>
                <p className="mt-1 text-sm text-slate-400">Points are deducted immediately. XP purchases cannot be reversed.</p>
                <div className="mt-3 space-y-3">
                  {xpBundles.map((bundle) => {
                    const canAfford = profile.total_points >= bundle.points
                    const isMastered = progression.xp >= maximumProgressionXp
                    return <article key={bundle.id} className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/[0.04] p-4"><div><h4 className="font-semibold">{bundle.name}</h4><p className="mt-1 text-sm text-slate-300">+{bundle.xp} XP</p></div><button type="button" disabled={isUpdating || !canAfford || isMastered} onClick={() => onBuyBundle(bundle)} className="shrink-0 rounded-md bg-cyan-300 px-3 py-2 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50">{isMastered ? 'Mastered' : canAfford ? `${bundle.points} pts` : `Need ${bundle.points - profile.total_points}`}</button></article>
                  })}
                </div>
              </section>

              <section>
                <h3 className="text-lg font-bold">Titles</h3>
                <p className="mt-1 text-sm text-slate-400">Equip any title you have unlocked.</p>
                <div className="mt-3 space-y-2">
                  {path.levels.map((level) => {
                    const unlocked = progression.xp >= level.requiredXp
                    const equipped = progression.equipped_title_id === level.titleId
                    return <button key={level.titleId} type="button" disabled={isUpdating || !unlocked || equipped} onClick={() => onEquipTitle(level.titleId)} className="flex w-full items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-3 text-left transition hover:border-cyan-300/60 disabled:cursor-not-allowed disabled:opacity-55"><span><span className="block font-semibold">{level.title}</span><span className="mt-0.5 block text-xs text-slate-400">Level {level.level} · {level.requiredXp} XP</span></span><span className="text-xs font-bold text-cyan-200">{equipped ? 'Equipped' : unlocked ? 'Equip' : 'Locked'}</span></button>
                  })}
                </div>
              </section>
            </div>

            <section className="mt-6">
              <h3 className="text-lg font-bold">Path badges</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {path.badges.map((badge) => {
                  const earned = progression.xp >= badge.requiredXp
                  return <article key={badge.id} className={`rounded-lg border p-4 ${earned ? 'border-cyan-300/30 bg-cyan-300/10' : 'border-white/10 bg-white/[0.03] opacity-55'}`}><span className={`flex h-10 w-10 items-center justify-center rounded-full border text-lg ${earned ? 'border-cyan-300/50 bg-cyan-300/10 text-cyan-100' : 'border-white/15 text-slate-500'}`}>{earned ? '◆' : '◇'}</span><h4 className="mt-3 font-semibold">{badge.label}</h4><p className="mt-1 text-xs leading-5 text-slate-400">{badge.description}</p></article>
                })}
              </div>
            </section>

            {completedLegacyPaths.length ? (
              <section className="mt-6">
                <h3 className="text-lg font-bold">Completed path titles</h3>
                <p className="mt-1 text-sm text-slate-400">Titles from mastered paths remain available no matter which path is active.</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {completedLegacyPaths.map((completedPath) => (
                    <article key={completedPath.id} className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                      <h4 className={`font-bold ${completedPath.accentClass}`}>{completedPath.name}</h4>
                      <p className="mt-1 text-xs text-slate-400">Complete · All titles and badges preserved</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {completedPath.levels.map((level) => {
                          const equipped = progression.equipped_title_id === level.titleId
                          return (
                            <button key={level.titleId} type="button" disabled={isUpdating || equipped} onClick={() => onEquipTitle(level.titleId)} className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-cyan-300 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-55">
                              {equipped ? `${level.title} · Equipped` : level.title}
                            </button>
                          )
                        })}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 border-t border-white/10 pt-3">
                        {completedPath.badges.map((badge) => <span key={badge.id} className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-2.5 py-1 text-xs font-semibold text-cyan-100">◆ {badge.label}</span>)}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        ) : null}

        {message ? <p className="mt-5 rounded-md border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-sm text-cyan-100">{message}</p> : null}
      </section>
    </div>
  )
}
