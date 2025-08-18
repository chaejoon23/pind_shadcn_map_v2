"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { apiClient } from "@/lib/api"

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // URL에서 토큰 정보 추출
        const token = searchParams.get('token')
        const tokenType = searchParams.get('token_type')
        const userEmail = searchParams.get('user_email')

        if (token && tokenType) {
          // apiClient를 통해 토큰 저장
          await apiClient.setAuthToken(token, tokenType)
          
          // 사용자 이메일이 있다면 저장
          if (userEmail) {
            localStorage.setItem('userEmail', userEmail)
          }

          console.log('Auth callback: 토큰 저장 성공!')
          
          // 익스텐션에서 온 로그인인지 확인 (return_url이 있는지)
          const returnUrl = searchParams.get('return_url')
          
          if (returnUrl) {
            // 익스텐션 로그인: URL로 리다이렉트해서 background.ts가 감지하도록 함
            console.log('Auth callback: 익스텐션 로그인 감지, 콜백 URL로 리다이렉트')
            const callbackUrl = `http://localhost:3000/auth/callback?token=${encodeURIComponent(token)}&token_type=${encodeURIComponent(tokenType)}&user_email=${encodeURIComponent(userEmail || '')}`
            window.location.href = callbackUrl
          } else {
            // 일반 웹 로그인: 대시보드로 리다이렉트
            router.push('/dashboard')
          }
        } else {
          console.error('Auth callback: 토큰 정보가 없습니다.')
          // 메인 페이지로 리다이렉트
          router.push('/')
        }
      } catch (error) {
        console.error('Auth callback 처리 중 오류:', error)
        // 메인 페이지로 리다이렉트
        router.push('/')
      }
    }

    handleAuthCallback()
  }, [router, searchParams])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-4">로그인 처리 중...</h2>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
      </div>
    </div>
  )
}