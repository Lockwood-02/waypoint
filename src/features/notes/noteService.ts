import { supabase } from '../../lib/supabaseClient'

export type Note = {
  id: string
  user_id: string
  title: string
  content: string
  created_at: string
  updated_at: string
}

export type NoteInput = {
  title: string
  content: string
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
    .insert({ user_id: user.id, title: input.title, content: input.content })
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
