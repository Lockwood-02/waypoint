import type { User } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabaseClient'

export type Profile = {
  id: string
  display_name: string
  avatar_url: string | null
  total_points: number
  selected_name_color: string | null
  selected_avatar_frame: string | null
  created_at: string
  updated_at: string
}

export async function getProfile(userId: string) {
  return supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
}

export async function ensureProfile(user: User) {
  const displayName =
    typeof user.user_metadata.display_name === 'string' &&
    user.user_metadata.display_name.trim()
      ? user.user_metadata.display_name.trim()
      : 'Player'

  const existingProfile = await getProfile(user.id)

  if (existingProfile.error) {
    return existingProfile
  }

  if (existingProfile.data) {
    return existingProfile
  }

  return supabase
    .from('profiles')
    .insert({
      id: user.id,
      display_name: displayName,
    })
    .select()
    .single()
}
