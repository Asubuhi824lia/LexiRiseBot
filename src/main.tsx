import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { App as AntApp, ConfigProvider, theme } from 'antd'
import ruRU from 'antd/locale/ru_RU'
import { QueryApp } from './api/queryClient.tsx'
import App from './App.tsx'
import { AuthPage } from './pages/AuthPage.tsx'
import { HomePage } from './pages/HomePage.tsx'
import { ProfilePage } from './pages/ProfilePage.tsx'
import './index.css'

const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider
      locale={ruRU}
      theme={{
        algorithm: prefersDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#7c3aed',
          borderRadius: 10,
          fontFamily: "'Segoe UI', system-ui, sans-serif",
        },
      }}
    >
      <AntApp>
        <QueryApp>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<App />}>
                <Route index element={<HomePage />} />
                <Route path="auth" element={<AuthPage />} />
                <Route path="profile" element={<ProfilePage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </QueryApp>
      </AntApp>
    </ConfigProvider>
  </StrictMode>,
)
