import { apiClient } from './client'
import type {
  IssueDetail,
  IssuesQuery,
  IssuesResponse,
  MetaResponse,
  RunsResponse,
  SummaryQuery,
  SummaryResponse,
} from './types'

interface RequestOptions {
  signal?: AbortSignal
}

export interface RunsParams {
  limit?: number
  offset?: number
}

/** Пустой список превращается в `undefined`, непустой — в CSV, как ждёт API. */
function toCsv(values: readonly string[] | undefined): string | undefined {
  return values && values.length > 0 ? values.join(',') : undefined
}

export async function getMeta({ signal }: RequestOptions = {}): Promise<MetaResponse> {
  const { data } = await apiClient.get<MetaResponse>('/api/meta', { signal })
  return data
}

export async function getRuns(
  params: RunsParams = {},
  { signal }: RequestOptions = {},
): Promise<RunsResponse> {
  const { data } = await apiClient.get<RunsResponse>('/api/runs', { params, signal })
  return data
}

export async function getSummary(
  { runId, unitId }: SummaryQuery,
  { signal }: RequestOptions = {},
): Promise<SummaryResponse> {
  const { data } = await apiClient.get<SummaryResponse>('/api/kkd/summary', {
    params: { run_id: runId, unit_id: unitId },
    signal,
  })
  return data
}

export async function getIssues(
  query: IssuesQuery,
  { signal }: RequestOptions = {},
): Promise<IssuesResponse> {
  const { data } = await apiClient.get<IssuesResponse>('/api/kkd/issues', {
    params: {
      run_id: query.runId,
      unit_id: query.unitId,
      rule_code: toCsv(query.ruleCodes),
      severity: toCsv(query.severities),
      delta_status: toCsv(query.deltaStatuses),
      object_type: query.objectType,
      q: query.q?.trim() || undefined,
      sort: query.sort,
      limit: query.limit,
      offset: query.offset,
    },
    signal,
  })
  return data
}

export async function getIssue(
  issueId: string,
  runId: string,
  { signal }: RequestOptions = {},
): Promise<IssueDetail> {
  const { data } = await apiClient.get<IssueDetail>(
    `/api/kkd/issues/${encodeURIComponent(issueId)}`,
    { params: { run_id: runId }, signal },
  )
  return data
}
