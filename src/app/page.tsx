"use client"

import { useState, useEffect } from "react"
import { LandingPage } from "@/components/landing-page"
import { AuthModal } from "@/components/auth-modal"
import { MainDashboard } from "@/components/main-dashboard"
import { apiClient } from "@/lib/api"

type AppState = 'landing' | 'dashboard'
type AuthMode = 'login' | 'signup' | null

export default function Home() {
  const [appState, setAppState] = useState<AppState>('landing')
  const [authMode, setAuthMode] = useState<AuthMode>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [analyzedUrl, setAnalyzedUrl] = useState<string | null>(null)
  const [analyzedLocations, setAnalyzedLocations] = useState<any[]>([])

  // 컴포넌트 마운트 시 인증 상태 확인
  useEffect(() => {
    const checkAuthStatus = () => {
      const isAuthenticated = apiClient.isAuthenticated()
      setIsLoggedIn(isAuthenticated)
      
      // 이미 로그인되어 있으면 dashboard로 이동
      if (isAuthenticated) {
        setAppState('dashboard')
      }
    }
    
    checkAuthStatus()
  }, [])

  const handleAnalyzeVideo = (url: string, locations: any[] = []) => {
    // Require login before analyzing video
    if (!isLoggedIn) {
      setAuthMode('login')
      return
    }
    
    setAnalyzedUrl(url)
    setAnalyzedLocations(locations)
    setAppState('dashboard')
  }

  const handleAuth = () => {
    setIsLoggedIn(true)
    setAuthMode(null)
    setAppState('dashboard')
  }

  const handleShowAuth = (mode: AuthMode) => {
    setAuthMode(mode)
  }


  if (appState === 'dashboard' && isLoggedIn) {
    return (
      <>
        <MainDashboard 
          initialUrl={analyzedUrl} 
          initialLocations={analyzedLocations}
          onShowAuth={handleShowAuth}
        />
        
        {/* Auth Modal */}
        {authMode && (
          <AuthModal
            mode={authMode}
            onClose={() => setAuthMode(null)}
            onAuth={handleAuth}
            onSwitchMode={setAuthMode}
          />
        )}
      </>
    )
  }

  return (
    <>
      <LandingPage
        onAnalyzeVideo={handleAnalyzeVideo}
        onShowAuth={handleShowAuth}
      />
      
      {/* Auth Modal */}
      {authMode && (
        <AuthModal
          mode={authMode}
          onClose={() => setAuthMode(null)}
          onAuth={handleAuth}
          onSwitchMode={setAuthMode}
        />
      )}
    </>
  )
}
