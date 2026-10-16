import { useState } from 'react'
import type { AuthIdentifier, AuthMode } from '../api/types.ts'
import type { FirstStepProps, SecondEmailStepProps, SecondTotpStepProps } from './types.ts'
import { useAuthChallenge } from './useAuthChallenge.ts'

export type AuthFormView =
  | { step: 'first'; props: FirstStepProps }
  | { step: 'secondEmail'; props: SecondEmailStepProps }
  | { step: 'secondTotp'; props: SecondTotpStepProps }

export function useAuthForm(mode: AuthMode, identifier: AuthIdentifier): AuthFormView {
  const flow = useAuthChallenge()
  // Локальный UI-флаг: показать SecondEmailStep с полем почты до вызова factor
  // (переход «Почта» с TOTP, когда на аккаунте ещё нет email). Сбрасывается при totp / Назад.
  const [collectEmail, setCollectEmail] = useState(false)
  const challenge = flow.challenge
  // Вариант «логин+пароль»: на шаге 1 почты нет — на шаге 2 её иногда нужно собрать.
  // При identifier === 'email' почта уже известна, сбор не нужен.
  const isEnabledEmailCollect = identifier === 'login'

  function reset() {
    flow.setChallenge(null)
    setCollectEmail(false)
  }

  if (!challenge) {
    switch (identifier) {
      case 'login':
        return {
          step: 'first',
          props: {
            identifier: 'login',
            mode,
            isStartAuthStepPending: flow.isStartAuthStepPending,
            onSubmit: (values) =>
              flow.startAuthStepMutate({
                mode,
                identifier,
                login: values.login,
                password: values.password,
              }),
          },
        }
      case 'email':
        return {
          step: 'first',
          props: {
            identifier: 'email',
            mode,
            isStartAuthStepPending: flow.isStartAuthStepPending,
            onSubmit: (values) =>
              flow.startAuthStepMutate({
                mode,
                identifier,
                email: values.email,
                password: values.password,
              }),
          },
        }
    }
  }

  const secondStepShared = {
    challenge,
    isVerifyAuthStepPending: flow.isVerifyAuthStepPending,
    isSetAuthFactorStepPending: flow.isSetAuthFactorStepPending,
    onVerify: (code: string) =>
      flow.verifyAuthStepMutate({ challengeId: challenge.challengeId, code }),
    onBack: reset,
  }

  if (challenge.channel === 'email' || (isEnabledEmailCollect && collectEmail)) {
    return {
      step: 'secondEmail',
      props: {
        ...secondStepShared,
        needsEmailInput:
          isEnabledEmailCollect ? !challenge.hasEmail || challenge.channel !== 'email' : false,
        cooldown: flow.cooldown,
        isResendAuthPending: flow.isResendAuthPending,
        onResend: () => flow.resendAuthMutate(challenge.challengeId),
        onSendEmail: (email) =>
          flow.setAuthFactorStepMutate({
            challengeId: challenge.challengeId,
            channel: 'email',
            email,
          }),
        onSwitchTotp: () => {
          setCollectEmail(false)
          flow.setAuthFactorStepMutate({ challengeId: challenge.challengeId, channel: 'totp' })
        },
      },
    }
  }

  return {
    step: 'secondTotp',
    props: {
      ...secondStepShared,
      onSwitchEmail: () => {
        // Почта уже есть на аккаунте, либо вход по email (сбор не нужен) — сразу factor → email.
        if (challenge.hasEmail || !isEnabledEmailCollect) {
          flow.setAuthFactorStepMutate({ challengeId: challenge.challengeId, channel: 'email' })
        } 
        // Почты на аккаунте нет — factor ещё totp, почту уже можно собирать. 
        // Флаг откроет SecondEmailStep.
        else {
          setCollectEmail(true)
        }
      },
    },
  }
}
