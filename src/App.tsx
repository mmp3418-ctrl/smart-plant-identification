import { useCallback, useState } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { AppDataProvider } from '@/context/AppDataContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { SplashScreen } from '@/components/system/SplashScreen'
import { RootLayout } from '@/layouts/RootLayout'
import { HomePage } from '@/pages/HomePage'
import { DirectoryPage } from '@/pages/DirectoryPage'
import { IdentifyPage } from '@/pages/IdentifyPage'
import { IdentifyResultPage } from '@/pages/IdentifyResultPage'
import { PlantDetailPage } from '@/pages/PlantDetailPage'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { FavoritesPage } from '@/pages/FavoritesPage'
import { HistoryPage } from '@/pages/HistoryPage'
import { AdminPage } from '@/pages/AdminPage'
import { AboutPage } from '@/pages/AboutPage'

/**
 * HashRouter keeps all client routes under `/#/...` so GitHub Pages
 * hard-refreshes never hit a missing nested path on the static host.
 */
export default function App() {
  const [showSplash, setShowSplash] = useState(true)

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false)
  }, [])

  return (
    <ThemeProvider>
      <AuthProvider>
        <AppDataProvider>
          {showSplash ? (
            <SplashScreen onComplete={handleSplashComplete} />
          ) : null}

          <HashRouter>
            <Routes>
              <Route element={<RootLayout />}>
                <Route index element={<HomePage />} />
                <Route path="directory" element={<DirectoryPage />} />
                <Route path="identify" element={<IdentifyPage />} />
                <Route path="identify/result" element={<IdentifyResultPage />} />
                <Route path="plants/:id" element={<PlantDetailPage />} />
                <Route path="favorites" element={<FavoritesPage />} />
                <Route path="history" element={<HistoryPage />} />
                <Route path="admin" element={<AdminPage />} />
                <Route path="about" element={<AboutPage />} />
                <Route path="login" element={<LoginPage />} />
                <Route path="register" element={<RegisterPage />} />
                {/* Unknown hash routes → home (never blank / crash) */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </HashRouter>
        </AppDataProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
