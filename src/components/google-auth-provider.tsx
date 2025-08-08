"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { initializeGoogleAPIs } from "@/lib/google-maps-api"

interface GoogleAuthContextType {
  isInitialized: boolean
  isSignedIn: boolean
  user: any | null
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  error: string | null
}

const GoogleAuthContext = createContext<GoogleAuthContextType | null>(null)

export function GoogleAuthProvider({ children }: { children: ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false)
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Only initialize Google APIs if we have a client ID (for export features)
        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
        if (clientId) {
          await initializeGoogleAPIs()

          const authInstance = window.gapi?.auth2?.getAuthInstance()
          if (authInstance) {
            setIsSignedIn(authInstance.isSignedIn.get())
            setUser(authInstance.currentUser.get())

            // Listen for sign-in state changes
            authInstance.isSignedIn.listen((signedIn: boolean) => {
              setIsSignedIn(signedIn)
              if (signedIn) {
                setUser(authInstance.currentUser.get())
              } else {
                setUser(null)
              }
            })
          }
        } else {
          console.log("Google Client ID not provided - auth features disabled, maps will work")
        }

        setIsInitialized(true)
      } catch (err) {
        console.warn("Google Auth initialization failed, but maps will still work:", err)
        setIsInitialized(true) // Still set as initialized so app works
      }
    }

    initializeAuth()
  }, [])

  const signIn = async () => {
    try {
      const authInstance = window.gapi?.auth2?.getAuthInstance()
      if (authInstance) {
        await authInstance.signIn()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed")
      throw err
    }
  }

  const signOut = async () => {
    try {
      const authInstance = window.gapi?.auth2?.getAuthInstance()
      if (authInstance) {
        await authInstance.signOut()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign out failed")
      throw err
    }
  }

  return (
    <GoogleAuthContext.Provider
      value={{
        isInitialized,
        isSignedIn,
        user,
        signIn,
        signOut,
        error,
      }}
    >
      {children}
    </GoogleAuthContext.Provider>
  )
}

export function useGoogleAuth() {
  const context = useContext(GoogleAuthContext)
  if (!context) {
    throw new Error("useGoogleAuth must be used within GoogleAuthProvider")
  }
  return context
}
