"use client"

import { Button } from "@/components/ui/button"
import { useGoogleAuth } from "@/components/google-auth-provider"
import { Loader2, User, LogOut } from "lucide-react"

export function GoogleSignInButton() {
  const { isInitialized, isSignedIn, user, signIn, signOut, error } = useGoogleAuth()

  if (!isInitialized) {
    return (
      <Button disabled variant="outline" size="sm">
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Loading...
      </Button>
    )
  }

  if (error) {
    return (
      <Button disabled variant="outline" size="sm" className="text-red-600 bg-transparent">
        Auth Error
      </Button>
    )
  }

  if (isSignedIn && user) {
    return (
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-2 text-sm">
          <User className="w-4 h-4" />
          <span className="truncate max-w-32">{user.getBasicProfile().getName()}</span>
        </div>
        <Button onClick={signOut} variant="outline" size="sm">
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    )
  }

  return (
    <Button onClick={signIn} variant="outline" size="sm">
      Sign in to Google
    </Button>
  )
}
