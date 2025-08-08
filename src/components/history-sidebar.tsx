"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Download } from 'lucide-react'
import Image from "next/image"
import type { VideoData } from "@/components/main-dashboard"

interface HistorySidebarProps {
  videos: VideoData[]
  selectedVideos: string[]
  onVideoToggle: (videoId: string) => void
  onVideoClick: (video: VideoData) => void
  onNavigateHome?: () => void
}

export function HistorySidebar({ videos, selectedVideos, onVideoToggle, onVideoClick, onNavigateHome }: HistorySidebarProps) {
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
          <p className="text-sm text-gray-600 mt-1">History</p>
        </div>

        {/* Visual separator */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-24 h-24 bg-white border-4 border-black rounded-full flex items-center justify-center mb-6">
            <Download className="w-10 h-10 text-black" />
          </div>
          <p className="text-black mb-6 text-sm leading-relaxed font-medium">
            PIND 익스텐션을 사용해
            <br />첫 장소들을 찾아보세요!
          </p>
          <Button className="bg-black hover:bg-gray-800 text-white border-2 border-black">
            <Download className="w-4 h-4 mr-2" />
            Download Extension
          </Button>
        </div>
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

      <ScrollArea className="flex-1">
        <div className="space-y-2 p-4">
          {videos.map((video) => {
            const isSelected = selectedVideos.includes(video.id)
            return (
              <div
                key={video.id}
                className="flex p-3 rounded-lg hover:bg-gray-100 transition-colors items-center space-x-3 border-2 border-transparent hover:border-black"
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => onVideoToggle(video.id)}
                  className="mt-1 border-2 border-black data-[state=checked]:bg-black data-[state=checked]:border-black"
                />
                <div className="flex-shrink-0 cursor-pointer" onClick={() => onVideoClick(video)}>
                  <Image
                    src={video.thumbnail || "/placeholder.svg"}
                    alt={video.title}
                                        width={80}
                    height={80}
                    className={`rounded object-cover transition-all border-2 ${
                      isSelected 
                        ? "border-black opacity-90" 
                        : "border-black hover:opacity-80"
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
                    {video.locations.length} location{video.locations.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
