import { Typography } from 'antd'
import { useEffect, useState } from 'react'

const SLOW_LOADING_DELAY_MS = 3_000

interface SlowLoadingHintProps {
  loading: boolean
}

/** Подсказка, если загрузка идёт дольше 3 секунд. */
export function SlowLoadingHint({ loading }: SlowLoadingHintProps) {
  const [isSlow, setIsSlow] = useState(false)

  useEffect(() => {
    if (!loading) return undefined
    const timer = window.setTimeout(() => setIsSlow(true), SLOW_LOADING_DELAY_MS)
    return () => {
      window.clearTimeout(timer)
      setIsSlow(false)
    }
  }, [loading])

  return (
    <div role="status" aria-live="polite">
      {loading && isSlow ? (
        <Typography.Text type="secondary">Загрузка занимает больше обычного…</Typography.Text>
      ) : null}
    </div>
  )
}
