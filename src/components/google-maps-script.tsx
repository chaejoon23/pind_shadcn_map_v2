"use client"

import Script from "next/script"
import { useState } from "react"

interface GoogleMapsScriptProps {
  onLoad?: () => void
  onError?: () => void
}

// Global state to track script loading
let isGoogleMapsScriptLoaded = false
let isGoogleMapsScriptLoading = false
const loadCallbacks: (() => void)[] = []
const errorCallbacks: (() => void)[] = []

export function GoogleMapsScript({ onLoad, onError }: GoogleMapsScriptProps) {
  const [scriptLoaded, setScriptLoaded] = useState(isGoogleMapsScriptLoaded)

  const handleLoad = () => {
    console.log("Google Maps script loaded successfully")
    isGoogleMapsScriptLoaded = true
    isGoogleMapsScriptLoading = false
    setScriptLoaded(true)
    
    // Call all pending callbacks
    loadCallbacks.forEach(callback => callback())
    loadCallbacks.length = 0
    
    onLoad?.()
  }

  const handleError = (error?: any) => {
    console.error("Google Maps script failed to load:", error)
    isGoogleMapsScriptLoading = false
    
    // Call all pending error callbacks
    errorCallbacks.forEach(callback => callback())
    errorCallbacks.length = 0
    
    onError?.()
  }

  // If script is already loaded, don't render anything
  if (scriptLoaded) {
    return null
  }

  // If script is already loading, don't render duplicate
  if (isGoogleMapsScriptLoading) {
    console.log("Script already loading, adding callbacks to queue")
    // Add callbacks to queue
    if (onLoad) loadCallbacks.push(onLoad)
    if (onError) errorCallbacks.push(onError)
    return null
  }

  // Mark as loading
  isGoogleMapsScriptLoading = true
  console.log("Starting to load Google Maps script")

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    console.warn("Google Maps API key not provided")
    handleError()
    return null
  }

  console.log("Rendering Google Maps Script component with API key:", apiKey.substring(0, 10) + "...")

  return (
    <Script
      id="google-maps-script"
      src={`https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`}
      onLoad={handleLoad}
      onError={handleError}
      strategy="afterInteractive"
    />
  )
}

// Utility function to check if Google Maps is loaded
export const isGoogleMapsLoaded = () => {
  return typeof window !== "undefined" && 
         window.google && 
         window.google.maps && 
         window.google.maps.Map
}

// Promise-based loader
export const waitForGoogleMaps = (): Promise<typeof google> => {
  return new Promise((resolve, reject) => {
    console.log("waitForGoogleMaps called", {
      isLoaded: isGoogleMapsLoaded(),
      isLoading: isGoogleMapsScriptLoading,
      isScriptLoaded: isGoogleMapsScriptLoaded
    })

    if (isGoogleMapsLoaded()) {
      console.log("Google Maps already loaded, resolving immediately")
      resolve(window.google)
      return
    }

    if (!isGoogleMapsScriptLoading && !isGoogleMapsScriptLoaded) {
      console.error("Google Maps script not initialized. Add GoogleMapsScript component to your app.")
      reject(new Error("Google Maps script not initialized. Add GoogleMapsScript component to your app."))
      return
    }

    console.log("Adding callbacks to queue, waiting for script to load...")

    // Add to callback queue
    loadCallbacks.push(() => {
      console.log("Load callback executed")
      if (isGoogleMapsLoaded()) {
        console.log("Google Maps loaded successfully, resolving")
        resolve(window.google)
      } else {
        console.error("Google Maps failed to load properly")
        reject(new Error("Google Maps failed to load properly"))
      }
    })

    errorCallbacks.push(() => {
      console.error("Error callback executed")
      reject(new Error("Google Maps script failed to load"))
    })
  })
}