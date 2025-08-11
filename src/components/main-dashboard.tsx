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
import { UrlInput } from "@/components/url-input"
import { apiClient } from "@/lib/api"

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
  const [selectedVideos, setSelectedVideos] = useState<string[]>([])
  
  const [showMobileOverlay, setShowMobileOverlay] = useState(false)
  const [mobileView, setMobileView] = useState<"list" | "details">("list")
  const [showCheckedVideos, setShowCheckedVideos] = useState(false)
  const [clickedVideo, setClickedVideo] = useState<VideoData | null>(null)
  const [mockVideos, setMockVideos] = useState<VideoData[]>([])
  const [sessionVideos, setSessionVideos] = useState<VideoData[]>([]) // 현재 세션 비디오들
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; avatar?: string } | undefined>(undefined)
  const [isAnalyzing, setIsAnalyzing] = useState(false) // URL 분석 상태
  const [analyzingVideo, setAnalyzingVideo] = useState<VideoData | null>(null) // 현재 분석 중인 비디오
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)

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
          console.log('로그인한 사용자의 히스토리 불러오기 시작')
          const historyIds = await apiClient.getUserHistory()
          console.log('히스토리 ID 목록:', historyIds)
          
          // 각 video ID에 대한 상세 정보 불러오기
          const historyVideos: VideoData[] = []
          for (const videoId of historyIds) {
            try {
              const places = await apiClient.getPlacesForVideo(videoId)
              const locations = apiClient.convertApiPlacesToLocations(places, videoId)
              
              // YouTube 비디오 정보 가져오기
              const videoInfo = await apiClient.getYouTubeVideoInfo(videoId)
              
              const videoData: VideoData = {
                id: videoId,
                title: videoInfo?.title || `YouTube Video - ${videoId}`,
                thumbnail: videoInfo?.thumbnail || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
                date: new Date().toISOString().split('T')[0],
                locations
              }
              historyVideos.push(videoData)
            } catch (error) {
              console.error(`비디오 ${videoId} 정보 불러오기 실패:`, error)
            }
          }
          
          // 히스토리를 최신 순으로 정렬 (가장 최근에 추가된 것이 맨 앞에)
          historyVideos.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          
          setMockVideos(historyVideos)
          console.log('히스토리 불러오기 완료:', historyVideos.length, '개 비디오')
        } catch (error) {
          console.error('사용자 히스토리 불러오기 실패:', error)
        }
      } else {
        // 비로그인 사용자: 빈 상태로 시작
        setCurrentUser(undefined)
        setMockVideos([])
      }
    }
    
    initializeData()
  }, [])

  // Process initial URL and locations when component mounts
  useEffect(() => {
    if (initialUrl && initialLocations) {
      const processInitialData = async () => {
        console.log('초기 URL과 위치 데이터 처리:', initialUrl, initialLocations)
        const videoId = apiClient.extractVideoId(initialUrl) || 'unknown'
        
        // YouTube 비디오 정보 가져오기
        const videoInfo = await apiClient.getYouTubeVideoInfo(videoId)
        
        const newVideo: VideoData = {
          id: videoId,
          title: videoInfo?.title || `YouTube Video - ${videoId}`,
          thumbnail: videoInfo?.thumbnail || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
          date: new Date().toISOString().split('T')[0],
          locations: initialLocations
        }
      
        if (isLoggedIn) {
          // 로그인 사용자: 히스토리에 추가하거나 업데이트
          setMockVideos(prev => {
            const existing = prev.find(v => v.id === videoId)
            if (existing) {
              return prev.map(v => v.id === videoId ? newVideo : v)
            }
            return [newVideo, ...prev]
          })
        } else {
          // 비로그인 사용자: 세션 비디오에 추가
          setSessionVideos(prev => {
            const existing = prev.find(v => v.id === videoId)
            if (existing) {
              return prev.map(v => v.id === videoId ? newVideo : v)
            }
            return [newVideo, ...prev]
          })
          // 비로그인 사용자의 경우 mockVideos를 세션 비디오로 설정
          setMockVideos([newVideo])
        }
        setSelectedVideos([videoId])
      }
      
      processInitialData()
    } else if (initialUrl) {
      console.log('초기 URL 처리:', initialUrl)
      const processInitialUrl = async () => {
        try {
          console.log('클라이언트: 초기 URL 처리 시작:', initialUrl)
          console.log('클라이언트: API 호출 시작')
          const response = await apiClient.processYouTubeURL(initialUrl, isLoggedIn)
          console.log('클라이언트: API 응답 수신:', response)
          const videoId = apiClient.extractVideoId(initialUrl) || 'unknown'
          const locations = apiClient.convertApiPlacesToLocations(response.places, videoId)
          
          if (videoId && locations.length > 0) {
            // YouTube 비디오 정보 가져오기
            const videoInfo = await apiClient.getYouTubeVideoInfo(videoId)
            
            const newVideo: VideoData = {
              id: videoId,
              title: videoInfo?.title || `YouTube Video - ${videoId}`,
              thumbnail: videoInfo?.thumbnail || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
              date: new Date().toISOString().split('T')[0],
              locations
            }
            
            if (isLoggedIn) {
              // 로그인 사용자: 히스토리에 추가
              setMockVideos(prev => [newVideo, ...prev])
            } else {
              // 비로그인 사용자: 세션 비디오로 설정
              setSessionVideos([newVideo])
              setMockVideos([newVideo])
            }
            setSelectedVideos([videoId])
          }
        } catch (error) {
          console.error('클라이언트: 초기 URL 처리 중 오류:', error)
          alert(`오류 발생: ${error}`)
        }
      }
      processInitialUrl()
    }
  }, [initialUrl, initialLocations, isLoggedIn])

  // Auto-select the most recently requested video only when new videos are added
  useEffect(() => {
    // 새 비디오가 추가되었고 아무것도 선택되지 않은 경우에만 자동 선택
    // mockVideos[0]는 항상 가장 최근에 요청된 비디오 (배열의 첫 번째)
    if (mockVideos.length > 0 && selectedVideos.length === 0) {
      // 사용자가 의도적으로 모든 비디오를 체크 해제한 경우가 아닌지 확인
      // 이 경우에는 자동 선택하지 않음
      const hasNewVideo = mockVideos.some(video => !selectedVideos.includes(video.id))
      if (hasNewVideo) {
        setSelectedVideos([mockVideos[0].id])
      }
    }
  }, [mockVideos.length])

  // 선택된 비디오들의 위치 추출 및 중복 계산
  const selectedLocations = mockVideos
    .filter((video) => selectedVideos.includes(video.id))
    .flatMap((video) => video.locations)

  // 위치 중복 계산 함수: 해당 위치가 몇 개의 서로 다른 비디오에서 언급되었는지 계산
  const getLocationOverlapCount = (location: LocationData) => {
    const matchingLocations = selectedLocations.filter(loc => 
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

    console.log('클라이언트: URL 처리 시작:', url)
    const currentlyLoggedIn = apiClient.isAuthenticated()
    const videoId = apiClient.extractVideoId(url) || 'unknown'
    console.log('추출된 비디오 ID:', videoId)
    
    let videoDataForAnalysis: VideoData = {
      id: videoId,
      title: `YouTube Video - ${videoId}`,
      thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
      date: new Date().toISOString().split('T')[0],
      locations: []
    }
    
    setAnalyzingVideo(videoDataForAnalysis)
    setSelectedVideos([])
    setIsAnalyzing(true)
    setAnalysisProgress(0)

    progressIntervalRef.current = setInterval(() => {
      setAnalysisProgress(prev => {
        if (prev >= 95) {
          if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
          return 95
        }
        return prev + 5
      })
    }, 800)
    
    try {
      const videoInfo = await apiClient.getYouTubeVideoInfo(videoId)
      if (videoInfo?.title) {
        videoDataForAnalysis = { 
          ...videoDataForAnalysis, 
          title: videoInfo.title, 
          thumbnail: videoInfo.thumbnail || videoDataForAnalysis.thumbnail 
        }
        setAnalyzingVideo(videoDataForAnalysis)
      }
      
      const response = await apiClient.processYouTubeURL(url, currentlyLoggedIn)
      const locations = apiClient.convertApiPlacesToLocations(response.places, videoId)
      
      const finalVideo: VideoData = {
        ...videoDataForAnalysis,
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
      console.error('클라이언트: YouTube URL 처리 중 오류:', error)
      alert(`오류 발생: ${error}`)
    } finally {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
      setAnalysisProgress(100)
      setTimeout(() => {
        setIsAnalyzing(false)
        setAnalyzingVideo(null)
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
    window.location.href = '/'
  }

  const handleSettings = () => {
    console.log('Settings clicked')
  }

  const handleManageAccount = () => {
    console.log('Manage account clicked')
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
            isAnalyzing={isAnalyzing}
            analysisProgress={analysisProgress}
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
          isAnalyzing={isAnalyzing}
          analysisProgress={analysisProgress}
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
        />
      </div>
    </div>
  )
}
