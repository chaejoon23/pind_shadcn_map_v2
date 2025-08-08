"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { X, Bookmark, Sparkles } from 'lucide-react'

interface SignupPromptProps {
  onSignup: () => void
  onDismiss: () => void
}

export function SignupPrompt({ onSignup, onDismiss }: SignupPromptProps) {
  const [isVisible, setIsVisible] = useState(true)

  const handleDismiss = () => {
    setIsVisible(false)
    setTimeout(onDismiss, 300)
  }

  if (!isVisible) return null

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right duration-300">
      <Card className="w-80 bg-blue-50 border-blue-200 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900">Great discovery!</h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDismiss}
              className="h-6 w-6 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <p className="text-sm text-gray-600 mb-4">
            Sign up now to save this result to your history and never lose track of amazing places!
          </p>
          
          <div className="flex space-x-2">
            <Button
              onClick={onSignup}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm"
            >
              <Bookmark className="w-3 h-3 mr-1" />
              Save & Sign Up
            </Button>
            <Button
              variant="outline"
              onClick={handleDismiss}
              className="text-gray-600 text-sm"
            >
              Later
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
