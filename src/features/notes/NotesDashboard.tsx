import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  createNote,
  createNoteFolder,
  deleteNote,
  deleteNoteFolder,
  getNoteFolders,
  getNotes,
  updateNote,
  updateNoteFolder,
  type Note,
  type NoteFolder,
} from './noteService'

type NoteForm = { title: string; content: string; folderId: string | null }

const emptyForm: NoteForm = { title: '', content: '', folderId: null }

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String(error.message)
  }
  return 'Something went wrong.'
}

export function NotesDashboard() {
  const [notes, setNotes] = useState<Note[]>([])
  const [folders, setFolders] = useState<NoteFolder[]>([])
  const [activeFolderId, setActiveFolderId] = useState('')
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [form, setForm] = useState<NoteForm>(emptyForm)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingNoteId, setDeletingNoteId] = useState('')
  const [isFolderFormOpen, setIsFolderFormOpen] = useState(false)
  const [editingFolder, setEditingFolder] = useState<NoteFolder | null>(null)
  const [folderName, setFolderName] = useState('')
  const [isSavingFolder, setIsSavingFolder] = useState(false)
  const [isDeleteFolderOpen, setIsDeleteFolderOpen] = useState(false)
  const [isDeletingFolder, setIsDeletingFolder] = useState(false)

  const activeFolder = folders.find((folder) => folder.id === activeFolderId) ?? null
  const activeFolderNoteCount = activeFolder
    ? notes.filter((note) => note.folder_id === activeFolder.id).length
    : 0

  async function refreshNotesAndFolders() {
    setIsLoading(true)
    setError('')
    const [notesResponse, foldersResponse] = await Promise.all([
      getNotes(),
      getNoteFolders(),
    ])
    const nextFolders = foldersResponse.data ?? []
    setNotes(notesResponse.data ?? [])
    setFolders(nextFolders)
    setActiveFolderId((current) =>
      current && !nextFolders.some((folder) => folder.id === current) ? '' : current,
    )
    setError(
      notesResponse.error
        ? errorMessage(notesResponse.error)
        : foldersResponse.error
          ? errorMessage(foldersResponse.error)
          : '',
    )
    setIsLoading(false)
  }

  useEffect(() => {
    let isMounted = true

    async function loadNotesAndFolders() {
      const [notesResponse, foldersResponse] = await Promise.all([
        getNotes(),
        getNoteFolders(),
      ])
      if (!isMounted) return

      setNotes(notesResponse.data ?? [])
      setFolders(foldersResponse.data ?? [])
      setError(
        notesResponse.error
          ? errorMessage(notesResponse.error)
          : foldersResponse.error
            ? errorMessage(foldersResponse.error)
            : '',
      )
      setIsLoading(false)
    }

    void loadNotesAndFolders()

    return () => {
      isMounted = false
    }
  }, [])

  const notesInCurrentLocation = useMemo(
    () => notes.filter((note) =>
      activeFolderId ? note.folder_id === activeFolderId : note.folder_id === null,
    ),
    [activeFolderId, notes],
  )

  const visibleNotes = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return notesInCurrentLocation

    return notesInCurrentLocation.filter(
      (note) =>
        note.title.toLowerCase().includes(query) ||
        note.content.toLowerCase().includes(query),
    )
  }, [notesInCurrentLocation, search])

  const visibleFolders = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return folders
    return folders.filter((folder) => folder.name.toLowerCase().includes(query))
  }, [folders, search])

  function openFolder(folder: NoteFolder) {
    setActiveFolderId(folder.id)
    setSearch('')
    setError('')
    setNotice('')
  }

  function returnToAllNotes() {
    setActiveFolderId('')
    setSearch('')
    setError('')
    setNotice('')
  }

  function openNewNote() {
    setEditingNote(null)
    setForm({ ...emptyForm, folderId: activeFolderId || null })
    setError('')
    setNotice('')
    setIsFormOpen(true)
  }

  function openNote(note: Note) {
    setEditingNote(note)
    setForm({ title: note.title, content: note.content, folderId: note.folder_id })
    setError('')
    setNotice('')
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

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const title = form.title.trim()
    if (!title) return

    setIsSaving(true)
    setError('')
    const input = { title, content: form.content, folderId: form.folderId }
    const { data, error: saveError } = editingNote
      ? await updateNote(editingNote.id, input)
      : await createNote(input)

    if (saveError || !data) {
      setError(saveError ? errorMessage(saveError) : 'The note could not be saved.')
      setIsSaving(false)
      return
    }

    setNotes((current) => [
      data,
      ...current.filter((note) => note.id !== data.id),
    ])
    setNotice(editingNote ? 'Note updated.' : 'Note created.')
    setIsSaving(false)
    setIsFormOpen(false)
    setEditingNote(null)
    setForm(emptyForm)
    setDeletingNoteId('')
  }

  async function handleDelete(note: Note) {
    setIsSaving(true)
    setError('')
    const { error: deleteError } = await deleteNote(note.id)

    if (deleteError) {
      setError(errorMessage(deleteError))
      setIsSaving(false)
      return
    }

    setNotes((current) => current.filter((item) => item.id !== note.id))
    setNotice('Note deleted.')
    setIsSaving(false)
    setIsFormOpen(false)
    setEditingNote(null)
    setForm(emptyForm)
    setDeletingNoteId('')
  }

  function openNewFolder() {
    setEditingFolder(null)
    setFolderName('')
    setError('')
    setNotice('')
    setIsFolderFormOpen(true)
  }

  function openRenameFolder() {
    if (!activeFolder) return
    setEditingFolder(activeFolder)
    setFolderName(activeFolder.name)
    setError('')
    setNotice('')
    setIsFolderFormOpen(true)
  }

  function closeFolderForm() {
    if (isSavingFolder) return
    setIsFolderFormOpen(false)
    setEditingFolder(null)
    setFolderName('')
    setError('')
  }

  async function handleSaveFolder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!folderName.trim()) return
    setIsSavingFolder(true)
    setError('')

    const response = editingFolder
      ? await updateNoteFolder(editingFolder.id, folderName)
      : await createNoteFolder(folderName)

    if (response.error || !response.data) {
      setError(response.error ? errorMessage(response.error) : 'The folder could not be saved.')
      setIsSavingFolder(false)
      return
    }

    const savedFolder = response.data
    setFolders((current) => [
      savedFolder,
      ...current.filter((folder) => folder.id !== savedFolder.id),
    ].sort((first, second) => first.name.localeCompare(second.name)))
    setNotice(editingFolder ? 'Folder renamed.' : 'Folder created.')
    setIsSavingFolder(false)
    setIsFolderFormOpen(false)
    setEditingFolder(null)
    setFolderName('')
  }

  async function handleDeleteFolder(deleteContents: boolean) {
    if (!activeFolder) return
    setIsDeletingFolder(true)
    setError('')
    const response = await deleteNoteFolder(activeFolder.id, deleteContents)
    if (response.error) {
      setError(errorMessage(response.error))
      setIsDeletingFolder(false)
      return
    }

    setNotes((current) => deleteContents
      ? current.filter((note) => note.folder_id !== activeFolder.id)
      : current.map((note) =>
          note.folder_id === activeFolder.id ? { ...note, folder_id: null } : note,
        ),
    )
    setFolders((current) => current.filter((folder) => folder.id !== activeFolder.id))
    setActiveFolderId('')
    setSearch('')
    setIsDeleteFolderOpen(false)
    setIsDeletingFolder(false)
    setNotice(
      deleteContents
        ? 'Folder and its notes deleted.'
        : 'Folder deleted. Its notes are now in All notes.',
    )
  }

  return (
    <>
      <section className="rounded-lg border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-cyan-950/30">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            {activeFolder ? (
              <div className="flex min-w-0 items-center gap-2">
                <button
                  type="button"
                  onClick={returnToAllNotes}
                  aria-label="Back to all notes"
                  title="Back to all notes"
                  className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md border border-white/15 text-cyan-200 transition hover:border-cyan-300 hover:bg-cyan-300/10 hover:text-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-300"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m15 18-6-6 6-6" />
                  </svg>
                </button>
                <button type="button" onClick={returnToAllNotes} className="cursor-pointer text-2xl font-bold text-cyan-200 underline-offset-4 transition hover:text-cyan-100 hover:underline focus:outline-none focus:underline">
                  Notes
                </button>
                <span className="text-2xl text-slate-500">/</span>
                <h2 className="truncate text-2xl font-bold" title={activeFolder.name}>
                  {activeFolder.name}
                </h2>
              </div>
            ) : (
              <h2 className="text-2xl font-bold">Notes</h2>
            )}
            <p className="mt-1 text-sm text-slate-300">
              {activeFolder
                ? `Notes filed in ${activeFolder.name}.`
                : 'Keep assignment details, ideas, and reference information organized.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {activeFolder ? (
              <>
                <button type="button" onClick={openRenameFolder} className="rounded-md border border-white/15 px-3 py-2 text-sm font-semibold transition hover:border-cyan-300 hover:text-cyan-200">
                  Rename folder
                </button>
                <button type="button" onClick={() => { setError(''); setIsDeleteFolderOpen(true) }} className="rounded-md border border-rose-300/50 px-3 py-2 text-sm font-semibold text-rose-100 transition hover:border-rose-200 hover:bg-rose-300 hover:text-rose-950">
                  Delete folder
                </button>
              </>
            ) : (
              <button type="button" onClick={openNewFolder} className="rounded-md border border-white/15 px-4 py-2 text-sm font-semibold transition hover:border-cyan-300 hover:text-cyan-200">
                New folder
              </button>
            )}
            <button type="button" onClick={openNewNote} className="rounded-md bg-cyan-300 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-cyan-200">
              New note
            </button>
            <button type="button" onClick={() => void refreshNotesAndFolders()} className="rounded-md border border-white/15 px-4 py-2 text-sm font-semibold transition hover:border-cyan-300 hover:text-cyan-200">
              Refresh
            </button>
          </div>
        </div>

        <label className="mt-5 block">
          <span className="sr-only">Search notes{activeFolder ? ` in ${activeFolder.name}` : ' and folders'}</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={activeFolder ? `Search notes in ${activeFolder.name}` : 'Search folders and unfiled notes'}
            className="w-full rounded-md border border-white/10 bg-slate-900 px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-500 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
          />
        </label>

        {error && !isFormOpen && !isFolderFormOpen ? (
          <p className="mt-4 rounded-md border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className="mt-4 rounded-md border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-sm text-cyan-100">
            {notice}
          </p>
        ) : null}

        {!activeFolder ? (
          <section className="mt-6 border-b border-white/10 pb-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Folders</h3>
              <span className="text-xs font-semibold text-slate-500">{folders.length}</span>
            </div>
            {isLoading ? <p className="mt-4 text-sm text-slate-300">Loading folders...</p> : null}
            {!isLoading && folders.length === 0 ? (
              <p className="mt-4 text-sm text-slate-400">No folders yet. Create one to organize related notes.</p>
            ) : null}
            {!isLoading && folders.length > 0 && visibleFolders.length === 0 ? (
              <p className="mt-4 text-sm text-slate-400">No folders match that search.</p>
            ) : null}
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {visibleFolders.map((folder) => {
                const noteCount = notes.filter((note) => note.folder_id === folder.id).length
                return (
                  <button
                    key={folder.id}
                    type="button"
                    onClick={() => openFolder(folder)}
                    className="flex min-w-0 items-center gap-3 rounded-lg border border-white/10 bg-slate-900/70 p-3 text-left transition hover:border-cyan-300/70 hover:bg-cyan-300/10 focus:outline-none focus:ring-2 focus:ring-cyan-300"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-cyan-300/10 text-cyan-200">
                      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 6.75A1.75 1.75 0 0 1 4.75 5h4.1l1.8 2h8.6A1.75 1.75 0 0 1 21 8.75v8.5A1.75 1.75 0 0 1 19.25 19H4.75A1.75 1.75 0 0 1 3 17.25V6.75Z" />
                      </svg>
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-white" title={folder.name}>{folder.name}</span>
                      <span className="mt-0.5 block text-xs text-slate-400">{noteCount} note{noteCount === 1 ? '' : 's'}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        ) : null}

        <section className={activeFolder ? 'mt-6' : 'mt-5'}>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
              {activeFolder ? `Notes in ${activeFolder.name}` : 'Unfiled notes'}
            </h3>
            <span className="text-xs font-semibold text-slate-500">{notesInCurrentLocation.length}</span>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {isLoading ? <p className="text-sm text-slate-300">Loading notes...</p> : null}
            {!isLoading && notesInCurrentLocation.length === 0 ? (
              <div className="rounded-lg border border-dashed border-white/15 p-6 md:col-span-2 lg:col-span-3">
                <p className="font-semibold">{activeFolder ? 'This folder is empty' : 'No unfiled notes'}</p>
                <p className="mt-2 text-sm text-slate-300">
                  {activeFolder
                    ? 'Create a note here or move an existing note into this folder.'
                    : 'Create a note, or open a folder to view notes filed there.'}
                </p>
              </div>
            ) : null}
            {!isLoading && notesInCurrentLocation.length > 0 && visibleNotes.length === 0 ? (
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
      </section>

      {isFormOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-8" role="dialog" aria-modal="true" aria-labelledby="note-modal-title" onMouseDown={(event) => { if (event.target === event.currentTarget) closeForm() }}>
          <section className="max-h-full w-full max-w-3xl overflow-y-auto rounded-lg border border-white/10 bg-slate-950 p-6 shadow-2xl shadow-cyan-950/60">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">Note</p>
                <h2 id="note-modal-title" className="mt-2 text-2xl font-bold">{editingNote ? 'Edit note' : 'New note'}</h2>
              </div>
              <button type="button" onClick={closeForm} className="rounded-md border border-white/15 px-3 py-2 text-sm font-semibold transition hover:border-cyan-300 hover:text-cyan-200">Close</button>
            </div>

            <form className="mt-6 space-y-4" onSubmit={(event) => void handleSave(event)}>
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
                Folder
                <select
                  value={form.folderId ?? ''}
                  onChange={(event) => setForm((current) => ({ ...current, folderId: event.target.value || null }))}
                  className="mt-2 w-full rounded-md border border-white/10 bg-slate-900 px-3 py-3 text-white outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
                >
                  <option value="">All notes (no folder)</option>
                  {folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
                </select>
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
                        <button type="button" disabled={isSaving} onClick={() => setDeletingNoteId('')} className="rounded-md border border-white/15 px-4 py-2 text-sm font-semibold transition hover:border-cyan-300 hover:text-cyan-200">Cancel</button>
                        <button type="button" disabled={isSaving} onClick={() => void handleDelete(editingNote)} className="rounded-md bg-rose-300 px-4 py-2 text-sm font-bold text-rose-950 transition hover:bg-rose-200">Confirm delete</button>
                      </div>
                    ) : (
                      <button type="button" disabled={isSaving} onClick={() => setDeletingNoteId(editingNote.id)} className="rounded-md border border-rose-300/50 px-4 py-2 text-sm font-semibold text-rose-100 transition hover:border-rose-200 hover:bg-rose-300 hover:text-rose-950">Delete note</button>
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

      {isFolderFormOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4" role="dialog" aria-modal="true" aria-labelledby="folder-modal-title" onMouseDown={(event) => { if (event.target === event.currentTarget) closeFolderForm() }}>
          <form onSubmit={(event) => void handleSaveFolder(event)} className="w-full max-w-md rounded-xl border border-white/10 bg-slate-950 p-6 shadow-2xl shadow-cyan-950/60">
            <h2 id="folder-modal-title" className="text-2xl font-bold">{editingFolder ? 'Rename folder' : 'New folder'}</h2>
            <p className="mt-2 text-sm text-slate-300">Folders keep related notes together without changing their content.</p>
            <label className="mt-5 block text-sm font-semibold text-slate-200">
              Folder name
              <input
                required
                autoFocus
                maxLength={80}
                value={folderName}
                onChange={(event) => setFolderName(event.target.value)}
                placeholder="Work"
                className="mt-2 w-full rounded-md border border-white/10 bg-slate-900 px-3 py-3 text-white outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
              />
            </label>
            {error ? <p className="mt-4 rounded-md border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">{error}</p> : null}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" disabled={isSavingFolder} onClick={closeFolderForm} className="rounded-md border border-white/15 px-4 py-2 font-semibold transition hover:border-cyan-300 hover:text-cyan-200 disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={isSavingFolder || !folderName.trim()} className="rounded-md bg-cyan-300 px-4 py-2 font-bold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60">
                {isSavingFolder ? 'Saving...' : editingFolder ? 'Save name' : 'Create folder'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {isDeleteFolderOpen && activeFolder ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-folder-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isDeletingFolder) {
              setIsDeleteFolderOpen(false)
              setError('')
            }
          }}
        >
          <section className="w-full max-w-lg rounded-xl border border-white/10 bg-slate-950 p-6 shadow-2xl shadow-rose-950/40">
            <p className="text-xs font-bold uppercase tracking-wider text-rose-200">Delete folder</p>
            <h2 id="delete-folder-title" className="mt-2 break-words text-2xl font-bold">
              What should happen to “{activeFolder.name}”?
            </h2>
            {activeFolderNoteCount > 0 ? (
              <p className="mt-3 text-sm leading-6 text-slate-300">
                This folder contains {activeFolderNoteCount} note{activeFolderNoteCount === 1 ? '' : 's'}. You can keep them by moving them to All notes, or permanently delete them with the folder.
              </p>
            ) : (
              <p className="mt-3 text-sm leading-6 text-slate-300">
                This folder is empty and can be safely deleted.
              </p>
            )}

            {error ? (
              <p className="mt-4 rounded-md border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
                {error}
              </p>
            ) : null}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={isDeletingFolder}
                onClick={() => { setIsDeleteFolderOpen(false); setError('') }}
                className="rounded-md border border-white/15 px-4 py-2 text-sm font-semibold transition hover:border-cyan-300 hover:text-cyan-200 disabled:opacity-50"
              >
                Cancel
              </button>
              {activeFolderNoteCount > 0 ? (
                <button
                  type="button"
                  disabled={isDeletingFolder}
                  onClick={() => void handleDeleteFolder(false)}
                  className="rounded-md border border-cyan-300/50 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-200 hover:bg-cyan-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isDeletingFolder ? 'Deleting...' : 'Move notes to All notes'}
                </button>
              ) : null}
              <button
                type="button"
                disabled={isDeletingFolder}
                onClick={() => void handleDeleteFolder(activeFolderNoteCount > 0)}
                className="rounded-md bg-rose-300 px-4 py-2 text-sm font-bold text-rose-950 transition hover:bg-rose-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDeletingFolder
                  ? 'Deleting...'
                  : activeFolderNoteCount > 0
                    ? 'Delete folder and notes'
                    : 'Delete folder'}
              </button>
            </div>
            {activeFolderNoteCount > 0 ? (
              <p className="mt-3 text-right text-xs font-semibold text-rose-200">
                Deleting the notes cannot be undone.
              </p>
            ) : null}
          </section>
        </div>
      ) : null}
    </>
  )
}
