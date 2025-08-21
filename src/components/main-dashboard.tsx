"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { MapView } from "@/components/map-view"
import { MobileOverlay } from "@/components/mobile-overlay"
import { Button } from "@/components/ui/button"
import { Menu } from 'lucide-react'
import { CheckedVideosPanel } from "@/components/checked-videos-panel"
import { HistorySidebar } from "@/components/history-sidebar"
import { UserProfileDropdown } from "@/components/user-profile-dropdown"
import { apiClient } from "@/lib/api"
import { useRouter } from "next/navigation"

export interface VideoData {
  id: string
  title: string
  thumbnail: string
  date: string
  locations: LocationData[]
}

export interface LocationData {
  id: string
  name: string
  address: string
  category: string
  description: string
  image?: string
  coordinates: { lat: number; lng: number }
  videoId: string
  rating?: number
}


interface MainDashboardProps {
  initialUrl?: string | null
  initialLocations?: LocationData[]
  user?: { name: string; email: string; avatar?: string }
  onShowAuth?: (mode: 'login' | 'signup') => void
}

export function MainDashboard({ initialUrl, initialLocations, user, onShowAuth }: MainDashboardProps) {
  // Remove forced authentication check - let parent handle routing
  const router = useRouter()
  const [selectedVideos, setSelectedVideos] = useState<string[]>([])
  
  const [showMobileOverlay, setShowMobileOverlay] = useState(false)
  const [mobileView, setMobileView] = useState<"list" | "details">("list")
  const [showCheckedVideos, setShowCheckedVideos] = useState(false)
  const [clickedVideo, setClickedVideo] = useState<VideoData | null>(null)
  const [mockVideos, setMockVideos] = useState<VideoData[]>([])
  const [sessionVideos, setSessionVideos] = useState<VideoData[]>([])
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; avatar?: string } | undefined>(undefined)
  const [isAnalyzing, setIsAnalyzing] = useState(false) // URL 분석 상태
  const [analyzingVideo, setAnalyzingVideo] = useState<VideoData | null>(null) // 현재 분석 중인 비디오
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState('')
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const initialUrlProcessed = useRef(false)
  const initializationAttempted = useRef(false)
  const [initializationComplete, setInitializationComplete] = useState(false)

  // 컴포넌트 마운트 시 인증 상태 확인 및 히스토리 불러오기
  useEffect(() => {
    const initializeData = async () => {
      const authenticated = apiClient.isAuthenticated()
      setIsLoggedIn(authenticated)
      
      if (authenticated) {
        // 로그인한 사용자 정보 설정
        const userEmail = apiClient.getUserEmail()
        if (userEmail) {
          setCurrentUser({
            name: userEmail.split('@')[0], // 이메일의 @ 앞부분을 이름으로 사용
            email: userEmail
          })
        }
        // 로그인 사용자: 히스토리 불러오기
        try {
          const historyVideos = await apiClient.getUserHistory()
          
          // 히스토리를 최신 순으로 정렬 (가장 최근에 추가된 것이 맨 앞에)
          historyVideos.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          
          setMockVideos(historyVideos)
        } catch (error) {
          // 히스토리 불러오기 실패 시 빈 상태로 시작
        }
      } else {
        // 비로그인 사용자: 빈 상태로 시작
        setCurrentUser(undefined)
        setMockVideos([])
      }
    }
    
    initializeData().then(() => {
      setInitializationComplete(true)
    })
  }, [])

  // Process initial URL and locations when component mounts
  useEffect(() => {
    // 초기화가 완료되고, 초기 URL이 있고, 아직 처리되지 않은 경우에만 실행
    if (!initializationComplete || !initialUrl || initialUrlProcessed.current || initializationAttempted.current) {
      return
    }

    initializationAttempted.current = true
    
    if (initialLocations) {
      // 이미 위치 데이터가 있는 경우 (직접 전달된 경우)
      const processInitialData = async () => {
        try {
          const videoId = apiClient.extractVideoId(initialUrl) || 'unknown'
          
          const newVideo: VideoData = {
            id: videoId,
            title: `YouTube Video - ${videoId}`,
            thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
            date: new Date().toISOString().split('T')[0],
            locations: initialLocations
          }
        
          // 로그인 사용자만 지원: 히스토리에 추가하거나 업데이트
          setMockVideos(prev => {
            const existing = prev.find(v => v.id === videoId)
            if (existing) {
              return prev.map(v => v.id === videoId ? newVideo : v)
            }
            return [newVideo, ...prev]
          })
          setSelectedVideos([videoId])
          initialUrlProcessed.current = true
          console.log('초기 위치 데이터 처리 완료:', initialLocations.length, 'locations')
        } catch (error) {
          console.error('Initial data processing failed:', error)
          initializationAttempted.current = false // 재시도 허용
        }
      }
      
      processInitialData()
    } else {
      // URL만 있는 경우, API 호출 필요
      const processInitialUrl = async () => {
        console.log('초기 URL 처리 시작:', initialUrl)
        try {
          const response = await apiClient.processYouTubeURL(initialUrl)
          const videoId = apiClient.extractVideoId(initialUrl) || 'unknown'
          const locations = apiClient.convertApiPlacesToLocations(response.places, videoId)
          
          console.log('API 응답 받음:', response.places?.length || 0, 'places from server')
          console.log('변환된 위치:', locations.length, 'locations')
          
          if (videoId && locations.length > 0) {
            const newVideo: VideoData = {
              id: videoId,
              title: response.video_title || `YouTube Video - ${videoId}`,
              thumbnail: response.video_thumbnail || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
              date: new Date().toISOString().split('T')[0],
              locations
            }
            
            const currentlyLoggedIn = apiClient.isAuthenticated()
            if (currentlyLoggedIn) {
              // 로그인 사용자: 히스토리에 추가
              setMockVideos(prev => [newVideo, ...prev])
            } else {
              // 비로그인 사용자: 세션 비디오로 설정
              setSessionVideos([newVideo])
              setMockVideos([newVideo])
            }
            setSelectedVideos([videoId])
            initialUrlProcessed.current = true
            console.log('초기 URL 처리 완료, 위치 추가됨')
          } else if (videoId) {
            console.log('위치를 찾을 수 없음:', locations.length)
            alert("0 places found")
            initialUrlProcessed.current = true
          }
        } catch (error) {
          console.error('Initial URL processing failed:', error)
          // 실패 시 재시도를 위해 플래그 리셋
          initializationAttempted.current = false
          
          // 5초 후 재시도
          setTimeout(() => {
            if (!initialUrlProcessed.current) {
              console.log('초기 URL 처리 재시도')
              initializationAttempted.current = false
            }
          }, 5000)
        }
      }
      processInitialUrl()
    }
  }, [initializationComplete, initialUrl, initialLocations])

  // Auto-select the most recently requested video when videos are loaded
  useEffect(() => {
    // 비디오가 있고 아무것도 선택되지 않은 경우 첫 번째 비디오 자동 선택
    if (mockVideos.length > 0 && selectedVideos.length === 0) {
      setSelectedVideos([mockVideos[0].id])
    }
  }, [mockVideos, selectedVideos])

  // 선택된 비디오들의 위치 추출 및 중복 계산
  const selectedLocations = mockVideos
    .filter((video) => selectedVideos.includes(video.id))
    .flatMap((video) => video.locations || [])

  // 위치 중복 계산 함수: 해당 위치가 몇 개의 서로 다른 비디오에서 언급되었는지 계산
  const getLocationOverlapCount = (location: LocationData) => {
    if (!location.coordinates) return 1
    
    const matchingLocations = selectedLocations.filter(loc => 
      loc.coordinates &&
      Math.abs(loc.coordinates.lat - location.coordinates.lat) < 0.001 &&
      Math.abs(loc.coordinates.lng - location.coordinates.lng) < 0.001
    )
    
    // 해당 위치가 언급된 고유한 비디오 ID들을 추출
    const uniqueVideoIds = new Set(matchingLocations.map(loc => loc.videoId))
    
    return uniqueVideoIds.size
  }

  // 중복 정보가 포함된 위치 데이터 생성
  const enhancedSelectedLocations = selectedLocations.map(location => {
    const overlapCount = getLocationOverlapCount(location)
    return {
      ...location,
      overlapCount,
      isHighlighted: overlapCount > 1
    }
  })

  const handleVideoToggle = (videoId: string) => {
    setSelectedVideos((prev) => (prev.includes(videoId) ? prev.filter((id) => id !== videoId) : [...prev, videoId]))
  }

  const handleVideoClick = (video: VideoData) => {
    // 비디오가 선택되지 않은 경우에만 선택 상태로 변경
    if (!selectedVideos.includes(video.id)) {
      setSelectedVideos([...selectedVideos, video.id])
    }
    
    // Show the clicked video details (체크박스 상태는 변경하지 않음)
    setClickedVideo(video)
    setShowCheckedVideos(true)
  }

  // YouTube URL 처리 함수
  const processYouTubeURL = async (url: string) => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
    }

    const currentlyLoggedIn = apiClient.isAuthenticated()
    const videoId = apiClient.extractVideoId(url) || 'unknown'
    
    
    const videoDataForAnalysis: VideoData = {
      id: videoId,
      title: `YouTube Video - ${videoId}`, // 임시 제목, 나중에 업데이트
      thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
      date: new Date().toISOString().split('T')[0],
      locations: []
    }
    
    setAnalyzingVideo(videoDataForAnalysis)
    setSelectedVideos([])
    setIsAnalyzing(true)
    setAnalysisProgress(0)
    setCurrentStep('')
    
    // 클라이언트에서는 기본 제목 사용, 서버 응답에서 실제 제목 받아옴
    
    try {
      // 서버가 동기 처리하므로 즉시 완료 상태로 설정
      setAnalysisProgress(100)
      setCurrentStep('Processing...')
      
      const response = await apiClient.processYouTubeURL(url)
      
      // console.log('Server response:', response) // 서버 응답 확인용 로그 (필요시 주석 해제)
      
      const locations = apiClient.convertApiPlacesToLocations(response.places, videoId)
      
      // Check if no places were found
      if (locations.length === 0) {
        alert("0 places found")
        return // Don't save to history
      }
      
      // 서버에서 video_title을 제공하지 않는 경우, 클라이언트에서 제목을 가져옴
      let finalTitle = response.video_title || videoDataForAnalysis.title
      
      // 서버에서 제목이 없으면 YouTube oEmbed API를 통해 제목 시도 (프록시 없이)
      if (!response.video_title || response.video_title === 'undefined') {
        try {
          // YouTube oEmbed API를 직접 호출 시도 (일부 브라우저에서는 작동할 수 있음)
          const oembedResponse = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`)
          if (oembedResponse.ok) {
            const oembedData = await oembedResponse.json()
            finalTitle = oembedData.title || finalTitle
          }
        } catch (error) {
          // CORS 오류 무시하고 기본 제목 유지 (정상적인 동작)
        }
      }
      
      const finalVideo: VideoData = {
        ...videoDataForAnalysis,
        title: finalTitle,
        thumbnail: response.video_thumbnail || videoDataForAnalysis.thumbnail,
        locations
      }
      
      if (currentlyLoggedIn) {
        setMockVideos(prev => {
          const existing = prev.find(v => v.id === videoId)
          if (existing) {
            return prev.map(v => v.id === videoId ? finalVideo : v)
          }
          return [finalVideo, ...prev]
        })
      } else {
        setSessionVideos(prev => {
          const existing = prev.find(v => v.id === videoId)
          if (existing) {
            return prev.map(v => v.id === videoId ? finalVideo : v)
          }
          return [finalVideo, ...prev]
        })
        
        setMockVideos(prev => {
          const existing = prev.find(v => v.id === videoId)
          if (existing) {
            return prev.map(v => v.id === videoId ? finalVideo : v)
          }
          return [finalVideo, ...prev]
        })
      }
      
      setSelectedVideos([videoId])
    } catch (error) {
      console.error('Video processing error:', error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      alert(`An error occurred during video analysis.`)
    } finally {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
      setAnalysisProgress(100)
      setCurrentStep('Completed')
      setTimeout(() => {
        setIsAnalyzing(false)
        setAnalyzingVideo(null)
        setCurrentStep('')
      }, 1000)
    }
  }

  const handleLogout = () => {
    apiClient.clearAuthToken()
    setIsLoggedIn(false)
    setCurrentUser(undefined)
    setMockVideos([])
    setSessionVideos([])
    setSelectedVideos([])
    // 강제로 페이지를 완전히 새로고침하여 로그인 상태 초기화
    window.location.href = '/'
  }

  const handleSettings = () => {
    // Settings functionality to be implemented
  }

  const handleManageAccount = () => {
    // Account management functionality to be implemented
  }

  const handleNavigateHome = () => {
    window.location.href = '/'
  }

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Desktop Layout */}
      <div className="hidden md:flex w-full relative">
        {/* User Profile - Top Right */}
        <div className="absolute top-4 right-4 z-20">
          <UserProfileDropdown
            user={currentUser}
            onShowAuth={() => onShowAuth?.('login')}
            onLogout={handleLogout}
            onSettings={handleSettings}
            onManageAccount={handleManageAccount}
          />
        </div>

        {/* Left Sidebar - History Only */}
        <div className="w-80 flex-shrink-0">
          <HistorySidebar
            videos={mockVideos}
            selectedVideos={selectedVideos}
            onVideoToggle={handleVideoToggle}
            onVideoClick={handleVideoClick}
            onNavigateHome={handleNavigateHome}
            onShowAuth={() => onShowAuth?.('login')}
            isAnalyzing={isAnalyzing}
            analyzingVideo={analyzingVideo}
            analysisProgress={analysisProgress}
            currentStep={currentStep}
          />
        </div>

        {/* Checked Videos Panel */}
        {showCheckedVideos && (
          <div className="w-80 flex-shrink-0">
            <CheckedVideosPanel
              videos={mockVideos}
              selectedVideos={selectedVideos}
              clickedVideo={clickedVideo}
              onClose={() => setShowCheckedVideos(false)}
            />
          </div>
        )}

        {/* Map View */}
        <div className="flex-1">
          <MapView
            locations={enhancedSelectedLocations}
            selectedLocation={null}
            onPinClick={() => {}}
            onProcessUrl={processYouTubeURL}
            onNavigateHome={handleNavigateHome}
            isAnalyzing={isAnalyzing}
            analysisProgress={analysisProgress}
            videos={mockVideos}
          />
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden w-full relative">
        {/* Map View (Full Screen) */}
        <MapView 
          locations={enhancedSelectedLocations} 
          selectedLocation={null}
          onPinClick={() => {}} 
          onProcessUrl={processYouTubeURL}
          onNavigateHome={handleNavigateHome}
          isAnalyzing={isAnalyzing}
          analysisProgress={analysisProgress}
          videos={mockVideos}
        />

        {/* Mobile Menu Button */}
        <Button
          onClick={() => setShowMobileOverlay(true)}
          className="absolute top-4 left-4 z-10 w-12 h-12 rounded-full shadow-lg"
          size="icon"
        >
          <Menu className="w-5 h-5" />
        </Button>

        {/* Mobile Overlay */}
        <MobileOverlay
          isOpen={showMobileOverlay}
          view={mobileView}
          videos={mockVideos}
          selectedVideos={selectedVideos}
          onClose={() => setShowMobileOverlay(false)}
          onVideoToggle={handleVideoToggle}
          onVideoClick={handleVideoClick}
          onBackToList={() => setMobileView("list")}
          isAnalyzing={isAnalyzing}
          analyzingVideo={analyzingVideo}
          analysisProgress={analysisProgress}
          currentStep={currentStep}
        />
      </div>
    </div>
  )
}
