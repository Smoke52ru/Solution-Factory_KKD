import axios from 'axios'
import { toApiError } from './errors'

const REQUEST_TIMEOUT_MS = 30_000

/** Пустой `VITE_API_URL` — относительные пути `/api` (прокси Vite или nginx). */
export const apiBaseUrl: string = import.meta.env.VITE_API_URL ?? ''

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: REQUEST_TIMEOUT_MS,
  headers: { Accept: 'application/json' },
})

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(toApiError(error)),
)
