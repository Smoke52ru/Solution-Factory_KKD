import { isAxiosError } from 'axios'

export const NETWORK_ERROR_CODE = 'NETWORK_ERROR'
export const UNKNOWN_ERROR_CODE = 'UNKNOWN_ERROR'
export const VALIDATION_ERROR_CODE = 'VALIDATION_ERROR'

const HTTP_CLIENT_ERROR_MIN = 400
const HTTP_SERVER_ERROR_MIN = 500
const HTTP_NOT_FOUND = 404

const NETWORK_ERROR_MESSAGE = 'Не удалось связаться с сервером. Проверьте подключение и повторите попытку.'
const UNKNOWN_ERROR_MESSAGE = 'Неизвестная ошибка'

/** Код ошибки API (`error.code`) или один из клиентских кодов. */
export type ApiErrorCode =
  | 'RUN_FAILED'
  | 'RUN_IN_PROGRESS'
  | 'RUN_NOT_FOUND'
  | 'UNIT_NOT_FOUND'
  | 'ISSUE_NOT_FOUND'
  | 'INVALID_PARAM'
  | typeof NETWORK_ERROR_CODE
  | typeof UNKNOWN_ERROR_CODE
  | typeof VALIDATION_ERROR_CODE
  | (string & {})

/** Единый вид ошибки для UI: ответ `{ error: { code, message } }` или сетевой сбой. */
export class ApiError extends Error {
  readonly code: ApiErrorCode
  /** HTTP-статус; `null`, если ответа не было (сеть, таймаут). */
  readonly status: number | null

  constructor(code: ApiErrorCode, message: string, status: number | null) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

interface ErrorEnvelope {
  error: { code: string; message: string }
}

function isErrorEnvelope(data: unknown): data is ErrorEnvelope {
  if (typeof data !== 'object' || data === null || !('error' in data)) return false
  const { error } = data
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    typeof error.code === 'string' &&
    typeof error.message === 'string'
  )
}

/** Приводит любую ошибку запроса к `ApiError`. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error

  if (isAxiosError(error)) {
    const { response } = error
    if (!response) return new ApiError(NETWORK_ERROR_CODE, NETWORK_ERROR_MESSAGE, null)

    if (isErrorEnvelope(response.data)) {
      const { code, message } = response.data.error
      return new ApiError(code, message, response.status)
    }
    // Ошибки валидации FastAPI приходят как `{ detail: [...] }`.
    const code = response.status === 422 ? VALIDATION_ERROR_CODE : UNKNOWN_ERROR_CODE
    return new ApiError(code, error.message || UNKNOWN_ERROR_MESSAGE, response.status)
  }

  const message = error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE
  return new ApiError(UNKNOWN_ERROR_CODE, message, null)
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

/** Нет ответа сервера: обрыв сети, таймаут, CORS. */
export function isNetworkError(error: unknown): error is ApiError {
  return isApiError(error) && error.code === NETWORK_ERROR_CODE
}

export function isNotFound(error: unknown): error is ApiError {
  return isApiError(error) && error.status === HTTP_NOT_FOUND
}

/** 4xx: повтор запроса бессмысленен. */
export function isClientError(error: unknown): error is ApiError {
  return (
    isApiError(error) &&
    error.status !== null &&
    error.status >= HTTP_CLIENT_ERROR_MIN &&
    error.status < HTTP_SERVER_ERROR_MIN
  )
}

/** 5xx и сетевые сбои: уместна кнопка «Повторить». */
export function isRetryable(error: unknown): boolean {
  return isApiError(error) && (error.status === null || error.status >= HTTP_SERVER_ERROR_MIN)
}
