import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { App } from 'antd'
import {
  setAuthFactorStep,
  startAuthStep,
  verifyAuthStep,
  resendAuth,
} from '../../api/signIn.ts'
import queryKeys from '../../../../api/queryKeys.ts'
import type { ChallengeResponse } from '../../api/types.ts'

export function useAuthChallenge() {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [challenge, setChallenge] = useState<ChallengeResponse | null>(null)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setInterval(() => setCooldown((value) => value - 1), 1000)
    return () => window.clearInterval(timer)
  }, [cooldown])

  function applyChallenge(result: ChallengeResponse, text: string) {
    setChallenge(result)
    setCooldown(result.retryAfterSec ?? 0)
    message.success(text)
  }

  const { mutate: startAuthStepMutate, isPending: isStartAuthStepPending } = useMutation({
    mutationFn: startAuthStep,
    meta: { errorMessage: 'Не удалось начать вход' },
    onSuccess: (result) => {
      applyChallenge(
        result,
        result.channel === 'totp' ? 'Введите код из приложения' : 'Код отправлен на почту',
      )
    },
  })

  const { mutate: setAuthFactorStepMutate, isPending: isSetAuthFactorStepPending } = useMutation({
    mutationFn: setAuthFactorStep,
    meta: { errorMessage: 'Не удалось сменить способ' },
    onSuccess: (result) => {
      applyChallenge(
        result,
        result.channel === 'totp' ? 'Введите код из приложения' : 'Код отправлен на почту',
      )
    },
  })

  const { mutate: verifyAuthStepMutate, isPending: isVerifyAuthStepPending } = useMutation({
    mutationFn: ({ challengeId, code }: { challengeId: string; code: string }) =>
      verifyAuthStep(challengeId, code),
    meta: { errorMessage: 'Код не принят' },
    onSuccess: async (result) => {
      queryClient.setQueryData([queryKeys.USER], result.user)
      message.success('Вход выполнен')
      await navigate('/profile')
    },
  })

  const { mutate: resendAuthMutate, isPending: isResendAuthPending } = useMutation({
    mutationFn: resendAuth,
    meta: { errorMessage: 'Не удалось отправить код' },
    onSuccess: (result) => {
      applyChallenge(result, 'Код отправлен повторно')
    },
  })

  return {
    challenge,
    setChallenge,
    cooldown,
    startAuthStepMutate,
    isStartAuthStepPending,
    setAuthFactorStepMutate,
    isSetAuthFactorStepPending,
    verifyAuthStepMutate,
    isVerifyAuthStepPending,
    resendAuthMutate,
    isResendAuthPending,
  }
}
