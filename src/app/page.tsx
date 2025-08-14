"use client"

import { useState, useEffect } from "react"
import { LandingPage } from "@/components/landing-page"
import { AuthModal } from "@/components/auth-modal"
import { apiClient } from "@/lib/api"
import { useRouter } from "next/navigation"

type AuthMode = 'login' | 'signup' | null

export default function Home() {
  const [authMode, setAuthMode] = useState<AuthMode>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const router = useRouter()

  // 컴포넌트 마운트 시 인증 상태 확인
  useEffect(() => {
    const checkAuthStatus = () => {
      const isAuthenticated = apiClient.isAuthenticated()
      setIsLoggedIn(isAuthenticated)
    }
    
    checkAuthStatus()
  }, [])

  const handleAnalyzeVideo = async (url: string, locations: any[] = []) => {
    // Require login before analyzing video
    if (!isLoggedIn) {
      setAuthMode('login')
      return
    }
    
    // YouTube URL을 매개변수로 전달하여 대시보드로 이동
    const encodedUrl = encodeURIComponent(url)
    router.push(`/dashboard?url=${encodedUrl}`)
  }

  const handleAuth = () => {
    // Check current auth status from API
    const isAuthenticated = apiClient.isAuthenticated()
    setIsLoggedIn(isAuthenticated)
    setAuthMode(null)
    if (isAuthenticated) {
      router.push('/dashboard')
    }
  }

  const handleShowAuth = (mode: AuthMode) => {
    setAuthMode(mode)
  }

  const handleNavigateToDashboard = () => {
    if (isLoggedIn) {
      router.push('/dashboard')
    } else {
      setAuthMode('login')
    }
  }

  return (
    <>
      <LandingPage
        onAnalyzeVideo={handleAnalyzeVideo}
        onShowAuth={handleShowAuth}
        onNavigateToDashboard={handleNavigateToDashboard}
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
