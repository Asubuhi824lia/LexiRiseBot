import { Formik } from 'formik'
import { Alert, Button, Flex, Form, Typography } from 'antd'
import { QRCodeSVG } from 'qrcode.react'
import type { SecondTotpStepProps } from '../../model/types.ts'
import { otpCodeSchema, validateWithZod } from '../../model/validation.ts'
import { OtpCodeField } from '../base/formFields.tsx'

const { Text } = Typography

export function SecondTotpStep({
  challenge,
  isVerifyAuthStepPending,
  isSetAuthFactorStepPending,
  onVerify,
  onSwitchEmail,
  onBack,
}: SecondTotpStepProps) {
  return (
    <Formik
      initialValues={{ code: '' }}
      validate={(values) => validateWithZod(otpCodeSchema, values)}
      onSubmit={(values) => onVerify(values.code)}
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
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            title="Код из приложения-аутентификатора"
            description={
              challenge.otpauthUrl
                ? 'Отсканируйте QR в Google Authenticator, Authy или аналоге, затем введите код.'
                : 'Введите 6 цифр из приложения, которое вы привязали ранее.'
            }
          />

          {challenge.otpauthUrl && (
            <Flex vertical align="center" gap={12} style={{ marginBottom: 16 }}>
              <QRCodeSVG value={challenge.otpauthUrl} size={180} />
              {challenge.totpSecret && (
                <Text type="secondary" copyable>
                  {challenge.totpSecret}
                </Text>
              )}
            </Flex>
          )}

          <OtpCodeField />

          <Flex gap={8} wrap>
            <Button type="primary" htmlType="submit" loading={isVerifyAuthStepPending}>
              Подтвердить
            </Button>
            <Button loading={isSetAuthFactorStepPending} onClick={onSwitchEmail}>
              Почта
            </Button>
            <Button onClick={onBack}>Назад</Button>
          </Flex>
        </Form>
      )}
    </Formik>
  )
}
