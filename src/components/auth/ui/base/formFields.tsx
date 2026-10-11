import { useField, useFormikContext } from 'formik'
import { Form, Input } from 'antd'
import { fieldStatus } from '../../model/validation.ts'

export function LoginField() {
  const [field, meta] = useField<string>('login')
  return (
    <Form.Item
      label="Логин"
      validateStatus={fieldStatus(meta.error, meta.touched)}
      help={meta.touched ? meta.error : undefined}
    >
      <Input {...field} autoComplete="username" />
    </Form.Item>
  )
}

export function EmailField() {
  const [field, meta] = useField<string>('email')
  return (
    <Form.Item
      label="Email"
      validateStatus={fieldStatus(meta.error, meta.touched)}
      help={meta.touched ? meta.error : undefined}
    >
      <Input {...field} autoComplete="email" />
    </Form.Item>
  )
}

type PasswordFieldProps = {
  autoComplete: 'current-password' | 'new-password'
}

export function PasswordField({ autoComplete }: PasswordFieldProps) {
  const [field, meta] = useField<string>('password')
  return (
    <Form.Item
      label="Пароль"
      validateStatus={fieldStatus(meta.error, meta.touched)}
      help={meta.touched ? meta.error : undefined}
    >
      <Input.Password {...field} autoComplete={autoComplete} />
    </Form.Item>
  )
}

type OtpCodeFieldProps = {
  name?: string
}

export function OtpCodeField({ name = 'code' }: OtpCodeFieldProps) {
  const [field, meta] = useField<string>(name)
  const { setFieldValue, submitForm } = useFormikContext()
  return (
    <Form.Item
      label="Код подтверждения"
      validateStatus={fieldStatus(meta.error, meta.touched)}
      help={meta.touched ? meta.error : undefined}
    >
      <Input.OTP
        length={6}
        value={field.value}
        onChange={(value) => {
          void setFieldValue(name, value, false).then(() => {
            if (value.length === 6) void submitForm()
          })
        }}
      />
    </Form.Item>
  )
}
