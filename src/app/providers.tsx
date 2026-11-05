import '@ant-design/v5-patch-for-react-19'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { App as AntApp, ConfigProvider, theme as antdTheme } from 'antd'
import ruRU from 'antd/locale/ru_RU'
import { useEffect, type PropsWithChildren } from 'react'
import { isClientError } from '@/shared/api/errors'
import { theme } from './theme'

const MAX_RETRIES = 1

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // На 4xx повтор бессмысленен; сетевые сбои и 5xx повторяем один раз.
      retry: (failureCount, error) => !isClientError(error) && failureCount < MAX_RETRIES,
    },
  },
})

/** Переносит токены темы на `body`, чтобы в CSS не было захардкоженных цветов. */
function BodyTheme() {
  const { token } = antdTheme.useToken()

  useEffect(() => {
    const { style } = document.body
    style.background = token.colorBgLayout
    style.color = token.colorText
    style.fontFamily = token.fontFamily
    style.fontSize = `${token.fontSize}px`
    style.lineHeight = String(token.lineHeight)
  }, [token])

  return null
}

export function Providers({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={theme} locale={ruRU}>
        <AntApp>
          <BodyTheme />
          {children}
        </AntApp>
      </ConfigProvider>
    </QueryClientProvider>
  )
}
