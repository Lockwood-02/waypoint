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

export async function updateProfileAvatar(userId: string, avatarUrl: string) {
  return supabase
    .from('profiles')
    .update({
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single()
}

export async function uploadProfileAvatar(userId: string, file: File) {
  const extension = file.name.split('.').pop() || 'png'
  const filePath = `${userId}/avatar-${Date.now()}.${extension}`
  const uploadResponse = await supabase.storage
    .from('avatars')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    })

  if (uploadResponse.error) {
    return { data: null, error: uploadResponse.error }
  }

  const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)

  return updateProfileAvatar(userId, data.publicUrl)
}

export async function updateProfileCosmetics(
  userId: string,
  updates: {
    total_points: number
    selected_avatar_frame?: string | null
    selected_name_color?: string | null
  },
) {
  return supabase
    .from('profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single()
}
