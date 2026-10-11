import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Formik } from 'formik'
import { App, Button, Flex, Form, Input, Space, Typography } from 'antd'
import { updateLogin } from '../../api/user/user.ts'
import queryKeys from '../../api/queryKeys.ts'
import type { User } from '../../api/user/types.ts'

const { Title, Text } = Typography

type ProfileLoginProps = {
  user: Pick<User, 'login'>
}

export function ProfileLogin({ user }: ProfileLoginProps) {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)

  const { mutate: updateLoginMutate, isPending: isUpdateLoginPending } = useMutation({
    mutationFn: updateLogin,
    meta: { errorMessage: 'Не удалось сохранить логин' },
    onSuccess: async (result) => {
      queryClient.setQueryData([queryKeys.USER], result.user)
      setEditing(false)
      message.success('Логин обновлён')
    },
  })

  return (
    <>
      <Text type="secondary">Логин</Text>
      {editing ? (
        <Formik
          initialValues={{ login: user.login }}
          validate={(values) =>
            /^[a-zA-Z0-9_]{3,32}$/.test(values.login.trim())
              ? {}
              : { login: 'Логин: 3–32 символа, латиница, цифры и _' }
          }
          onSubmit={(values) => updateLoginMutate(values.login.trim())}
        >
          {({ values, errors, touched, handleChange, handleBlur, submitForm }) => (
            <Form layout="vertical" style={{ marginTop: 8 }} onFinish={() => void submitForm()}>
              <Form.Item
                validateStatus={errors.login && touched.login ? 'error' : ''}
                help={touched.login ? errors.login : undefined}
              >
                <Input
                  name="login"
                  value={values.login}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  autoComplete="username"
                />
              </Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" loading={isUpdateLoginPending}>
                  Сохранить
                </Button>
                <Button onClick={() => setEditing(false)}>Отмена</Button>
              </Space>
            </Form>
          )}
        </Formik>
      ) : (
        <Flex align="center" gap={12} style={{ marginTop: 8 }}>
          <Title level={4} style={{ margin: 0 }}>
            {user.login}
          </Title>
          <Button onClick={() => setEditing(true)}>Редактировать</Button>
        </Flex>
      )}
    </>
  )
}
