import { Formik } from 'formik'
import { Alert, Button, Flex, Form } from 'antd'
import type { EmailCodeValues, SecondEmailStepProps } from '../../model/types.ts'
import { emailOnlySchema, otpCodeSchema, validateWithZod } from '../../model/validation.ts'
import { EmailField, OtpCodeField } from '../base/formFields.tsx'

export function SecondEmailStep({
  challenge,
  needsEmailInput,
  cooldown,
  isVerifyAuthStepPending,
  isResendAuthPending,
  isSetAuthFactorStepPending,
  onVerify,
  onResend,
  onSendEmail,
  onSwitchTotp,
  onBack,
}: SecondEmailStepProps) {
  const awaitingCode = challenge.channel === 'email' && !needsEmailInput

  return (
    <Formik<EmailCodeValues>
      initialValues={{ email: '', code: '' }}
      validate={(values) =>
        // Два режима шага: сначала почта (код ещё не слали), иначе — только 6 цифр из кода.
        needsEmailInput
          ? validateWithZod(emailOnlySchema, { email: values.email })
          : validateWithZod(otpCodeSchema, { code: values.code })
      }
      onSubmit={(values) => {
        if (needsEmailInput) onSendEmail(values.email.trim())
        else onVerify(values.code)
      }}
    >
      {({ submitForm }) => (
        <Form layout="vertical" onFinish={() => void submitForm()}>
          {challenge.generatedLogin && (
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              title={`Логин: ${challenge.generatedLogin}`}
            />
          )}
          {awaitingCode ? (
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              title={`Код отправлен на почту ${challenge.hint ?? ''}`}
              description="В режиме разработки код пишется в консоль сервера."
            />
          ) : (
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              title="Укажите почту — на неё придёт код"
            />
          )}

          {needsEmailInput && <EmailField />}
          {awaitingCode && <OtpCodeField />}

          <Flex gap={8} wrap>
            <Button
              type="primary"
              htmlType="submit"
              loading={needsEmailInput ? isSetAuthFactorStepPending : isVerifyAuthStepPending}
            >
              {needsEmailInput ? 'Отправить код' : 'Подтвердить'}
            </Button>
            {awaitingCode && (
              <Button disabled={cooldown > 0} loading={isResendAuthPending} onClick={onResend}>
                {cooldown > 0 ? `Повторить через ${cooldown}с` : 'Отправить ещё раз'}
              </Button>
            )}
            <Button loading={isSetAuthFactorStepPending} onClick={onSwitchTotp}>
              Приложение
            </Button>
            <Button onClick={onBack}>Назад</Button>
          </Flex>
        </Form>
      )}
    </Formik>
  )
}
