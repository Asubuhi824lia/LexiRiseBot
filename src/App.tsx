import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Flex, Layout, Typography } from 'antd'
import clsx from 'clsx'
import { logout } from './api/logout.ts'
import { fetchUser } from './api/user/user.ts'
import queryKeys from './api/queryKeys.ts'

import './App.css'

const { Header, Content } = Layout

function App() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: user } = useQuery({
    queryKey: [queryKeys.USER],
    queryFn: fetchUser,
    meta: { errorMessage: 'Не удалось загрузить пользователя' },
  })

  const { mutate: logoutMutate, isPending: isLogoutPending } = useMutation({
    mutationFn: logout,
    meta: { errorMessage: 'Не удалось выйти' },
    onSuccess: async () => {
      queryClient.setQueryData([queryKeys.USER], null)
      await queryClient.invalidateQueries({ queryKey: [queryKeys.USER_AVATAR] })
      await navigate('/')
    },
  })

  return (
    <Layout className="app-shell">
      <Header className="app-header">
        <Flex align="center" justify="space-between" gap={16} wrap>
          <NavLink to="/" className="logo">
            <span className="logo-mark" aria-hidden="true">
              L
            </span>
            <Typography.Text strong>LexiRiseBot</Typography.Text>
          </NavLink>
          <Flex align="center" gap={8} wrap>
            <NavLink to="/auth" className={({ isActive }) => clsx('nav-link', isActive && 'active')}>
              Вход
            </NavLink>
            {user && (
              <NavLink
                to="/profile"
                className={({ isActive }) => clsx('nav-link', isActive && 'active')}
              >
                Профиль
              </NavLink>
            )}
            {user && (
              <Button onClick={() => logoutMutate()} loading={isLogoutPending}>
                Выйти
              </Button>
            )}
          </Flex>
        </Flex>
      </Header>
      <Content className="app-content">
        <Outlet />
      </Content>
    </Layout>
  )
}

export default App
