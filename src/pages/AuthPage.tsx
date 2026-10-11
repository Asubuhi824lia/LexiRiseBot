import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card, Radio, Segmented, Space, Typography } from 'antd'
import { fetchUser } from '../api/user/user.ts'
import queryKeys from '../api/queryKeys.ts'
import { AuthForm, type AuthIdentifier, type AuthMode } from '../components/auth'

const { Title, Paragraph, Text } = Typography

export function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [identifier, setIdentifier] = useState<AuthIdentifier>('login')

  const { data: user } = useQuery({
    queryKey: [queryKeys.USER],
    queryFn: fetchUser,
    meta: { errorMessage: 'Не удалось загрузить пользователя' },
  })

  if (user) {
    return <Navigate to="/profile" replace />
  }

  const formKey = `${mode}-${identifier}`

  return (
    <Card variant="borderless" className="page-card">
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={2} style={{ marginBottom: 8 }}>
            {mode === 'login' ? 'Авторизация' : 'Регистрация'}
          </Title>
          <Paragraph type="secondary">
            Шаг 1 — логин или почта и пароль. Шаг 2 — код из приложения или с почты.
          </Paragraph>
        </div>

        <Segmented
          block
          value={mode}
          onChange={(value) => setMode(value as AuthMode)}
          options={[
            { label: 'Авторизация', value: 'login' },
            { label: 'Регистрация', value: 'register' },
          ]}
        />

        <Radio.Group
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value as AuthIdentifier)}
          optionType="button"
          buttonStyle="solid"
          style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}
        >
          <Radio.Button value="login">Логин и пароль</Radio.Button>
          <Radio.Button value="email">Почта и пароль</Radio.Button>
        </Radio.Group>

        <div key={formKey}>
          <AuthForm mode={mode} identifier={identifier} />
        </div>

        <Text type="secondary">
          Данные уходят на сервер в зашифрованном конверте RSA-OAEP + AES-GCM.
        </Text>
      </Space>
    </Card>
  )
}
