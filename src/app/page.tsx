"use client"

import { useState } from "react"
import { LandingPage } from "@/components/landing-page"
import { AuthModal } from "@/components/auth-modal"
import { MainDashboard } from "@/components/main-dashboard"
import { SignupPrompt } from "@/components/signup-prompt"

type AppState = 'landing' | 'dashboard'
type AuthMode = 'login' | 'signup' | null

export default function Home() {
  const [appState, setAppState] = useState<AppState>('landing')
  const [authMode, setAuthMode] = useState<AuthMode>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [showSignupPrompt, setShowSignupPrompt] = useState(false)
  const [analyzedUrl, setAnalyzedUrl] = useState<string | null>(null)

  const handleAnalyzeVideo = (url: string) => {
    setAnalyzedUrl(url)
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
        <MainDashboard initialUrl={analyzedUrl} />
        
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
