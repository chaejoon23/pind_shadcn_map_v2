"use client"

import type React from "react"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { VideoHistoryList } from "@/components/video-history-list"
import { LocationsList } from "@/components/locations-list"
import type { VideoData, LocationData } from "@/components/main-dashboard"

interface SidebarProps {
  videos: VideoData[]
  selectedVideos: string[]
  selectedLocations: LocationData[]
  selectedLocation: LocationData | null
  onVideoToggle: (videoId: string) => void
  onLocationSelect: (location: LocationData, event?: React.MouseEvent) => void
}

export function Sidebar({
  videos,
  selectedVideos,
  selectedLocations,
  selectedLocation,
  onVideoToggle,
  onLocationSelect,
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState("history")

  return (
    <div className="h-full bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-gray-200 border-b-0">
        <h1 className="text-xl font-bold text-gray-900">Pind</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2 mx-4 mb-0 ml-0 mr-0 mt-0 rounded-none">
          <TabsTrigger className="" value="history">
            History
          </TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="flex-1 mt-4 mx-0">
          <VideoHistoryList videos={videos} selectedVideos={selectedVideos} onVideoToggle={onVideoToggle} />
        </TabsContent>

        <TabsContent value="locations" className="flex-1 mt-4 mx-0">
          <LocationsList
            locations={selectedLocations}
            selectedLocation={selectedLocation}
            onLocationSelect={onLocationSelect}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
