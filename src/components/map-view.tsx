"use client"

import { useRef, useState, useEffect } from "react"
import type { LocationData } from "@/components/main-dashboard"
import { Tag } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Link2 } from 'lucide-react'
import { apiClient } from "@/lib/api"

// Google Maps type declaration
declare global {
  interface Window {
    google: typeof google
  }
  var google: any
}

interface MapViewProps {
  locations: LocationData[]
  selectedLocation: LocationData | null
  onPinClick: (location: LocationData) => void
  onPinHover?: (location: LocationData | null) => void
  onProcessUrl?: (url: string) => void
  onNavigateHome?: () => void
  isAnalyzing?: boolean
  analysisProgress?: number
  videos?: Array<{ id: string; title: string; thumbnail: string }>
}

export function MapView({ locations, selectedLocation, onPinClick, onPinHover, onProcessUrl, onNavigateHome, isAnalyzing, analysisProgress, videos = [] }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [hoveredLocation, setHoveredLocation] = useState<LocationData | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null)
  const [googleMap, setGoogleMap] = useState<any>(null)
  const [markers, setMarkers] = useState<any[]>([])
  const [isMapLoaded, setIsMapLoaded] = useState(false)
  const [userZoomed, setUserZoomed] = useState(false)
  const [videoUrl, setVideoUrl] = useState("")

  // URL validation
  const isValidUrl = videoUrl.includes('youtube.com/watch?v=') || videoUrl.includes('youtu.be/')

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!videoUrl.trim() || !isValidUrl) return

    try {
      if (onProcessUrl) {
        await onProcessUrl(videoUrl)
      }
      // 검색 완료 후 입력창 비우기
      setVideoUrl("")
    } catch (error) {
      // URL 처리 오류 발생
    }
  }

  // Load Google Maps API directly with better error handling
  const loadGoogleMapsAPI = () => {
    return new Promise<any>((resolve, reject) => {
      // Check if already loaded
      if (window.google && window.google.maps && window.google.maps.Map) {
        resolve(window.google)
        return
      }

      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
      if (!apiKey) {
        reject(new Error("Google Maps API key not provided"))
        return
      }

      // Check if script already exists
      let existingScript = document.querySelector('script[data-google-maps-api="true"]')
      if (existingScript) {
        // Wait for existing script to load
        const checkLoaded = () => {
          if (window.google && window.google.maps && window.google.maps.Map) {
            resolve(window.google)
          } else {
            setTimeout(checkLoaded, 100)
          }
        }
        checkLoaded()
        return
      }

      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
      script.async = true
      script.defer = true
      script.setAttribute('data-google-maps-api', 'true')

      script.onload = () => {
        // Wait for API to be fully available
        const checkLoaded = () => {
          if (window.google && window.google.maps && window.google.maps.Map) {
            resolve(window.google)
          } else {
            setTimeout(checkLoaded, 100)
          }
        }
        checkLoaded()
      }

      script.onerror = () => {
        // Remove failed script
        script.remove()
        reject(new Error("Failed to load Google Maps API"))
      }

      try {
        document.head.appendChild(script)
      } catch (error) {
        reject(error)
      }
    })
  }

  // Initialize Google Maps
  useEffect(() => {
    let isMounted = true
    let mapInstance: any = null
    
    const initializeMap = async () => {
      try {
        const google = await loadGoogleMapsAPI()
        
        // Check if component is still mounted
        if (!isMounted || !mapRef.current) {
          return
        }
        
        if (google && google.maps && google.maps.Map) {
          // Clear any existing content first
          if (mapRef.current) {
            mapRef.current.innerHTML = ''
          }
          
          mapInstance = new google.maps.Map(mapRef.current, {
            center: { lat: 37.5665, lng: 126.9780 }, // Seoul default
            zoom: 10,
            styles: [
              {
                featureType: "poi",
                elementType: "labels",
                stylers: [{ visibility: "off" }]
              }
            ],
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
          })
          
          if (isMounted) {
            setGoogleMap(mapInstance)
            setIsMapLoaded(true)

            // Add listener for user zoom changes
            mapInstance.addListener('zoom_changed', () => {
              setUserZoomed(true)
            })
          }
        }
      } catch (error) {
        // Google Maps 초기화 실패
      }
    }

    initializeMap()

    // Cleanup function
    return () => {
      isMounted = false
      
      // Clean up Google Maps instance
      if (mapInstance) {
        try {
          // Remove all event listeners
          if (window.google && window.google.maps && window.google.maps.event) {
            window.google.maps.event.clearInstanceListeners(mapInstance)
          }
        } catch (error) {
          // Ignore cleanup errors
        }
        mapInstance = null
      }
      
      // Clean up DOM content
      if (mapRef.current) {
        try {
          mapRef.current.innerHTML = ''
        } catch (error) {
          // Ignore cleanup errors
        }
      }
      
      setIsMapLoaded(false)
      setGoogleMap(null)
      setUserZoomed(false) // Reset userZoomed on unmount
    }
  }, [])

  // Update markers when locations change
  useEffect(() => {
    if (!googleMap || !isMapLoaded || !window.google || !window.google.maps) return

    // Reset userZoomed when locations change, allowing fitBounds to run again
    setUserZoomed(false)

    // Clear existing markers safely
    markers.forEach(marker => {
      try {
        if (marker && typeof marker.setMap === 'function') {
          marker.setMap(null)
        }
        // Clear event listeners
        if (window.google?.maps?.event && marker) {
          window.google.maps.event.clearInstanceListeners(marker)
        }
      } catch (error) {
        // Ignore marker cleanup errors - this is expected in some cases
      }
    })

    if (locations.length === 0) {
      setMarkers([])
      return
    }

    const newMarkers = locations.map((location) => {
      const isSelected = selectedLocation?.id === location.id
      const isHighlighted = (location as any).isHighlighted
      const overlapCount = (location as any).overlapCount || 1
      
      // 중복 위치에 따른 색상 결정
      let markerColor = "#ef4444" // Default red
      if (isSelected) {
        markerColor = "#2563eb" // Blue when selected
      } else if (isHighlighted) {
        markerColor = "#dc2626" // Darker red for overlapping locations
      }
      
      // 중복 횟수에 따른 크기 조정
      const markerSize = isHighlighted ? Math.min(32 + (overlapCount * 4), 48) : 32
      
      const marker = new window.google.maps.Marker({
        position: { lat: location.coordinates.lat, lng: location.coordinates.lng },
        map: googleMap,
        title: `${location.name}${isHighlighted ? ` (${overlapCount} videos)` : ''}`,
        icon: {
          url: 'data:image/svg+xml;base64,' + btoa(`
            <svg width="${markerSize}" height="${markerSize}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="${markerColor}" stroke="#ffffff" stroke-width="${isHighlighted ? '1' : '0.5'}"/>
              ${isHighlighted ? `<text x="12" y="9" text-anchor="middle" font-family="Arial, sans-serif" font-size="4" font-weight="bold" fill="white">${overlapCount}</text>` : ''}
            </svg>
          `),
          scaledSize: new window.google.maps.Size(markerSize, markerSize),
          anchor: new window.google.maps.Point(markerSize/2, markerSize)
        }
      })

      // Find the video title for this location
      const video = videos.find(v => v.id === location.videoId)
      const videoTitle = video ? video.title : `YouTube Video - ${location.videoId}`
      
      // For overlapping locations, find all videos that mention this location
      let overlapVideos: string[] = []
      if (isHighlighted && overlapCount > 1) {
        // Find all locations with similar coordinates
        const similarLocations = locations.filter(loc => 
          loc.coordinates &&
          Math.abs(loc.coordinates.lat - location.coordinates.lat) < 0.001 &&
          Math.abs(loc.coordinates.lng - location.coordinates.lng) < 0.001
        )
        
        // Get unique video titles for these locations
        const uniqueVideoIds = [...new Set(similarLocations.map(loc => loc.videoId))]
        overlapVideos = uniqueVideoIds.map(videoId => {
          const vid = videos.find(v => v.id === videoId)
          return vid ? vid.title : `YouTube Video - ${videoId}`
        }).filter(Boolean)
      }

      // Create InfoWindow for this marker
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <style>
            .gm-style-iw-c {
              padding: 0 !important;
              border-radius: 12px !important;
              box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15) !important;
              overflow: hidden !important;
            }
            .gm-style-iw-t::after {
              display: none !important;
            }
            .gm-ui-hover-effect {
              display: none !important;
            }
            .custom-infowindow-content {
              padding: 16px;
              background: #ffffff;
              color: #333;
              font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              font-size: 14px;
              line-height: 1.5;
            }
            .custom-infowindow-header {
              display: flex;
              align-items: center;
              gap: 12px;
              margin-bottom: 10px;
            }
            .custom-infowindow-icon {
              width: 36px;
              height: 36px;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
            }
            .custom-infowindow-title {
              margin: 0;
              font-size: 18px;
              font-weight: 700;
              color: #212121;
            }
            .custom-infowindow-category {
              font-size: 13px;
              color: #757575;
              margin-top: 2px;
              display: block;
            }
            .custom-infowindow-address {
              margin: 8px 0;
              font-size: 13px;
              color: #555;
              line-height: 1.4;
            }
            .custom-infowindow-video {
              display: flex;
              align-items: center;
              gap: 8px;
              margin: 8px 0;
              padding: 8px;
              background: #f8f9fa;
              border-radius: 6px;
              border: 1px solid #e9ecef;
            }
            .custom-infowindow-youtube-icon {
              width: 20px;
              height: 20px;
              flex-shrink: 0;
            }
            .custom-infowindow-video-title {
              font-size: 12px;
              color: #666;
              font-weight: 500;
              line-height: 1.3;
              overflow: hidden;
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
            }
            .custom-infowindow-overlap {
              background: ${isHighlighted ? '#fee2e2' : 'transparent'};
              border: ${isHighlighted ? '2px solid #dc2626' : 'none'};
              border-radius: 6px;
              padding: ${isHighlighted ? '8px' : '0'};
              margin: ${isHighlighted ? '8px 0' : '0'};
              font-size: 13px;
              font-weight: 600;
              color: ${isHighlighted ? '#dc2626' : '#333'};
            }
          </style>
          <div class="custom-infowindow-content">
            <div class="custom-infowindow-header">
              <div class="custom-infowindow-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
              </div>
              <div style="flex: 1; min-width: 0;">
                <h4 class="custom-infowindow-title">${location.name}</h4>
                <span class="custom-infowindow-category">${location.category}</span>
              </div>
            </div>
            <p class="custom-infowindow-address">${location.address}</p>
            ${isHighlighted && overlapVideos.length > 1 ? `
              ${overlapVideos.map(title => `
                <div class="custom-infowindow-video">
                  <svg class="custom-infowindow-youtube-icon" viewBox="0 0 24 24" fill="#FF0000">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                  <span class="custom-infowindow-video-title">${title}</span>
                </div>
              `).join('')}
            ` : `
              <div class="custom-infowindow-video">
                <svg class="custom-infowindow-youtube-icon" viewBox="0 0 24 24" fill="#FF0000">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
                <span class="custom-infowindow-video-title">${videoTitle}</span>
              </div>
            `}
          </div>
        `,
        disableAutoPan: true,
        maxWidth: 300,
        pixelOffset: new window.google.maps.Size(0, -10),
        disableCloseOnClick: true
      })

      // Add click event 
      marker.addListener('click', () => {
        onPinClick(location)
        // const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${location.name} ${location.coordinates.lat},${location.coordinates.lng}`)}`
        // const query = encodeURIComponent(`${location.name}`)
        // const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}&center=${location.coordinates.lat},${location.coordinates.lng}&zoom=15`
        // 장소명과 좌표를 모두 포함한 검색 방식
        const placeName = encodeURIComponent(location.name)
        const coords = `${location.coordinates.lat},${location.coordinates.lng}`
        const googleMapsUrl = `https://www.google.com/maps/search/${placeName}+${coords}/@${location.coordinates.lat},${location.coordinates.lng},15z`
        console.log('Opening Google Maps URL:', googleMapsUrl)
        window.open(googleMapsUrl, '_blank')
      })

      // Add mouseover event for hover effect
      marker.addListener('mouseover', () => {
        onPinHover?.(location)
        setHoveredLocation(location)

        // Show InfoWindow on hover
        infoWindow.open(googleMap, marker)

        // Scale up the marker on hover
        const hoverIcon = {
          url: isSelected 
            ? 'data:image/svg+xml;base64,' + btoa(`
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#2563eb"/>
              </svg>
            `)
            : 'data:image/svg+xml;base64,' + btoa(`
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#DC2626"/>
              </svg>
            `),
          scaledSize: new window.google.maps.Size(36, 36),
          anchor: new window.google.maps.Point(18, 36)
        }
        marker.setIcon(hoverIcon)
      })

      marker.addListener('mouseout', () => {
        setHoveredLocation(null)
        onPinHover?.(null)

        // Hide InfoWindow
        infoWindow.close()

        // Reset marker size
        const normalIcon = {
          url: isSelected 
            ? 'data:image/svg+xml;base64,' + btoa(`
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#2563eb"/>
              </svg>
            `)
            : 'data:image/svg+xml;base64,' + btoa(`
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#ef4444"/>
              </svg>
            `),
          scaledSize: new window.google.maps.Size(32, 32),
          anchor: new window.google.maps.Point(16, 32)
        }
        marker.setIcon(normalIcon)
      })

      return marker
    })

    setMarkers(newMarkers)

    // Fit bounds to show all markers, only if user hasn't manually zoomed
    if (newMarkers.length > 0 && !userZoomed) {
      const bounds = new window.google.maps.LatLngBounds()
      newMarkers.forEach(marker => bounds.extend(marker.getPosition()!))
      googleMap.fitBounds(bounds)
      
      // Ensure minimum zoom level
      const listener = window.google.maps.event.addListener(googleMap, "idle", () => {
        if (googleMap.getZoom()! > 15) googleMap.setZoom(15)
        window.google.maps.event.removeListener(listener)
      })
    }

    // Cleanup function for markers
    return () => {
      markers.forEach(marker => {
        try {
          if (marker && typeof marker.setMap === 'function') {
            marker.setMap(null)
          }
          // Clear event listeners
          if (window.google?.maps?.event && marker) {
            window.google.maps.event.clearInstanceListeners(marker)
          }
        } catch (error) {
          // Ignore cleanup errors - this is expected in some cases
        }
      })
    }
  }, [googleMap, locations, selectedLocation, isMapLoaded, onPinClick, onPinHover])

  return (
    <div className="h-full relative bg-gray-100">
      {/* Search Form Overlay */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 w-full max-w-3xl px-4">
        <form onSubmit={handleSubmit} className="w-full">
          <div className="relative flex items-center bg-white rounded-2xl border-4 border-black hover:shadow-lg focus-within:shadow-lg transition-all">
            <div className="flex items-center pl-6 pr-4 text-black">
              <Link2 className="w-5 h-5" />
            </div>
            
            <Input
              type="url"
              placeholder="Paste a YouTube URL to get started..."
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="flex-1 border-0 bg-transparent text-lg placeholder:text-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0 py-6 text-black"
            />
            
            <div className="flex items-center space-x-2 pr-2">
              <Button
                type="submit"
                disabled={!isValidUrl || isAnalyzing}
                className={`
                  bg-black hover:bg-gray-800 text-white rounded-xl font-medium 
                  disabled:opacity-50 disabled:cursor-not-allowed border-2 border-black
                  transition-all duration-200 ease-in-out
                  ${isAnalyzing ? 'px-8 py-3' : 'p-3'} 
                `}
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* Map Container */}
      <div className="w-full h-full relative">
        {/* Google Maps Container - React won't touch this */}
        <div 
          ref={mapRef} 
          className="w-full h-full"
          style={{ minHeight: '400px' }}
        />
        
        {/* Loading state overlay */}
        {!isMapLoaded && (
          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Loading Google Maps...</p>
            </div>
          </div>
        )}

        {/* Analyzing overlay */}
        {isAnalyzing && isMapLoaded && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none z-30">
            <div className="text-center bg-white/95 p-8 rounded-2xl shadow-lg border-2 border-black max-w-md">
              <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <h3 className="text-xl font-bold text-black mb-2">Analyzing Video</h3>
              <p className="text-gray-600 text-sm leading-relaxed mb-4">
                We're extracting locations from the YouTube video. This may take a moment...
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2.5 border-2 border-black">
                <div 
                  className="bg-black h-1.5 rounded-full transition-all duration-500 ease-in-out"
                  style={{ width: `${analysisProgress}%` }}
                ></div>
              </div>
              <p className="text-lg font-bold text-black mt-3">{analysisProgress}%</p>
            </div>
          </div>
        )}

        {/* Hover Info Window */}
        {hoveredLocation && isMapLoaded && (
          <div className="fixed z-50 pointer-events-auto">
            <div 
              className="bg-white rounded-lg shadow-lg border p-3 max-w-xs animate-in fade-in-0 zoom-in-95 duration-150 cursor-pointer hover:shadow-xl transition-all"
              onClick={() => {
                // const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${hoveredLocation.name} ${hoveredLocation.coordinates.lat},${hoveredLocation.coordinates.lng}`)}`
                // const query = encodeURIComponent(`${hoveredLocation.name}`)
                // const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}&center=${hoveredLocation.coordinates.lat},${hoveredLocation.coordinates.lng}&zoom=15`
                // 장소명과 좌표를 모두 포함한 검색 방식
                const placeName = encodeURIComponent(hoveredLocation.name)
                const coords = `${hoveredLocation.coordinates.lat},${hoveredLocation.coordinates.lng}`
                const googleMapsUrl = `https://www.google.com/maps/search/${placeName}+${coords}/@${hoveredLocation.coordinates.lat},${hoveredLocation.coordinates.lng},15z`
                console.log('Opening Google Maps URL:', googleMapsUrl)
                window.open(googleMapsUrl, '_blank')
              }}
            >
              <div className="flex items-start space-x-2">
                <div className="w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-black mb-1">{hoveredLocation.name}</h4>
                  <div className="flex items-center space-x-1 text-xs text-gray-600 mb-1">
                    <Tag className="w-3 h-3" />
                    <span>{hoveredLocation.category}</span>
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-2">{hoveredLocation.address}</p>
                  <div className="flex items-center space-x-1 mt-2">
                    <div className="flex text-black">
                      {"★".repeat(4)}
                      {"☆".repeat(1)}
                    </div>
                    <span className="text-xs text-gray-600">4.2</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Empty State - 분석 중이 아닐 때만 표시 */}
      {locations.length === 0 && isMapLoaded && !isAnalyzing && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center bg-white/90 p-8 rounded-2xl shadow-lg border-2 border-black max-w-md">
            <div className="w-20 h-20 bg-black rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-black mb-2">No videos selected</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Please select videos from the sidebar to see their locations on the map, or search for a new YouTube URL above.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
