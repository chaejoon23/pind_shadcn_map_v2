"use client"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { X, MapPin, Tag, ExternalLink, AlertCircle } from 'lucide-react'
import { useState } from "react"
import type { VideoData, LocationData as Location } from "@/components/main-dashboard"
import { OverlappingLocations } from "./overlapping-locations"

interface CheckedVideosPanelProps {
  videos: VideoData[]
  selectedVideos: string[]
  clickedVideo: VideoData | null
  onClose: () => void
}

export function CheckedVideosPanel({
  videos,
  selectedVideos,
  clickedVideo,
  onClose,
}: CheckedVideosPanelProps) {
  const [creationStatus, setCreationStatus] = useState<{
    type: "success" | "error" | null
    message: string
    link?: string
  }>({ type: null, message: "" })

  // Get all selected videos
  const checkedVideos = videos.filter((video) =>
    selectedVideos.includes(video.id)
  )

  // Get all locations from checked videos
  const allLocations = checkedVideos.flatMap((video) => video.locations)

  // Calculate overlapping locations: locations that appear in multiple videos
  const overlappingLocations = (() => {
    if (checkedVideos.length < 2) return []
    
    // Helper function to check if two locations overlap by coordinates
    const locationsOverlap = (loc1: Location, loc2: Location) => {
      return Math.abs(loc1.coordinates.lat - loc2.coordinates.lat) < 0.001 &&
             Math.abs(loc1.coordinates.lng - loc2.coordinates.lng) < 0.001
    }
    
    // Find locations that appear in multiple videos
    const overlaps: Location[] = []
    const processedCoords = new Set<string>()
    
    for (const location of allLocations) {
      const coordKey = `${location.coordinates.lat.toFixed(3)},${location.coordinates.lng.toFixed(3)}`
      
      if (processedCoords.has(coordKey)) continue
      processedCoords.add(coordKey)
      
      // Count how many different videos mention this location (by coordinates)
      const matchingLocations = allLocations.filter(loc => locationsOverlap(loc, location))
      const uniqueVideoIds = new Set(matchingLocations.map(loc => loc.videoId))
      
      // Only include if this location appears in 2 or more different videos
      if (uniqueVideoIds.size > 1) {
        // Add overlap count information to the location
        const locationWithCount = {
          ...location,
          overlapCount: uniqueVideoIds.size
        }
        overlaps.push(locationWithCount)
      }
    }
    
    return overlaps
  })()

  return (
    <div className="h-full bg-white border-r-4 border-black flex flex-col animate-in slide-in-from-left duration-300 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-2">
        <div>
          <h2 className="text-lg font-semibold text-black">Checked Videos</h2>
          <p className="text-sm text-gray-600">
            {checkedVideos.length} video{checkedVideos.length !== 1 ? "s" : ""}{" "}
            • {allLocations.length} location
            {allLocations.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8 text-black hover:bg-gray-100"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full w-full">

          <div className="p-4 pt-0 space-y-4">
            {checkedVideos.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-white border-4 border-black rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-8 h-8 text-black" />
                </div>
                <p className="text-black text-sm font-medium">
                  No videos selected
                </p>
                <p className="text-gray-600 text-xs mt-1">
                  Check videos from History to see their locations
                </p>
              </div>
            ) : (
              checkedVideos.map((video, videoIndex) => (
                <div key={video.id}>
                  {/* Video title header */}
                  <div className="relative my-4">
                    <div className="border-t-2 border-black" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-white px-3 text-xs font-medium text-black max-w-[250px] truncate border-2 border-black rounded">
                        {video.title}
                      </div>
                    </div>
                  </div>

                  {/* Locations for this video */}
                  <div className="space-y-3">
                    {video.locations.map((location) => (
                      <button
                        key={location.id}
                        onClick={() => {
                          const query = encodeURIComponent(
                            `${location.name} ${location.address}`
                          )
                          window.open(
                            `https://www.google.com/maps/search/${query}`,
                            "_blank"
                          )
                        }}
                        className="w-full p-3 rounded-lg border-2 border-black hover:bg-gray-100 transition-colors text-left flex-shrink-0"
                      >
                        <div className="flex items-start space-x-3">
                          <MapPin className="w-4 h-4 mt-1 text-black flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-black mb-1">
                              {location.name}
                            </h4>
                            <p className="text-xs text-gray-600 line-clamp-2">
                              {location.address}
                            </p>
                          </div>
                          <ExternalLink className="w-3 h-3 text-black flex-shrink-0 mt-1" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
            {/* 스크롤 여백 공간 */}
            <div className="h-4" />
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
