import type { GroupMember } from './groupService'

type GroupMembersViewProps = {
  members: GroupMember[]
  nameClass: (userId: string) => string
}

export function GroupMembersView({ members, nameClass }: GroupMembersViewProps) {
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
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-300/10 font-bold text-cyan-100">{member.display_name.charAt(0).toUpperCase()}</span>
              <p className={`truncate font-semibold ${nameClass(member.user_id)}`}>{member.display_name}</p>
            </div>
            <span className="shrink-0 rounded-full border border-white/15 px-2.5 py-1 text-xs font-semibold capitalize text-slate-300">{member.role}</span>
          </article>
        ))}
      </div>
    </section>
  )
}
