"use client"

import { Button } from "@/components/ui/button"

import { X, ArrowLeft } from "lucide-react"
import type { VideoData, LocationData } from "@/components/main-dashboard"
import { HistorySidebar } from "@/components/history-sidebar"

interface MobileOverlayProps {
  isOpen: boolean
  view: "list" | "details"
  videos: VideoData[]
  selectedVideos: string[]
  
  onClose: () => void
  onVideoToggle: (videoId: string) => void
  onVideoClick: (video: VideoData) => void
  onBackToList: () => void
}

export function MobileOverlay({
  isOpen,
  view,
  videos,
  selectedVideos,
  
  onClose,
  onVideoToggle,
  onVideoClick,
  onBackToList,
}: MobileOverlayProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50">
      <div
        className={`absolute inset-y-0 left-0 w-[90%] bg-white transform transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {view === "list" ? (
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h1 className="text-xl font-bold text-gray-900">Pind</h1>
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* History List */}
            <div className="flex-1 mt-4">
              <HistorySidebar
                videos={videos}
                selectedVideos={selectedVideos}
                onVideoToggle={onVideoToggle}
                onVideoClick={onVideoClick}
              />
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col">
            {/* Details view placeholder */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <Button variant="ghost" size="icon" onClick={onBackToList} className="h-8 w-8">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <h1 className="text-xl font-bold text-gray-900">Details</h1>
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 p-4">
              <p className="text-gray-600">Details view coming soon...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
