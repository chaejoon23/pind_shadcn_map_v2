"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X, MapPin } from 'lucide-react'
import { apiClient } from "@/lib/api"

interface AuthModalProps {
  mode: 'login' | 'signup'
  onClose: () => void
  onAuth: () => void
  onSwitchMode: (mode: 'login' | 'signup') => void
}

export function AuthModal({ mode, onClose, onAuth, onSwitchMode }: AuthModalProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const isValidEmail = (email: string) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    
    if (!isValidEmail(email)) {
      setError('올바른 이메일 형식을 입력해주세요.')
      return
    }

    if (!email || !password) {
      setError('이메일과 비밀번호를 모두 입력해주세요.')
      return
    }

    if (mode === 'signup' && !name) {
      setError('이름을 입력해주세요.')
      return
    }

    setLoading(true)

    try {
      if (mode === 'login') {
        const authResponse = await apiClient.login(email, password)
        apiClient.saveAuthToken(authResponse.access_token, authResponse.token_type, email)
        
        // 익스텐션에서 온 요청인지 확인 (return_url이 있는지)
        const urlParams = new URLSearchParams(window.location.search)
        const returnUrl = urlParams.get('return_url')
        
        if (returnUrl) {
          // 콜백 URL로 토큰 정보와 함께 리다이렉트
          const callbackUrl = `/auth/callback?token=${encodeURIComponent(authResponse.access_token)}&token_type=${encodeURIComponent(authResponse.token_type)}&user_email=${encodeURIComponent(email)}`
          window.location.href = callbackUrl
        } else {
          onAuth()
        }
      } else {
        await apiClient.signup(email, password)
        setError('회원가입 성공! 이제 로그인 해주세요.')
        onSwitchMode('login')
        setEmail('')
        setPassword('')
        setName('')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다. 서버가 실행 중인지 확인해주세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md shadow-2xl border-4 border-black bg-white">
        <CardHeader className="text-center space-y-4 relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute right-2 top-2 h-8 w-8 text-black hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </Button>
          
          <div className="flex justify-center">
            <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
              <MapPin className="w-6 h-6 text-white" />
            </div>
          </div>
          
          <CardTitle className="text-2xl font-bold text-black">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </CardTitle>
          
          <CardDescription className="text-gray-600">
            {mode === 'login' 
              ? 'Sign in to access your saved places and video history'
              : 'Join Pind to save your discoveries and never lose track of amazing places'
            }
          </CardDescription>
          
          {error && <p className="text-red-600 text-sm text-center">{error}</p>}
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-black">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={loading}
                  className="h-11 border-2 border-black focus:ring-0 focus:border-black"
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-black">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="h-11 border-2 border-black focus:ring-0 focus:border-black"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-black">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="h-11 border-2 border-black focus:ring-0 focus:border-black"
              />
            </div>
          </CardContent>
          
          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-black hover:bg-gray-800 text-white border-2 border-black disabled:opacity-50"
            >
              {loading
                ? mode === 'login' 
                  ? '로그인 중...' 
                  : '가입 처리 중...'
                : mode === 'login' 
                  ? 'Sign In' 
                  : 'Create Account'
              }
            </Button>
            
            <p className="text-sm text-gray-600 text-center">
              {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
              <button
                type="button"
                onClick={() => onSwitchMode(mode === 'login' ? 'signup' : 'login')}
                disabled={loading}
                className="text-black hover:underline font-medium disabled:opacity-50"
              >
                {mode === 'login' ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
