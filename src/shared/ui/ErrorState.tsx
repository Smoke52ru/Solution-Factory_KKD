import { ReloadOutlined } from '@ant-design/icons'
import { Button, Result } from 'antd'
import { isNetworkError, isNotFound, isRetryable } from '@/shared/api/errors'

interface ErrorStateProps {
  error: unknown
  /** Кнопка «Повторить» показывается только для сетевых сбоев и 5xx. */
  onRetry?: () => void
  retrying?: boolean
}

function errorTitle(error: unknown): string {
  if (isNetworkError(error)) return 'Нет связи с сервером'
  if (isNotFound(error)) return 'Ничего не найдено'
  if (isRetryable(error)) return 'Сервер временно недоступен'
  return 'Не удалось загрузить данные'
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Неизвестная ошибка'
}

/** Ошибка секции: понятный текст и «Повторить». Не ломает соседние секции. */
export function ErrorState({ error, onRetry, retrying = false }: ErrorStateProps) {
  const canRetry = onRetry !== undefined && isRetryable(error)

  return (
    <Result
      status="error"
      title={errorTitle(error)}
      subTitle={errorMessage(error)}
      extra={
        canRetry ? (
          <Button type="primary" icon={<ReloadOutlined />} loading={retrying} onClick={onRetry}>
            Повторить
          </Button>
        ) : undefined
      }
    />
  )
}
