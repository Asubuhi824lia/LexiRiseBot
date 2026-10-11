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
  const [collectEmail, setCollectEmail] = useState(false)
  const challenge = flow.challenge
  const canCollectEmail = identifier === 'login'

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

  if (challenge.channel === 'email' || (canCollectEmail && collectEmail)) {
    return {
      step: 'secondEmail',
      props: {
        challenge,
        needsEmailInput:
          canCollectEmail ? !challenge.hasEmail || challenge.channel !== 'email' : false,
        cooldown: flow.cooldown,
        isVerifyAuthStepPending: flow.isVerifyAuthStepPending,
        isResendAuthPending: flow.isResendAuthPending,
        isSetAuthFactorStepPending: flow.isSetAuthFactorStepPending,
        onVerify: (code) =>
          flow.verifyAuthStepMutate({ challengeId: challenge.challengeId, code }),
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
        onBack: reset,
      },
    }
  }

  return {
    step: 'secondTotp',
    props: {
      challenge,
      isVerifyAuthStepPending: flow.isVerifyAuthStepPending,
      isSetAuthFactorStepPending: flow.isSetAuthFactorStepPending,
      onVerify: (code) => flow.verifyAuthStepMutate({ challengeId: challenge.challengeId, code }),
      onSwitchEmail: () => {
        if (challenge.hasEmail || !canCollectEmail) {
          flow.setAuthFactorStepMutate({ challengeId: challenge.challengeId, channel: 'email' })
        } else {
          setCollectEmail(true)
        }
      },
      onBack: reset,
    },
  }
}
