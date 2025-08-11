"use client"

import { useState, useEffect } from "react"
import { LandingPage } from "@/components/landing-page"
import { AuthModal } from "@/components/auth-modal"
import { MainDashboard } from "@/components/main-dashboard"
import { SignupPrompt } from "@/components/signup-prompt"
import { apiClient } from "@/lib/api"

type AppState = 'landing' | 'dashboard'
type AuthMode = 'login' | 'signup' | null

export default function Home() {
  const [appState, setAppState] = useState<AppState>('landing')
  const [authMode, setAuthMode] = useState<AuthMode>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [showSignupPrompt, setShowSignupPrompt] = useState(false)
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
    setAnalyzedUrl(url)
    setAnalyzedLocations(locations)
    setAppState('dashboard')
    
    // Show signup prompt after a short delay if user is not logged in
    if (!isLoggedIn) {
      setTimeout(() => {
        setShowSignupPrompt(true)
      }, 3000)
    }
  }

  const handleAuth = () => {
    setIsLoggedIn(true)
    setAuthMode(null)
    setShowSignupPrompt(false)
    setAppState('dashboard')
  }

  const handleShowAuth = (mode: AuthMode) => {
    setAuthMode(mode)
  }

  const handleSignupFromPrompt = () => {
    setShowSignupPrompt(false)
    setAuthMode('signup')
  }

  if (appState === 'dashboard') {
    return (
      <>
        <MainDashboard 
          initialUrl={analyzedUrl} 
          initialLocations={analyzedLocations}
          onShowAuth={handleShowAuth}
        />
        
        {/* Signup Prompt for non-logged-in users */}
        {showSignupPrompt && !isLoggedIn && (
          <SignupPrompt
            onSignup={handleSignupFromPrompt}
            onDismiss={() => setShowSignupPrompt(false)}
          />
        )}
        
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
