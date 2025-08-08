"use client"

// Google Maps API configuration
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""
const GOOGLE_MAPS_API_URL = "https://maps.googleapis.com/maps/api/js"

// Google My Maps API endpoints
const MY_MAPS_API_BASE = "https://www.googleapis.com/mymaps/v1"

declare var google: any // Declare the google variable

export interface GoogleMapsLocation {
  name: string
  address: string
  category: string
  description: string
  coordinates: {
    lat: number
    lng: number
  }
}

export interface GoogleMapsList {
  id: string
  name: string
  description: string
  locations: GoogleMapsLocation[]
}

// Global loading state to prevent multiple script loads
let isGoogleMapsLoading = false
let googleMapsLoadPromise: Promise<typeof google> | null = null

// Load Google Maps JavaScript API
export const loadGoogleMapsAPI = (): Promise<typeof google> => {
  // Return existing promise if already loading
  if (googleMapsLoadPromise) {
    return googleMapsLoadPromise
  }

  // Check if already loaded
  if (typeof window !== "undefined" && window.google && window.google.maps && window.google.maps.Map) {
    return Promise.resolve(window.google)
  }

  if (!GOOGLE_MAPS_API_KEY) {
    return Promise.reject(new Error("Google Maps API key is required"))
  }

  // Create new loading promise
  googleMapsLoadPromise = new Promise((resolve, reject) => {
    // Prevent multiple script loads
    if (isGoogleMapsLoading) {
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

    // Check if script already exists
    const existingScript = document.querySelector(`script[data-google-maps="true"]`)
    if (existingScript) {
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

    isGoogleMapsLoading = true

    const script = document.createElement("script")
    script.src = `${GOOGLE_MAPS_API_URL}?key=${GOOGLE_MAPS_API_KEY}&libraries=places&loading=async`
    script.async = true
    script.defer = true
    script.setAttribute('data-google-maps', 'true') // Mark script for identification

    script.onload = () => {
      const checkLoaded = () => {
        if (window.google && window.google.maps && window.google.maps.Map) {
          isGoogleMapsLoading = false
          resolve(window.google)
        } else {
          setTimeout(checkLoaded, 100)
        }
      }
      checkLoaded()
    }

    script.onerror = () => {
      isGoogleMapsLoading = false
      googleMapsLoadPromise = null
      reject(new Error("Failed to load Google Maps API script"))
    }

    try {
      document.head.appendChild(script)
    } catch (error) {
      isGoogleMapsLoading = false
      googleMapsLoadPromise = null
      reject(error)
    }
  })

  return googleMapsLoadPromise
}

// Get OAuth2 access token for Google APIs
export const getGoogleAccessToken = async (): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Google Auth only available in browser"))
      return
    }

    // Initialize Google Auth
    window.gapi?.load("auth2", () => {
      const authInstance = window.gapi.auth2.getAuthInstance()

      if (!authInstance) {
        // Initialize auth if not already done
        window.gapi.auth2
          .init({
            client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
            scope: "https://www.googleapis.com/auth/mymaps https://www.googleapis.com/auth/drive.file",
          })
          .then(() => {
            const auth = window.gapi.auth2.getAuthInstance()
            if (auth.isSignedIn.get()) {
              const user = auth.currentUser.get()
              const accessToken = user.getAuthResponse().access_token
              resolve(accessToken)
            } else {
              // Prompt user to sign in
              auth
                .signIn()
                .then(() => {
                  const user = auth.currentUser.get()
                  const accessToken = user.getAuthResponse().access_token
                  resolve(accessToken)
                })
                .catch(reject)
            }
          })
          .catch(reject)
      } else {
        if (authInstance.isSignedIn.get()) {
          const user = authInstance.currentUser.get()
          const accessToken = user.getAuthResponse().access_token
          resolve(accessToken)
        } else {
          authInstance
            .signIn()
            .then(() => {
              const user = authInstance.currentUser.get()
              const accessToken = user.getAuthResponse().access_token
              resolve(accessToken)
            })
            .catch(reject)
        }
      }
    })
  })
}

// Create a new Google My Maps list
export const createGoogleMapsList = async (name: string, locations: GoogleMapsLocation[]): Promise<GoogleMapsList> => {
  try {
    const accessToken = await getGoogleAccessToken()

    // Create the map
    const mapResponse = await fetch(`${MY_MAPS_API_BASE}/maps`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: name,
        description: `Created by Pind - ${locations.length} locations from YouTube videos`,
      }),
    })

    if (!mapResponse.ok) {
      throw new Error(`Failed to create map: ${mapResponse.statusText}`)
    }

    const mapData = await mapResponse.json()
    const mapId = mapData.id

    // Add locations to the map
    const createdLocations: GoogleMapsLocation[] = []

    for (const location of locations) {
      try {
        const featureResponse = await fetch(`${MY_MAPS_API_BASE}/maps/${mapId}/features`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            geometry: {
              point: {
                coordinates: [location.coordinates.lng, location.coordinates.lat],
              },
            },
            properties: {
              gx_displayname: location.name,
              gx_description: `${location.description}\n\nCategory: ${location.category}\nAddress: ${location.address}`,
            },
          }),
        })

        if (featureResponse.ok) {
          createdLocations.push(location)
        } else {
          console.warn(`Failed to add location ${location.name}:`, featureResponse.statusText)
        }
      } catch (error) {
        console.warn(`Error adding location ${location.name}:`, error)
      }
    }

    return {
      id: mapId,
      name,
      description: `Created by Pind - ${createdLocations.length} locations`,
      locations: createdLocations,
    }
  } catch (error) {
    console.error("Error creating Google Maps list:", error)
    throw error
  }
}

// Alternative method using Google Drive API to create KML files
export const createGoogleMapsKML = async (
  name: string,
  locations: GoogleMapsLocation[],
): Promise<{ fileId: string; webViewLink: string }> => {
  try {
    const accessToken = await getGoogleAccessToken()

    // Generate KML content
    const kmlContent = generateKMLContent(name, locations)

    // Create file metadata
    const metadata = {
      name: `${name}.kml`,
      parents: [], // Will be saved to root of Drive
      description: `Pind locations export - ${locations.length} places from YouTube videos`,
    }

    // Upload to Google Drive
    const form = new FormData()
    form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }))
    form.append("file", new Blob([kmlContent], { type: "application/vnd.google-earth.kml+xml" }))

    const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: form,
    })

    if (!response.ok) {
      throw new Error(`Failed to upload KML: ${response.statusText}`)
    }

    const fileData = await response.json()

    // Make the file publicly viewable
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileData.id}/permissions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        role: "reader",
        type: "anyone",
      }),
    })

    return {
      fileId: fileData.id,
      webViewLink: `https://drive.google.com/file/d/${fileData.id}/view`,
    }
  } catch (error) {
    console.error("Error creating KML file:", error)
    throw error
  }
}

// Generate KML content for Google Earth/Maps
const generateKMLContent = (name: string, locations: GoogleMapsLocation[]): string => {
  const placemarks = locations
    .map(
      (location) => `
    <Placemark>
      <name>${escapeXML(location.name)}</name>
      <description><![CDATA[
        <div>
          <strong>Category:</strong> ${escapeXML(location.category)}<br/>
          <strong>Address:</strong> ${escapeXML(location.address)}<br/>
          <strong>Description:</strong> ${escapeXML(location.description)}
        </div>
      ]]></description>
      <Point>
        <coordinates>${location.coordinates.lng},${location.coordinates.lat},0</coordinates>
      </Point>
    </Placemark>`,
    )
    .join("")

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeXML(name)}</name>
    <description>Created by Pind - Locations from YouTube videos</description>
    <Style id="pind-style">
      <IconStyle>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/pushpin/red-pushpin.png</href>
        </Icon>
      </IconStyle>
    </Style>
    ${placemarks}
  </Document>
</kml>`
}

// Utility function to escape XML characters
const escapeXML = (str: string): string => {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

// Global state for Google API initialization
let gapiInitPromise: Promise<void> | null = null
let isGapiLoading = false

// Initialize Google APIs (only for export features)
export const initializeGoogleAPIs = (): Promise<void> => {
  // Return existing promise if already initializing
  if (gapiInitPromise) {
    return gapiInitPromise
  }

  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google APIs only available in browser"))
  }

  // Check if already initialized
  if (window.gapi && window.gapi.client && window.gapi.auth2) {
    return Promise.resolve()
  }

  // Create new initialization promise
  gapiInitPromise = new Promise((resolve) => {
    // Prevent multiple script loads
    if (isGapiLoading) {
      const checkLoaded = () => {
        if (window.gapi && window.gapi.client) {
          resolve()
        } else {
          setTimeout(checkLoaded, 100)
        }
      }
      checkLoaded()
      return
    }

    // Check if gapi script already exists
    const existingScript = document.querySelector(`script[data-gapi="true"]`)
    if (existingScript) {
      const checkLoaded = () => {
        if (window.gapi && window.gapi.client) {
          resolve()
        } else {
          setTimeout(checkLoaded, 100)
        }
      }
      checkLoaded()
      return
    }

    isGapiLoading = true

    const script = document.createElement("script")
    script.src = "https://apis.google.com/js/api.js"
    script.setAttribute('data-gapi', 'true') // Mark script for identification
    
    script.onload = () => {
      window.gapi?.load("client:auth2", {
        callback: () => {
          // Only initialize if we have proper client ID
          const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
          if (!clientId) {
            console.log("Google Client ID not provided - export features disabled")
            isGapiLoading = false
            resolve()
            return
          }

          window.gapi.client
            .init({
              apiKey: GOOGLE_MAPS_API_KEY,
              clientId: clientId,
              discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
              scope: "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/mymaps",
            })
            .then(() => {
              isGapiLoading = false
              resolve()
            })
            .catch((error) => {
              console.warn("Google API initialization failed:", error)
              isGapiLoading = false
              resolve() // Don't reject, just disable export features
            })
        },
        onerror: (error) => {
          console.warn("Failed to load Google API:", error)
          isGapiLoading = false
          resolve() // Don't reject, just disable export features
        },
      })
    }
    
    script.onerror = (error) => {
      console.warn("Failed to load Google API script:", error)
      isGapiLoading = false
      gapiInitPromise = null
      resolve() // Don't reject, just disable export features
    }
    
    try {
      document.head.appendChild(script)
    } catch (error) {
      console.warn("Failed to append gapi script:", error)
      isGapiLoading = false
      gapiInitPromise = null
      resolve()
    }
  })

  return gapiInitPromise
}

// Declare global types for Google APIs
declare global {
  interface Window {
    google: any
    gapi: {
      load: (apis: string, callback: { callback: () => void; onerror: (error: any) => void } | (() => void)) => void
      client: {
        init: (config: any) => Promise<void>
      }
      auth2: {
        init: (config: any) => Promise<any>
        getAuthInstance: () => any
      }
    }
  }
}
