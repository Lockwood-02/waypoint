import { useState, type FormEvent, type KeyboardEvent } from 'react'
import type { GroupMessage } from './groupService'

type GroupChatViewProps = {
  messages: GroupMessage[]
  messageDraft: string
  isSending: boolean
  memberName: (userId: string) => string
  memberNameClass: (userId: string) => string
  onDraftChange: (value: string) => void
  onSubmit: (event: FormEvent) => void
}

export function GroupChatView({ messages, messageDraft, isSending, memberName, memberNameClass, onDraftChange, onSubmit }: GroupChatViewProps) {
  const [expandedMessageIds, setExpandedMessageIds] = useState<string[]>([])

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey) return
    event.preventDefault()
    if (!messageDraft.trim() || isSending) return
    event.currentTarget.form?.requestSubmit()
  }

  function toggleExpanded(messageId: string) {
    setExpandedMessageIds((current) => current.includes(messageId)
      ? current.filter((id) => id !== messageId)
      : [...current, messageId])
  }

  return (
    <div className="mt-5 flex h-[28rem] flex-col rounded-lg border border-white/10 bg-slate-950/40">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 ? <div className="flex h-full items-center justify-center text-center"><div><p className="font-semibold text-white">No messages yet</p><p className="mt-2 text-sm text-slate-300">Start the conversation with your group.</p></div></div> : null}
        {messages.map((message) => {
          const isExpanded = expandedMessageIds.includes(message.id)
          const canExpand = message.body.length > 100 || message.body.includes('\n')
          return (
            <article key={message.id} className="rounded-lg border border-white/10 bg-slate-900/70 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2"><p className={`text-sm font-semibold ${memberNameClass(message.user_id)}`}>{memberName(message.user_id)}</p><time className="text-xs text-slate-500">{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(message.created_at))}</time></div>
              <p className={`mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-200 ${isExpanded ? '' : 'line-clamp-1'}`}>{message.body}</p>
              {canExpand ? <button type="button" onClick={() => toggleExpanded(message.id)} className="mt-1 text-xs font-semibold text-cyan-200 transition hover:text-cyan-100">{isExpanded ? 'Show less' : 'Show more'}</button> : null}
            </article>
          )
        })}
      </div>
      <form onSubmit={onSubmit} className="flex gap-2 border-t border-white/10 p-3">
        <textarea required maxLength={2000} rows={2} value={messageDraft} onChange={(event) => onDraftChange(event.target.value)} onKeyDown={handleComposerKeyDown} placeholder="Write a message… Enter to send, Shift+Enter for a new line" className="min-h-12 flex-1 resize-none rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30" />
        <button type="submit" disabled={isSending || !messageDraft.trim()} className="self-end rounded-md bg-cyan-300 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60">{isSending ? 'Sending…' : 'Send'}</button>
      </form>
    </div>
  )
}
