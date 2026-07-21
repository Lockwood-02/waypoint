import { supabase } from '../../lib/supabaseClient'

export type ReportTemplate =
  | 'weekly-progress'
  | 'spreadsheet-progress'
  | 'project-status-outline'

export type SavedReportDraftData = {
  version: 1
  reportTemplate: ReportTemplate
  periodStart: string
  periodEnd: string
  selectedProgressTaskIds: string[]
  selectedCompletedTaskIds: string[]
  excludedCompletedTaskIds: string[]
  selectedGroupTaskIds: string[]
  taskComments: Record<string, string>
}

export type SavedReport = {
  id: string
  user_id: string
  name: string
  draft_data: SavedReportDraftData
  created_at: string
  updated_at: string
}

export async function getSavedReports() {
  const response = await supabase
    .from('saved_reports')
    .select('*')
    .order('updated_at', { ascending: false })

  return { ...response, data: response.data as SavedReport[] | null }
}

export async function createSavedReport(name: string, draftData: SavedReportDraftData) {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return { data: null, error: userError ?? new Error('Not logged in') }
  }

  const response = await supabase
    .from('saved_reports')
    .insert({
      user_id: user.id,
      name: name.trim(),
      draft_data: draftData,
    })
    .select()
    .single()

  return { ...response, data: response.data as SavedReport | null }
}

export async function updateSavedReport(
  reportId: string,
  name: string,
  draftData: SavedReportDraftData,
) {
  const response = await supabase
    .from('saved_reports')
    .update({
      name: name.trim(),
      draft_data: draftData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reportId)
    .select()
    .single()

  return { ...response, data: response.data as SavedReport | null }
}

export async function deleteSavedReport(reportId: string) {
  return supabase.from('saved_reports').delete().eq('id', reportId)
}
