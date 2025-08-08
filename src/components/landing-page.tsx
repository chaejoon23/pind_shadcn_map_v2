"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { MapPin, Clock, Search, Play, Link2, Bookmark } from 'lucide-react'

interface LandingPageProps {
  onAnalyzeVideo: (url: string) => void
  onShowAuth: (mode: 'login' | 'signup') => void
}

export function LandingPage({ onAnalyzeVideo, onShowAuth }: LandingPageProps) {
  const [videoUrl, setVideoUrl] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!videoUrl.trim()) return

    setIsAnalyzing(true)
    // Simulate analysis delay
    setTimeout(() => {
      onAnalyzeVideo(videoUrl)
      setIsAnalyzing(false)
    }, 1500)
  }

  const isValidUrl = videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be') || videoUrl.trim().length > 0

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header */}
      <header className="w-full px-6 py-4 flex items-center justify-between border-b-2 border-black">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-black">Pind</span>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button 
            variant="ghost" 
            onClick={() => onShowAuth('login')}
            className="text-black hover:bg-gray-100 border-2 border-transparent hover:border-black"
          >
            Log In
          </Button>
          <Button 
            onClick={() => onShowAuth('signup')}
            className="bg-black hover:bg-gray-800 text-white px-6 border-2 border-black"
          >
            Sign Up
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center justify-center px-6 py-12 max-w-4xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-2">
          <h1 className="text-4xl md:text-5xl font-bold text-black mb-2 leading-tight">
            Pin + Find
          </h1>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSubmit} className="w-full max-w-3xl mb-2">
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

        {/* Feature Examples */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12 w-full max-w-2xl">
          <div className="flex items-center space-x-3 text-black">
            <Play className="w-5 h-5 text-black" />
            <span>Travel vlogs & food tours</span>
          </div>
          <div className="flex items-center space-x-3 text-black">
            <MapPin className="w-5 h-5 text-black" />
            <span>City guides & recommendations</span>
          </div>
        </div>

        {/* Login Incentive Card */}
        
      </main>

      {/* Footer */}
      <footer className="w-full px-6 py-8 border-t-2 border-black bg-white">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <div className="w-6 h-6 bg-black rounded-md flex items-center justify-center">
              <MapPin className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-black">Pind</span>
          </div>
          
          <div className="flex items-center space-x-6 text-sm text-black">
            <a href="#" className="hover:underline transition-all">About</a>
            <a href="#" className="hover:underline transition-all">Contact</a>
            <a href="#" className="hover:underline transition-all">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
