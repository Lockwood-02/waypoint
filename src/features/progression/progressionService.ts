import { supabase } from '../../lib/supabaseClient'
import type { ProgressionPathId, XpBundle } from './progressionConfig'

export type ProfileProgression = {
  user_id: string
  path_id: ProgressionPathId
  xp: number
  equipped_title_id: string | null
  locked_at: string
  updated_at: string
}

export type ProgressionPurchaseResult = {
  total_points: number
  xp: number
}

export type CompletedProgressionPath = {
  user_id: string
  path_id: ProgressionPathId
  completed_at: string
}

export async function getProfileProgression(userId: string) {
  const response = await supabase
    .from('profile_progressions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  return { ...response, data: response.data as ProfileProgression | null }
}

export async function chooseProgressionPath(pathId: ProgressionPathId) {
  const response = await supabase.rpc('choose_progression_path', {
    requested_path_id: pathId,
  })
  return { ...response, data: response.data as ProfileProgression | null }
}

export async function getCompletedProgressionPaths(userId: string) {
  const response = await supabase
    .from('completed_progression_paths')
    .select('*')
    .eq('user_id', userId)
    .order('completed_at', { ascending: true })
  return { ...response, data: response.data as CompletedProgressionPath[] | null }
}

export async function switchProgressionPath(pathId: ProgressionPathId) {
  const response = await supabase.rpc('switch_progression_path', {
    requested_path_id: pathId,
  })
  return { ...response, data: response.data as ProfileProgression | null }
}

export async function purchaseXpBundle(bundleId: XpBundle['id']) {
  const response = await supabase.rpc('purchase_progression_xp_bundle', {
    requested_bundle_id: bundleId,
  })
  return { ...response, data: response.data as ProgressionPurchaseResult | null }
}

export async function equipProgressionTitle(titleId: string) {
  const response = await supabase.rpc('equip_progression_title', {
    requested_title_id: titleId,
  })
  return { ...response, data: response.data as ProfileProgression | null }
}
