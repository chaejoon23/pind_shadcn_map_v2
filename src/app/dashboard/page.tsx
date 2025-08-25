"use client"

import { useState, useEffect } from "react"
import { MainDashboard } from "@/components/main-dashboard"
import { AuthModal } from "@/components/auth-modal"
import { apiClient } from "@/lib/api"
import { useRouter, useSearchParams } from "next/navigation"

type AuthMode = 'login' | 'signup' | null

export default function DashboardPage() {
  const [authMode, setAuthMode] = useState<AuthMode>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialUrl = searchParams.get('url')
  const locationsParam = searchParams.get('locations')
  
  // locations 파라미터를 파싱
  const initialLocations = locationsParam ? (() => {
    try {
      const parsed = JSON.parse(decodeURIComponent(locationsParam))
      console.log('대시보드: 파싱된 locations 데이터:', parsed);
      
      // 플라즈모에서 전달된 데이터 구조 확인
      let placesArray = [];
      if (Array.isArray(parsed)) {
        // 배열인 경우 (기존 구조)
        placesArray = parsed;
      } else if (parsed && parsed.places && Array.isArray(parsed.places)) {
        // 객체에 places 배열이 있는 경우 (새 구조)
        placesArray = parsed.places;
      } else {
        console.warn('대시보드: 예상하지 못한 locations 데이터 구조:', parsed);
        return [];
      }
      
      return placesArray.map((place: any, index: number) => ({
        id: `place-${index}`,
        name: place.name || 'Unknown Place',
        address: '',
        category: '',
        description: '',
        coordinates: {
          lat: place.lat || 0,
          lng: place.lng || 0
        },
        videoId: initialUrl ? extractVideoId(initialUrl) || 'unknown' : 'unknown'
      }))
    } catch (error) {
      console.error('대시보드: locations 파라미터 파싱 오류:', error)
      return []
    }
  })() : undefined
  
  // YouTube URL에서 비디오 ID 추출
  function extractVideoId(url: string): string | null {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
    const match = url.match(regex)
    return match ? match[1] : null
  }

  // 컴포넌트 마운트 시 인증 상태 확인
  useEffect(() => {
    const checkAuthStatus = async () => {
      // URL 파라미터에서 토큰 확인 (익스텐션에서 전달된 경우)
      const token = searchParams.get('token')
      const tokenType = searchParams.get('token_type')
      const userEmail = searchParams.get('user_email')
      
      console.log('대시보드: URL 파라미터 확인', { 
        hasToken: !!token, 
        hasTokenType: !!tokenType, 
        hasUserEmail: !!userEmail,
        tokenLength: token?.length,
        tokenType: tokenType
      });
      
      if (token && tokenType) {
        // 익스텐션에서 전달된 토큰으로 자동 로그인
        console.log('대시보드: 토큰 설정 시작');
        await apiClient.setAuthToken(token, tokenType)
        if (userEmail) {
          localStorage.setItem('userEmail', userEmail)
          sessionStorage.setItem('user_email', userEmail) // sessionStorage에도 저장
        }
        console.log('대시보드: 익스텐션 토큰으로 자동 로그인 완료')
        setIsLoggedIn(true) // 토큰 설정 후 즉시 로그인 상태로 설정
      } else {
        const isAuthenticated = apiClient.isAuthenticated()
        setIsLoggedIn(isAuthenticated)
        
        // 로그인하지 않은 경우 무조건 랜딩 페이지로 리다이렉트
        if (!isAuthenticated) {
          router.push('/')
        }
      }
    }
    
    checkAuthStatus()
  }, [router, searchParams])

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
        initialUrl={initialUrl}
        initialLocations={initialLocations}
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