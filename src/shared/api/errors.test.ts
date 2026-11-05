import { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { describe, expect, it } from 'vitest'
import { apiClient } from './client'
import {
  ApiError,
  NETWORK_ERROR_CODE,
  UNKNOWN_ERROR_CODE,
  VALIDATION_ERROR_CODE,
  isApiError,
  isClientError,
  isNetworkError,
  isNotFound,
  isRetryable,
  isRunFailed,
  isRunInProgress,
  toApiError,
} from './errors'

const config = { headers: {} } as InternalAxiosRequestConfig

function httpError(status: number, data: unknown): AxiosError {
  return new AxiosError('Request failed', AxiosError.ERR_BAD_REQUEST, config, null, {
    status,
    statusText: '',
    headers: {},
    config,
    data,
  })
}

function envelope(code: string, message: string) {
  return { error: { code, message } }
}

describe('toApiError', () => {
  it('409 RUN_FAILED: берёт code и message из ответа и status из HTTP', () => {
    const error = toApiError(httpError(409, envelope('RUN_FAILED', 'Прогон завершился ошибкой')))

    expect(error).toBeInstanceOf(ApiError)
    expect(error.code).toBe('RUN_FAILED')
    expect(error.status).toBe(409)
    expect(error.message).toBe('Прогон завершился ошибкой')
    expect(isRunFailed(error)).toBe(true)
  })

  it('сетевая ошибка без ответа: NETWORK_ERROR, status = null', () => {
    const networkError = new AxiosError('Network Error', AxiosError.ERR_NETWORK, config, {})
    const error = toApiError(networkError)

    expect(error.code).toBe(NETWORK_ERROR_CODE)
    expect(error.status).toBeNull()
    expect(error.message).toMatch(/Не удалось связаться с сервером/)
    expect(isNetworkError(error)).toBe(true)
  })

  it('таймаут без ответа считается сетевой ошибкой', () => {
    const timeout = new AxiosError('timeout', AxiosError.ECONNABORTED, config, {})

    expect(toApiError(timeout)).toMatchObject({ code: NETWORK_ERROR_CODE, status: null })
  })

  it('422 от FastAPI с { detail } превращается в VALIDATION_ERROR', () => {
    const error = toApiError(httpError(422, { detail: [{ msg: 'bad' }] }))

    expect(error.code).toBe(VALIDATION_ERROR_CODE)
    expect(error.status).toBe(422)
  })

  it('ответ без конверта ошибки: UNKNOWN_ERROR со статусом ответа', () => {
    const error = toApiError(httpError(500, 'Internal Server Error'))

    expect(error.code).toBe(UNKNOWN_ERROR_CODE)
    expect(error.status).toBe(500)
  })

  it('частичный конверт (без message) не считается ошибкой API', () => {
    const error = toApiError(httpError(400, { error: { code: 'INVALID_PARAM' } }))

    expect(error.code).toBe(UNKNOWN_ERROR_CODE)
  })

  it('ApiError возвращается как есть', () => {
    const original = new ApiError('RUN_NOT_FOUND', 'нет', 404)

    expect(toApiError(original)).toBe(original)
  })

  it('обычный Error и неизвестные значения: UNKNOWN_ERROR, status = null', () => {
    expect(toApiError(new Error('boom'))).toMatchObject({
      code: UNKNOWN_ERROR_CODE,
      message: 'boom',
      status: null,
    })
    expect(toApiError('строка')).toMatchObject({
      code: UNKNOWN_ERROR_CODE,
      message: 'Неизвестная ошибка',
      status: null,
    })
  })
})

describe('предикаты', () => {
  const runFailed = new ApiError('RUN_FAILED', '', 409)
  const inProgress = new ApiError('RUN_IN_PROGRESS', '', 409)
  const notFound = new ApiError('ISSUE_NOT_FOUND', '', 404)
  const network = new ApiError(NETWORK_ERROR_CODE, '', null)
  const server = new ApiError(UNKNOWN_ERROR_CODE, '', 503)

  it('isApiError', () => {
    expect(isApiError(runFailed)).toBe(true)
    expect(isApiError(new Error('x'))).toBe(false)
    expect(isApiError(null)).toBe(false)
  })

  it('isRunFailed и isRunInProgress различают коды', () => {
    expect(isRunFailed(runFailed)).toBe(true)
    expect(isRunFailed(inProgress)).toBe(false)
    expect(isRunInProgress(inProgress)).toBe(true)
    expect(isRunInProgress(runFailed)).toBe(false)
    expect(isRunFailed(new Error('RUN_FAILED'))).toBe(false)
  })

  it('isNotFound по статусу 404', () => {
    expect(isNotFound(notFound)).toBe(true)
    expect(isNotFound(runFailed)).toBe(false)
    expect(isNotFound(network)).toBe(false)
  })

  it('isClientError: только 4xx', () => {
    expect(isClientError(runFailed)).toBe(true)
    expect(isClientError(notFound)).toBe(true)
    expect(isClientError(server)).toBe(false)
    expect(isClientError(network)).toBe(false)
    expect(isClientError(new Error('x'))).toBe(false)
  })

  it('isRetryable: сеть и 5xx, но не 4xx', () => {
    expect(isRetryable(network)).toBe(true)
    expect(isRetryable(server)).toBe(true)
    expect(isRetryable(runFailed)).toBe(false)
    expect(isRetryable(notFound)).toBe(false)
    expect(isRetryable(new Error('x'))).toBe(false)
  })
})

describe('apiClient: перехватчик ответов', () => {
  it('отклоняет запрос с ApiError (409 RUN_FAILED), без реальной сети', async () => {
    const adapter = (requestConfig: InternalAxiosRequestConfig) =>
      Promise.reject(
        new AxiosError('Request failed', AxiosError.ERR_BAD_REQUEST, requestConfig, null, {
          status: 409,
          statusText: 'Conflict',
          headers: {},
          config: requestConfig,
          data: envelope('RUN_FAILED', 'Прогон завершился ошибкой'),
        }),
      )

    const rejection = await apiClient.get('/api/kkd/summary', { adapter }).catch((e: unknown) => e)

    expect(rejection).toBeInstanceOf(ApiError)
    expect(rejection).toMatchObject({ code: 'RUN_FAILED', status: 409 })
  })

  it('сетевой сбой превращается в ApiError со status = null', async () => {
    const adapter = (requestConfig: InternalAxiosRequestConfig) =>
      Promise.reject(new AxiosError('Network Error', AxiosError.ERR_NETWORK, requestConfig, {}))

    const rejection = await apiClient.get('/api/meta', { adapter }).catch((e: unknown) => e)

    expect(rejection).toMatchObject({ code: NETWORK_ERROR_CODE, status: null })
  })
})
