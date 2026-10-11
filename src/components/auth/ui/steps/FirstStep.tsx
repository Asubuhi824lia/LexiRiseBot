import { Formik } from 'formik'
import { Button, Form } from 'antd'
import type { EmailValues, FirstStepProps, LoginValues } from '../../model/types.ts'
import {
  emailPasswordSchema,
  loginPasswordSchema,
  validateWithZod,
} from '../../model/validation.ts'
import { EmailField, LoginField, PasswordField } from '../base/formFields.tsx'

export function FirstStep(props: FirstStepProps) {
  const { identifier, mode, isStartAuthStepPending, onSubmit } = props
  const passwordAutoComplete = mode === 'login' ? 'current-password' : 'new-password'

  switch (identifier) {
    case 'login':
      return (
        <Formik<LoginValues>
          initialValues={{ login: '', password: '' }}
          validate={(values) => validateWithZod(loginPasswordSchema, values)}
          onSubmit={(values) => onSubmit({ login: values.login.trim(), password: values.password })}
        >
          {({ submitForm }) => (
            <Form layout="vertical" onFinish={() => void submitForm()}>
              <LoginField />
              <PasswordField autoComplete={passwordAutoComplete} />
              <Button type="primary" htmlType="submit" block loading={isStartAuthStepPending}>
                Продолжить
              </Button>
            </Form>
          )}
        </Formik>
      )
    case 'email':
      return (
        <Formik<EmailValues>
          initialValues={{ email: '', password: '' }}
          validate={(values) => validateWithZod(emailPasswordSchema, values)}
          onSubmit={(values) => onSubmit({ email: values.email.trim(), password: values.password })}
        >
          {({ submitForm }) => (
            <Form layout="vertical" onFinish={() => void submitForm()}>
              <EmailField />
              <PasswordField autoComplete={passwordAutoComplete} />
              <Button type="primary" htmlType="submit" block loading={isStartAuthStepPending}>
                Продолжить
              </Button>
            </Form>
          )}
        </Formik>
      )
  }
}
