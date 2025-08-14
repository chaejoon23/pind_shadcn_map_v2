"use client"

import { useState, useEffect } from "react"
import { MainDashboard } from "@/components/main-dashboard"
import { AuthModal } from "@/components/auth-modal"
import { apiClient } from "@/lib/api"
import { useRouter } from "next/navigation"

type AuthMode = 'login' | 'signup' | null

export default function DashboardPage() {
  const [authMode, setAuthMode] = useState<AuthMode>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const router = useRouter()

  // 컴포넌트 마운트 시 인증 상태 확인
  useEffect(() => {
    const checkAuthStatus = () => {
      const isAuthenticated = apiClient.isAuthenticated()
      setIsLoggedIn(isAuthenticated)
      
      // 로그인하지 않은 경우 랜딩 페이지로 리다이렉트
      if (!isAuthenticated) {
        router.push('/')
      }
    }
    
    checkAuthStatus()
  }, [router])

  const handleAuth = () => {
    // Check current auth status from API
    const isAuthenticated = apiClient.isAuthenticated()
    setIsLoggedIn(isAuthenticated)
    setAuthMode(null)
  }

  const handleShowAuth = (mode: AuthMode) => {
    setAuthMode(mode)
  }

  // 로그인하지 않은 상태에서는 아무것도 렌더링하지 않음 (리다이렉트 중)
  if (!isLoggedIn) {
    return null
  }

  return (
    <>
      <MainDashboard 
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