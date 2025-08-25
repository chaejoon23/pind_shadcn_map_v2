"use client"

import { useEffect, useState } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Download, LogIn, History } from 'lucide-react'
import Image from "next/image"
import type { VideoData } from "@/components/main-dashboard"
import { apiClient } from "@/lib/api"

interface HistorySidebarProps {
  videos: VideoData[]
  selectedVideos: string[]
  onVideoToggle: (videoId: string) => void
  onVideoClick: (video: VideoData) => void
  onNavigateHome?: () => void
  onShowAuth?: () => void
  isAnalyzing?: boolean
  analyzingVideo?: VideoData | null
  analysisProgress?: number
  currentStep?: string
}

export function HistorySidebar({ videos, selectedVideos, onVideoToggle, onVideoClick, onNavigateHome, onShowAuth, isAnalyzing, analyzingVideo, analysisProgress, currentStep }: HistorySidebarProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    const checkAuthStatus = () => {
      const authenticated = apiClient.isAuthenticated()
      const email = apiClient.getUserEmail()
      setIsLoggedIn(authenticated)
      setUserEmail(email)
    }
    
    checkAuthStatus()
  }, [])

  // 비로그인 사용자: 로그인 유도
  if (!isLoggedIn) {
    return (
      <div className="h-full bg-white border-r-4 border-black flex flex-col">
        <div className="p-4 border-b border-black">
          <button 
            onClick={onNavigateHome}
            className="flex flex-col items-start w-full text-left hover:bg-gray-100 transition-colors p-2 rounded"
          >
            <h1 className="text-xl font-bold text-black">Pind</h1>
          </button>
        </div>

        <ScrollArea className="flex-1">
          <div className="flex flex-col items-center justify-center p-8 text-center h-full">
            <div className="w-24 h-24 bg-white border-4 border-black rounded-full flex items-center justify-center mb-6">
              <History className="w-10 h-10 text-black" />
            </div>
            <p className="text-black mb-6 text-sm leading-relaxed font-medium">
              Try searching for YouTube links
              <br />Searched videos will appear here
            </p>
            <Button 
              onClick={onShowAuth}
              className="bg-black hover:bg-gray-800 text-white border-2 border-black"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Log in to save history
            </Button>
          </div>
        </ScrollArea>
      </div>
    )
  }

  // 로그인했지만 히스토리가 없는 경우
  if (videos.length === 0) {
    return (
      <div className="h-full bg-white border-r-4 border-black flex flex-col">
        <div className="p-4 border-b border-black">
          <button 
            onClick={onNavigateHome}
            className="flex flex-col items-start w-full text-left hover:bg-gray-100 transition-colors p-2 rounded"
          >
            <h1 className="text-xl font-bold text-black">Pind</h1>
          </button>
        </div>

        {/* Visual separator */}
        <ScrollArea className="flex-1">
          <div className="flex flex-col items-center justify-center p-8 text-center h-full">
            <div className="w-24 h-24 bg-white border-4 border-black rounded-full flex items-center justify-center mb-6">
              <Download className="w-10 h-10 text-black" />
            </div>
            <p className="text-black mb-6 text-sm leading-relaxed font-medium">
              Use the PIND extension to
              <br />discover your first places!
            </p>
            <Button className="bg-black hover:bg-gray-800 text-white border-2 border-black">
              <Download className="w-4 h-4 mr-2" />
              Download Extension
            </Button>
          </div>
        </ScrollArea>
      </div>
    )
  }

  return (
    <div className="h-full bg-white border-r-4 border-black flex flex-col">
      <div className="py-3 p-4 border-b border-black">
        <button 
          onClick={onNavigateHome}
          className="flex flex-col items-start text-left hover:bg-gray-100 transition-colors rounded"
        >
          <h1 className="text-xl font-bold text-black">Pind</h1>
        </button>
      </div>

      {/* Visual separator */}
      <div className="border-b-2 border-black"></div>

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-2 p-4">
          {/* 분석 중인 비디오 표시 */}
          {isAnalyzing && analyzingVideo && (
            <div className="flex p-3 rounded-lg bg-gray-100 border-2 border-gray-500 items-center space-x-3">
              <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
              <div className="flex-shrink-0 cursor-pointer w-[106px] h-[60px] overflow-hidden rounded border-2 border-gray-500">
                <Image
                  src={analyzingVideo.thumbnail || "/placeholder.svg"}
                  alt={analyzingVideo.title}
                  width={106}
                  height={60}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-black line-clamp-2 mb-1">
                  {analyzingVideo.title}
                </h3>
                <div className="text-xs mt-1 font-medium text-gray-600">
                  <p>Analyzing...</p>
                </div>
              </div>
            </div>
          )}
          
          {videos.map((video) => {
            const isSelected = selectedVideos.includes(video.id)
            return (
              <div
                key={`mobile-${video.id}`}
                className="flex p-3 rounded-lg hover:bg-gray-100 transition-colors items-center space-x-3 border-2 border-transparent hover:border-black"
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => onVideoToggle(video.id)}
                  className="mt-1 border-2 border-black data-[state=checked]:bg-black data-[state=checked]:border-black"
                />
                <div className="flex-shrink-0 cursor-pointer w-[106px] h-[60px] overflow-hidden rounded border-2 border-black" onClick={() => onVideoClick(video)}>
                  <Image
                    src={video.thumbnail || "/placeholder.svg"}
                    alt={video.title || "Video thumbnail"}
                    width={106}
                    height={60}
                    className={`w-full h-full object-cover transition-all ${
                      isSelected 
                        ? "opacity-90" 
                        : "hover:opacity-80"
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onVideoClick(video)}>
                  <h3 className="text-sm font-medium text-black line-clamp-2 mb-1 hover:underline transition-all">
                    {video.title}
                  </h3>
                  <p className="text-xs text-gray-500">{video.date}</p>
                  <p className={`text-xs mt-1 font-medium ${
                    isSelected ? "text-black-600" : "text-gray-600"
                  }`}>
                    {video.locations?.length || 0} location{(video.locations?.length || 0) !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
