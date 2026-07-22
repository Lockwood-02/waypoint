import { supabase } from '../../lib/supabaseClient'
import { INPUT_LIMITS } from '../../lib/inputLimits'

export type Note = {
  id: string
  user_id: string
  folder_id: string | null
  title: string
  content: string
  created_at: string
  updated_at: string
}

export type NoteFolder = {
  id: string
  user_id: string
  name: string
  created_at: string
  updated_at: string
}

export type NoteInput = {
  title: string
  content: string
  folderId: string | null
}

function validateNoteInput(input: NoteInput) {
  if (!input.title.trim()) return new Error('Note title is required.')
  if (input.title.trim().length > INPUT_LIMITS.noteTitle) return new Error(`Note titles are limited to ${INPUT_LIMITS.noteTitle} characters.`)
  if (input.content.length > INPUT_LIMITS.noteContent) return new Error(`Notes are limited to ${INPUT_LIMITS.noteContent} characters.`)
  return null
}

function validateFolderName(name: string) {
  if (!name.trim()) return new Error('Folder name is required.')
  if (name.trim().length > INPUT_LIMITS.noteFolderName) return new Error(`Folder names are limited to ${INPUT_LIMITS.noteFolderName} characters.`)
  return null
}

export async function getNotes() {
  const response = await supabase
    .from('notes')
    .select('*')
    .order('updated_at', { ascending: false })

  return {
    ...response,
    data: response.data ? (response.data as Note[]) : null,
  }
}

export async function createNote(input: NoteInput) {
  const validationError = validateNoteInput(input)
  if (validationError) return { data: null, error: validationError }
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { data: null, error: userError ?? new Error('Not logged in') }
  }

  const response = await supabase
    .from('notes')
    .insert({
      user_id: user.id,
      folder_id: input.folderId,
      title: input.title,
      content: input.content,
    })
    .select()
    .single()

  return {
    ...response,
    data: response.data ? (response.data as Note) : null,
  }
}

export async function updateNote(noteId: string, input: NoteInput) {
  const validationError = validateNoteInput(input)
  if (validationError) return { data: null, error: validationError }
  const response = await supabase
    .from('notes')
    .update({
      title: input.title,
      content: input.content,
      folder_id: input.folderId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', noteId)
    .select()
    .single()

  return {
    ...response,
    data: response.data ? (response.data as Note) : null,
  }
}

export async function deleteNote(noteId: string) {
  return supabase.from('notes').delete().eq('id', noteId)
}

export async function getNoteFolders() {
  const response = await supabase
    .from('note_folders')
    .select('*')
    .order('name', { ascending: true })

  return {
    ...response,
    data: response.data ? (response.data as NoteFolder[]) : null,
  }
}

export async function createNoteFolder(name: string) {
  const validationError = validateFolderName(name)
  if (validationError) return { data: null, error: validationError }
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { data: null, error: userError ?? new Error('Not logged in') }
  }

  const response = await supabase
    .from('note_folders')
    .insert({ user_id: user.id, name: name.trim() })
    .select()
    .single()

  return {
    ...response,
    data: response.data ? (response.data as NoteFolder) : null,
  }
}

export async function updateNoteFolder(folderId: string, name: string) {
  const validationError = validateFolderName(name)
  if (validationError) return { data: null, error: validationError }
  const response = await supabase
    .from('note_folders')
    .update({ name: name.trim(), updated_at: new Date().toISOString() })
    .eq('id', folderId)
    .select()
    .single()

  return {
    ...response,
    data: response.data ? (response.data as NoteFolder) : null,
  }
}

export async function deleteNoteFolder(folderId: string, deleteContents: boolean) {
  const notesResponse = deleteContents
    ? await supabase.from('notes').delete().eq('folder_id', folderId)
    : await supabase
        .from('notes')
        .update({ folder_id: null, updated_at: new Date().toISOString() })
        .eq('folder_id', folderId)

  if (notesResponse.error) return notesResponse

  return supabase.from('note_folders').delete().eq('id', folderId)
}
