"use client"

import { useRef, useState, useEffect } from "react"
import type { LocationData } from "@/components/main-dashboard"
import { Tag } from "@/components/icons"

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
}

export function MapView({ locations, selectedLocation, onPinClick, onPinHover }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [hoveredLocation, setHoveredLocation] = useState<LocationData | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null)
  const [googleMap, setGoogleMap] = useState<any>(null)
  const [markers, setMarkers] = useState<any[]>([])
  const [isMapLoaded, setIsMapLoaded] = useState(false)
  const [userZoomed, setUserZoomed] = useState(false)

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
        if (isMounted) {
          console.error("Failed to initialize Google Maps:", error)
        }
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
      
      const marker = new window.google.maps.Marker({
        position: { lat: location.coordinates.lat, lng: location.coordinates.lng },
        map: googleMap,
        title: location.name,
        icon: {
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
      })

      // Create InfoWindow for this marker
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <style>
            /* General InfoWindow container styles */
            .gm-style-iw-c {
              padding: 0 !important;
              border-radius: 12px !important; /* More rounded corners */
              box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15) !important; /* Softer, larger shadow */
              overflow: hidden !important; /* Ensure content respects border-radius */
            }
            /* Remove the default InfoWindow arrow */
            .gm-style-iw-t::after {
              display: none !important;
            }
            /* Hide the default close button */
            .gm-ui-hover-effect {
              display: none !important;
            }
            /* Custom content wrapper */
            .custom-infowindow-content {
              padding: 16px; /* More padding */
              background: #ffffff; /* White background */
              color: #333; /* Darker text for better contrast */
              font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; /* Modern font stack */
              font-size: 14px;
              line-height: 1.5;
            }
            .custom-infowindow-header {
              display: flex;
              align-items: center;
              gap: 12px; /* More space between icon and text */
              margin-bottom: 10px;
            }
            .custom-infowindow-icon {
              width: 36px; /* Larger icon */
              height: 36px;
              border-radius: 50%;
              background: #4285F4; /* Google Blue for the icon background */
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
            }
            .custom-infowindow-icon-inner {
              width: 12px; /* Larger inner circle */
              height: 12px;
              border-radius: 50%;
              background: white;
            }
            .custom-infowindow-title {
              margin: 0;
              font-size: 18px; /* Larger title */
              font-weight: 700; /* Bolder title */
              color: #212121; /* Even darker for title */
            }
            .custom-infowindow-category {
              font-size: 13px;
              color: #757575; /* Softer grey for category */
              margin-top: 2px;
              display: block; /* Ensure it's on its own line */
            }
            .custom-infowindow-address {
              margin: 8px 0; /* More vertical space */
              font-size: 13px;
              color: #555;
              line-height: 1.4;
            }
            .custom-infowindow-rating {
              display: flex;
              align-items: center;
              gap: 6px; /* Space between stars and number */
              margin-top: 10px;
            }
            .custom-infowindow-stars {
              color: #FFD700; /* Gold color for stars */
              font-size: 16px; /* Larger stars */
            }
            .custom-infowindow-score {
              font-size: 13px;
              font-weight: 600;
              color: #333;
            }
          </style>
          <div class="custom-infowindow-content">
            <div class="custom-infowindow-header">
              <div class="custom-infowindow-icon">
                <div class="custom-infowindow-icon-inner"></div>
              </div>
              <div style="flex: 1; min-width: 0;">
                <h4 class="custom-infowindow-title">${location.name}</h4>
                <span class="custom-infowindow-category">${location.category}</span>
              </div>
            </div>
            <p class="custom-infowindow-address">${location.address}</p>
            <div class="custom-infowindow-rating">
              <div class="custom-infowindow-stars">★★★★☆</div>
              <span class="custom-infowindow-score">4.2</span>
            </div>
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

        {/* Custom Info Window for Google Maps */}
        {hoveredLocation && isMapLoaded && (
          <div className="fixed z-50 pointer-events-none">
            <div className="bg-white rounded-lg shadow-lg border p-3 max-w-xs animate-in fade-in-0 zoom-in-95 duration-150">
              <div className="flex items-start space-x-2">
                <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
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

      {/* Empty State */}
      {locations.length === 0 && isMapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center bg-white/90 p-6 rounded-lg shadow-lg">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <p className="text-gray-600 text-sm">Select videos to see locations on the map</p>
          </div>
        </div>
      )}
    </div>
  )
}
