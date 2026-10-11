import { Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card, Flex, Space, Spin, Typography } from 'antd'
import { fetchUser } from '../api/user/user.ts'
import queryKeys from '../api/queryKeys.ts'
import { ProfileAvatar } from '../components/user/ProfileAvatar.tsx'
import { ProfileLogin } from '../components/user/ProfileLogin.tsx'

const { Title, Paragraph, Text } = Typography

export function ProfilePage() {
  const { data: user, isLoading: isUserLoading } = useQuery({
    queryKey: [queryKeys.USER],
    queryFn: fetchUser,
    meta: { errorMessage: 'Не удалось загрузить пользователя' },
  })

  if (isUserLoading) {
    return (
      <Flex justify="center" style={{ padding: 48 }}>
        <Spin size="large" />
      </Flex>
    )
  }

  if (!user) {
    return <Navigate to="/auth" replace />
  }

  return (
    <Space orientation="vertical" size="large" style={{ width: '100%' }}>
      <Card variant="borderless" className="page-card">
        <Title level={2}>Профиль</Title>
        <Paragraph type="secondary">Аватар и логин. Файлы принимаются только JPEG, PNG и WebP до 2 МБ.</Paragraph>

        <Flex gap={24} align="start" wrap>
          <ProfileAvatar user={user} />

          <div style={{ flex: 1, minWidth: 240 }}>
            <ProfileLogin user={user} />

            <Space orientation="vertical" style={{ marginTop: 20 }}>
              {user.email && <Text>Почта: {user.email}</Text>}
            </Space>
          </div>
        </Flex>
      </Card>
    </Space>
  )
}
