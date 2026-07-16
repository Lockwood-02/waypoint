import type { GroupMember } from './groupService'

type GroupMembersViewProps = {
  members: GroupMember[]
  nameClass: (userId: string) => string
}

export function GroupMembersView({ members, nameClass }: GroupMembersViewProps) {
  function avatarFrameClass(frame: string | null) {
    switch (frame) {
      case 'frame-cyan': return 'border-[#67e8f9] shadow-[#67e8f9]/30'
      case 'frame-gold': return 'border-amber-300 shadow-amber-300/30'
      case 'frame-fire': return 'border-orange-400 shadow-orange-400/40'
      case 'frame-rose': return 'border-rose-300 shadow-rose-300/30'
      case 'frame-violet': return 'border-violet-300 shadow-violet-300/30'
      case 'frame-emerald': return 'border-emerald-300 shadow-emerald-300/30'
      case 'frame-blue': return 'border-blue-300 shadow-blue-300/30'
      case 'frame-orange': return 'border-orange-300 shadow-orange-300/30'
      default: return 'border-white/15 shadow-cyan-950/20'
    }
  }

  return (
    <section className="mt-5">
      <div>
        <h3 className="text-lg font-semibold">Group members</h3>
        <p className="mt-1 text-sm text-slate-300">Everyone currently collaborating in this group.</p>
      </div>
      <div className="mt-4 max-h-[25rem] space-y-2 overflow-y-auto pr-1">
        {members.map((member) => (
          <article key={member.user_id} className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-slate-900/70 p-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 bg-cyan-300/10 font-bold text-cyan-100 shadow-lg ${avatarFrameClass(member.selected_avatar_frame)}`}>{member.avatar_url ? <img src={member.avatar_url} alt="" className="h-full w-full object-cover" /> : member.display_name.charAt(0).toUpperCase()}</span>
              <p className={`truncate font-semibold ${nameClass(member.user_id)}`}>{member.display_name}</p>
            </div>
            <span className="shrink-0 rounded-full border border-white/15 px-2.5 py-1 text-xs font-semibold capitalize text-slate-300">{member.role}</span>
          </article>
        ))}
      </div>
    </section>
  )
}
