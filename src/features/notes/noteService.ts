import { supabase } from '../../lib/supabaseClient'

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

export async function deleteNoteFolder(folderId: string) {
  const moveNotesResponse = await supabase
    .from('notes')
    .update({ folder_id: null, updated_at: new Date().toISOString() })
    .eq('folder_id', folderId)

  if (moveNotesResponse.error) return moveNotesResponse

  return supabase.from('note_folders').delete().eq('id', folderId)
}
