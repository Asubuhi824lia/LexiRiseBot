import type { AuthIdentifier, AuthMode } from '../api/types.ts'
import { useAuthForm } from '../model/hooks/useAuthForm.ts'
import { FirstStep } from './steps/FirstStep.tsx'
import { SecondEmailStep } from './steps/SecondEmailStep.tsx'
import { SecondTotpStep } from './steps/SecondTotpStep.tsx'

type AuthFormProps = {
  mode: AuthMode
  identifier: AuthIdentifier
}

export function AuthForm({ mode, identifier }: AuthFormProps) {
  const view = useAuthForm(mode, identifier)

  switch (view.step) {
    case 'first':
      return <FirstStep {...view.props} />
    case 'secondEmail':
      return <SecondEmailStep {...view.props} />
    case 'secondTotp':
      return <SecondTotpStep {...view.props} />
  }
}
