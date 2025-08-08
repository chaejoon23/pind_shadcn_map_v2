"use client"

import type React from "react"

import { ScrollArea } from "@/components/ui/scroll-area"
import { MapPin } from "lucide-react"
import type { LocationData } from "@/components/main-dashboard"

interface LocationsListProps {
  locations: LocationData[]
  selectedLocation: LocationData | null
  onLocationSelect: (location: LocationData, event?: React.MouseEvent) => void
}

export function LocationsList({ locations, selectedLocation, onLocationSelect }: LocationsListProps) {
  if (locations.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <MapPin className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-gray-600 text-sm">Select videos from History to see locations</p>
      </div>
    )
  }

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-1 p-4">
        {locations.map((location) => (
          <button
            key={location.id}
            onClick={(event) => onLocationSelect(location, event)}
            className={`w-full text-left p-3 rounded-lg transition-colors leading-7 py-3 mx-0 my-0 border-0 ${
              selectedLocation?.id === location.id ? "bg-blue-50 border border-blue-200" : "hover:bg-gray-50"
            }`}
          >
            <div className="flex space-x-3 items-stretch">
              <MapPin
                className={`w-4 h-4 mt-1 flex-shrink-0 ${
                  selectedLocation?.id === location.id ? "text-blue-600" : "text-gray-400"
                }`}
              />
              <div className="flex-1 min-w-0">
                <h3
                  className={`text-sm font-medium mb-1 ${
                    selectedLocation?.id === location.id ? "text-blue-900" : "text-gray-900"
                  }`}
                >
                  {location.name}
                </h3>
                <p className="text-xs text-gray-500 mb-1">{location.category}</p>
                <p className="text-xs text-gray-400 line-clamp-1">{location.address}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </ScrollArea>
  )
}
