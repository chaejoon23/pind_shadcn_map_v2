"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Download } from "lucide-react"
import Image from "next/image"
import type { VideoData } from "@/components/main-dashboard"

interface VideoHistoryListProps {
  videos: VideoData[]
  selectedVideos: string[]
  onVideoToggle: (videoId: string) => void
}

export function VideoHistoryList({ videos, selectedVideos, onVideoToggle }: VideoHistoryListProps) {
  // Remove duplicate videos based on video.id
  const uniqueVideos = videos.filter((video, index, arr) => 
    arr.findIndex(v => v.id === video.id) === index
  )
  
  if (uniqueVideos.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
          <Download className="w-10 h-10 text-gray-400" />
        </div>
        <p className="text-gray-600 mb-6 text-sm leading-relaxed">
          Use the PIND extension to
          <br />discover your first places!
        </p>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Download className="w-4 h-4 mr-2" />
          Download Extension
        </Button>
      </div>
    )
  }

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-2 p-4 px-4 py-0 my-0">
        {uniqueVideos.map((video) => (
          <div key={video.id} className="flex p-3 rounded-lg hover:bg-gray-50 transition-colors flex-row items-center space-x-3 mx-0 py-3">
            <Checkbox
              checked={selectedVideos.includes(video.id)}
              onCheckedChange={() => onVideoToggle(video.id)}
              className="mb-0 mt-1 text-sky-400"
            />
            <div className="flex-shrink-0">
              <Image
                src={video.thumbnail || "/placeholder.svg"}
                alt={video.title || "Video thumbnail"}
                                width={80}
                height={80}
                className="rounded object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">{video.title}</h3>
              <p className="text-xs text-gray-500">{video.date}</p>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}
