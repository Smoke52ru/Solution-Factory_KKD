import { apiClient } from './client'
import type {
  Issue,
  KkdSummary,
  MetaResponse,
  Paginated,
  Run,
} from './types'

export async function fetchMeta(): Promise<MetaResponse> {
  const { data } = await apiClient.get<MetaResponse>('/api/meta')
  return data
}

export async function fetchRuns(params?: {
  limit?: number
  offset?: number
}): Promise<Paginated<Run> | Run[]> {
  const { data } = await apiClient.get<Paginated<Run> | Run[]>('/api/runs', {
    params,
  })
  return data
}

export async function fetchRun(runId: string): Promise<Run> {
  const { data } = await apiClient.get<Run>(`/api/runs/${runId}`)
  return data
}

export async function startRun(): Promise<Run> {
  const { data } = await apiClient.post<Run>('/api/runs')
  return data
}

export async function fetchSummary(params?: {
  run_id?: string
  unit_id?: string
}): Promise<KkdSummary> {
  const { data } = await apiClient.get<KkdSummary>('/api/kkd/summary', {
    params,
  })
  return data
}

export async function fetchIssues(params?: {
  run_id?: string
  unit_id?: string
  rule_code?: string
  severity?: string
  delta_status?: string
  object_type?: string
  q?: string
  sort?: string
  limit?: number
  offset?: number
}): Promise<Paginated<Issue>> {
  const { data } = await apiClient.get<Paginated<Issue>>('/api/kkd/issues', {
    params,
  })
  return data
}

export async function resetDemo(): Promise<void> {
  await apiClient.post('/api/reset')
}
