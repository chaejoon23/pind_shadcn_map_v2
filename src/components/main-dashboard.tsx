"use client"

import type React from "react"
import { useState, useEffect } from "react"
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

// 빈 초기 데이터 - YouTube URL 처리시 동적으로 추가됨
const initialMockVideos: VideoData[] = []

interface MainDashboardProps {
  initialUrl?: string | null
}

export function MainDashboard({ initialUrl }: MainDashboardProps = {}) {
  const [selectedVideos, setSelectedVideos] = useState<string[]>([])
  
  const [showMobileOverlay, setShowMobileOverlay] = useState(false)
  const [mobileView, setMobileView] = useState<"list" | "details">("list")
  // const [popupPosition, setPopupPosition] = useState<{ x: number; y: number } | null>(null)
  const [showCheckedVideos, setShowCheckedVideos] = useState(false)
  const [clickedVideo, setClickedVideo] = useState<VideoData | null>(null)
  // const [showSettings, setShowSettings] = useState(false)
  // const [showManageAccount, setShowManageAccount] = useState(false)
  const [mockVideos, setMockVideos] = useState<VideoData[]>(initialMockVideos)

  // Process initial URL when component mounts
  useEffect(() => {
    if (initialUrl) {
      console.log('초기 URL 처리:', initialUrl)
      const processInitialUrl = async () => {
        try {
          console.log('클라이언트: 초기 URL 처리 시작:', initialUrl)
          console.log('클라이언트: API 호출 시작')
          const response = await apiClient.processYouTubeURL(initialUrl, false)
          console.log('클라이언트: API 응답 수신:', response)
          const videoId = apiClient.extractVideoId(initialUrl) || 'unknown'
          const locations = apiClient.convertApiPlacesToLocations(response.places, videoId)
          
          if (videoId && locations.length > 0) {
            const newVideo: VideoData = {
              id: videoId,
              title: `YouTube Video - ${videoId}`,
              thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
              date: new Date().toISOString().split('T')[0],
              locations
            }
            
            setMockVideos([newVideo])
            setSelectedVideos([videoId])
          }
        } catch (error) {
          console.error('클라이언트: 초기 URL 처리 중 오류:', error)
          alert(`오류 발생: ${error}`)
        }
      }
      processInitialUrl()
    }
  }, [initialUrl])

  // Auto-select the first video when a new video is added
  useEffect(() => {
    // 새 비디오가 추가되었고 아무것도 선택되지 않은 경우에만 자동 선택
    if (mockVideos.length > 0 && selectedVideos.length === 0) {
      setSelectedVideos([mockVideos[0].id])
    }
  }, [mockVideos.length, selectedVideos.length])

  const selectedLocations = mockVideos
    .filter((video) => selectedVideos.includes(video.id))
    .flatMap((video) => video.locations)

  const handleVideoToggle = (videoId: string) => {
    setSelectedVideos((prev) => (prev.includes(videoId) ? prev.filter((id) => id !== videoId) : [...prev, videoId]))
  }

  

  

  const handleVideoClick = (video: VideoData) => {
    // Toggle video selection when clicking on title
    if (selectedVideos.includes(video.id)) {
      // If already selected, remove it
      setSelectedVideos(selectedVideos.filter(id => id !== video.id))
    } else {
      // If not selected, add it
      setSelectedVideos([...selectedVideos, video.id])
    }
    
    // Show the clicked video details
    setClickedVideo(video)
    setShowCheckedVideos(true)
  }

  // YouTube URL 처리 함수
  const processYouTubeURL = async (url: string) => {
    console.log('클라이언트: URL 처리 시작:', url)
    try {
      console.log('클라이언트: API 호출 시작')
      const response = await apiClient.processYouTubeURL(url, false) // 비로그인 모드로 처리
      console.log('클라이언트: API 응답 수신:', response)
      const videoId = apiClient.extractVideoId(url) || 'unknown'
      const locations = apiClient.convertApiPlacesToLocations(response.places, videoId)
      
      if (videoId && locations.length > 0) {
        // 새로운 비디오 데이터 생성
        const newVideo: VideoData = {
          id: videoId,
          title: `YouTube Video - ${videoId}`,
          thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
          date: new Date().toISOString().split('T')[0],
          locations
        }
        
        // 기존 비디오 목록에 추가 (중복 제거)
        setMockVideos(prev => {
          const existing = prev.find(v => v.id === videoId)
          if (existing) {
            return prev.map(v => v.id === videoId ? newVideo : v)
          }
          return [newVideo, ...prev]
        })
        
        // 새 비디오를 선택된 상태로 설정
        setSelectedVideos([videoId])
      }
    } catch (error) {
      console.error('클라이언트: YouTube URL 처리 중 오류:', error)
      alert(`오류 발생: ${error}`)
    }
  }

  const handleLogout = () => {
    // Handle logout logic
    window.location.href = '/'
  }

  const handleSettings = () => {
    // TODO: Implement settings modal
    console.log('Settings clicked')
  }

  const handleManageAccount = () => {
    // TODO: Implement manage account modal
    console.log('Manage account clicked')
  }

  const handleNavigateHome = () => {
    // This would typically use Next.js router
    window.location.href = '/'
  }

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Desktop Layout */}
      <div className="hidden md:flex w-full relative">
        {/* User Profile - Top Right */}
        <div className="absolute top-4 right-4 z-20">
          <UserProfileDropdown
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
            locations={selectedLocations}
            selectedLocation={null}
            onPinClick={() => {}}
          />
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden w-full relative">
        {/* Map View (Full Screen) */}
        <MapView 
          locations={selectedLocations} 
          selectedLocation={null}
          onPinClick={() => {}} 
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
        />
      </div>
    </div>
  )
}