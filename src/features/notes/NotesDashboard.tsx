import { useEffect, useMemo, useState } from 'react'
import {
  createNote,
  deleteNote,
  getNotes,
  updateNote,
  type Note,
} from './noteService'

type NoteForm = { title: string; content: string }

const emptyForm: NoteForm = { title: '', content: '' }

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function NotesDashboard() {
  const [notes, setNotes] = useState<Note[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState<NoteForm>(emptyForm)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingNoteId, setDeletingNoteId] = useState('')

  async function refreshNotes() {
    setIsLoading(true)
    const { data, error: loadError } = await getNotes()
    setNotes(data ?? [])
    setError(loadError?.message ?? '')
    setIsLoading(false)
  }

  useEffect(() => {
    let isMounted = true

    async function loadNotes() {
      const { data, error: loadError } = await getNotes()
      if (!isMounted) return

      setNotes(data ?? [])
      setError(loadError?.message ?? '')
      setIsLoading(false)
    }

    void loadNotes()

    return () => {
      isMounted = false
    }
  }, [])

  const visibleNotes = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return notes

    return notes.filter(
      (note) =>
        note.title.toLowerCase().includes(query) ||
        note.content.toLowerCase().includes(query),
    )
  }, [notes, search])

  function openNewNote() {
    setEditingNote(null)
    setForm(emptyForm)
    setError('')
    setIsFormOpen(true)
  }

  function openNote(note: Note) {
    setEditingNote(note)
    setForm({ title: note.title, content: note.content })
    setError('')
    setDeletingNoteId('')
    setIsFormOpen(true)
  }

  function closeForm() {
    if (isSaving) return
    setIsFormOpen(false)
    setEditingNote(null)
    setForm(emptyForm)
    setDeletingNoteId('')
    setError('')
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const title = form.title.trim()
    if (!title) return

    setIsSaving(true)
    setError('')
    const input = { title, content: form.content }
    const { data, error: saveError } = editingNote
      ? await updateNote(editingNote.id, input)
      : await createNote(input)

    if (saveError || !data) {
      setError(saveError?.message ?? 'The note could not be saved.')
      setIsSaving(false)
      return
    }

    setNotes((current) => [
      data,
      ...current.filter((note) => note.id !== data.id),
    ])
    setIsSaving(false)
    closeForm()
  }

  async function handleDelete(note: Note) {
    setIsSaving(true)
    setError('')
    const { error: deleteError } = await deleteNote(note.id)

    if (deleteError) {
      setError(deleteError.message)
      setIsSaving(false)
      return
    }

    setNotes((current) => current.filter((item) => item.id !== note.id))
    setIsSaving(false)
    setIsFormOpen(false)
    setEditingNote(null)
    setForm(emptyForm)
    setDeletingNoteId('')
  }

  return (
    <>
      <section className="rounded-lg border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-cyan-950/30">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Notes</h2>
            <p className="mt-1 text-sm text-slate-300">
              Keep assignment details, ideas, and reference information nearby.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={openNewNote}
              className="rounded-md bg-cyan-300 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-cyan-200"
            >
              New note
            </button>
            <button
              type="button"
              onClick={refreshNotes}
              className="rounded-md border border-white/15 px-4 py-2 text-sm font-semibold transition hover:border-cyan-300 hover:text-cyan-200"
            >
              Refresh
            </button>
          </div>
        </div>

        <label className="mt-5 block">
          <span className="sr-only">Search notes</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search note titles and text"
            className="w-full rounded-md border border-white/10 bg-slate-900 px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-500 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
          />
        </label>

        {error && !isFormOpen ? (
          <p className="mt-4 rounded-md border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
            Notes could not be loaded: {error}
          </p>
        ) : null}

        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? <p className="text-sm text-slate-300">Loading notes...</p> : null}
          {!isLoading && notes.length === 0 ? (
            <div className="rounded-lg border border-dashed border-white/15 p-6 md:col-span-2 lg:col-span-3">
              <p className="font-semibold">No notes yet</p>
              <p className="mt-2 text-sm text-slate-300">Create a note for information you want to keep close to your tasks.</p>
            </div>
          ) : null}
          {!isLoading && notes.length > 0 && visibleNotes.length === 0 ? (
            <p className="text-sm text-slate-300">No notes match that search.</p>
          ) : null}
          {visibleNotes.map((note) => (
            <button
              key={note.id}
              type="button"
              onClick={() => openNote(note)}
              className="min-h-44 rounded-lg border border-white/10 bg-slate-900/70 p-5 text-left transition hover:border-cyan-300/70 focus:outline-none focus:ring-2 focus:ring-cyan-300"
            >
              <h3 className="font-semibold text-white">{note.title}</h3>
              <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                {note.content || 'No note text yet.'}
              </p>
              <p className="mt-4 text-xs font-semibold text-slate-500">
                Updated {formatUpdatedAt(note.updated_at)}
              </p>
            </button>
          ))}
        </div>
      </section>

      {isFormOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-8" role="dialog" aria-modal="true" aria-labelledby="note-modal-title">
          <section className="max-h-full w-full max-w-3xl overflow-y-auto rounded-lg border border-white/10 bg-slate-950 p-6 shadow-2xl shadow-cyan-950/60">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">Note</p>
                <h2 id="note-modal-title" className="mt-2 text-2xl font-bold">{editingNote ? 'Edit note' : 'New note'}</h2>
              </div>
              <button type="button" onClick={closeForm} className="rounded-md border border-white/15 px-3 py-2 text-sm font-semibold hover:border-cyan-300 hover:text-cyan-200">Close</button>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleSave}>
              <label className="block text-sm font-semibold text-slate-200">
                Title
                <input
                  required
                  maxLength={200}
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  className="mt-2 w-full rounded-md border border-white/10 bg-slate-900 px-3 py-3 text-white outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
                  placeholder="Assignment research"
                />
              </label>
              <label className="block text-sm font-semibold text-slate-200">
                Note text
                <textarea
                  value={form.content}
                  onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
                  className="mt-2 min-h-80 w-full resize-y rounded-md border border-white/10 bg-slate-900 px-3 py-3 font-mono text-sm leading-6 text-white outline-none placeholder:text-slate-500 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
                  placeholder="Write your notes here..."
                />
              </label>
              {error ? <p className="rounded-md border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">{error}</p> : null}
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  {editingNote ? (
                    deletingNoteId === editingNote.id ? (
                      <div className="flex gap-2">
                        <button type="button" disabled={isSaving} onClick={() => setDeletingNoteId('')} className="rounded-md border border-white/15 px-4 py-2 text-sm font-semibold">Cancel</button>
                        <button type="button" disabled={isSaving} onClick={() => handleDelete(editingNote)} className="rounded-md bg-rose-300 px-4 py-2 text-sm font-bold text-rose-950">Confirm delete</button>
                      </div>
                    ) : (
                      <button type="button" disabled={isSaving} onClick={() => setDeletingNoteId(editingNote.id)} className="rounded-md border border-rose-300/50 px-4 py-2 text-sm font-semibold text-rose-100">Delete note</button>
                    )
                  ) : null}
                </div>
                <button type="submit" disabled={isSaving || !form.title.trim()} className="rounded-md bg-cyan-300 px-5 py-2 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60">
                  {isSaving ? 'Saving...' : 'Save note'}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  )
}
