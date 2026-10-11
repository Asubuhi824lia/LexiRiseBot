import { useState, type ReactNode } from 'react'
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { App } from 'antd'
import { ApiError } from './client.ts'

declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: {
      errorMessage?: string
    }
    queryMeta: {
      errorMessage?: string
    }
  }
}

function errorText(error: unknown, fallback = 'Ошибка запроса') {
  return error instanceof ApiError ? error.message : fallback
}

export function QueryApp({ children }: { children: ReactNode }) {
  const { message } = App.useApp()
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error, query) => {
            if (error instanceof ApiError && error.status === 401) return
            message.error(errorText(error, query.meta?.errorMessage))
          },
        }),
        mutationCache: new MutationCache({
          onError: (error, _variables, _onMutateResult, mutation) => {
            message.error(errorText(error, mutation.meta?.errorMessage))
          },
        }),
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
            staleTime: 15_000,
          },
          mutations: {
            retry: 0,
          },
        },
      }),
  )

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
