"use client"

import type { LocationData as Location } from "./main-dashboard"
import { MapPin, Tag, ExternalLink, Info } from "lucide-react"

interface OverlappingLocationsProps {
  locations: Location[]
  videoCount: number
}

export function OverlappingLocations({ locations, videoCount }: OverlappingLocationsProps) {
  if (videoCount < 2) {
    return null // Don't show anything if less than 2 videos are selected
  }

  return (
    <div className="p-4 pt-0">
      <div className="border-t-2 border-black relative my-4">
        <h3 className="text-sm font-semibold text-black absolute bg-white px-2 -top-3 left-1/2 -translate-x-1/2">
          Overlapping Locations
        </h3>
      </div>

      {locations.length > 0 ? (
        <div className="space-y-3">
          {locations.map((location) => (
            <button
              key={location.id}
              onClick={() => {
                const query = encodeURIComponent(`${location.name} ${location.address}`)
                window.open(`https://www.google.com/maps/search/${query}`, '_blank')
              }}
              className="w-full p-3 rounded-lg border-2 border-black hover:bg-gray-100 transition-colors text-left flex-shrink-0"
            >
              <div className="flex items-start space-x-3">
                <MapPin className="w-4 h-4 mt-1 text-black flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-black mb-1">{location.name}</h4>
                  <div className="flex items-center space-x-2 text-xs text-gray-600 mb-1">
                    <Tag className="w-3 h-3" />
                    <span>{location.category}</span>
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-2">{location.address}</p>
                </div>
                <ExternalLink className="w-3 h-3 text-black flex-shrink-0 mt-1" />
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-sm text-gray-600 bg-gray-50 rounded-lg border-2 border-black">
          <Info className="w-5 h-5 mx-auto mb-2 text-black" />
          <p className="font-medium text-black">No overlapping locations</p>
          <p className="text-xs">There are no locations that appear in all selected videos.</p>
        </div>
      )}
    </div>
  )
}