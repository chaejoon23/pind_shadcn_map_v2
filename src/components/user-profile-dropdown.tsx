"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { User, Settings, LogOut, ChevronDown } from 'lucide-react'

interface UserProfileDropdownProps {
  user?: {
    name: string
    email: string
    avatar?: string
  }
  onLogout: () => void
  onSettings: () => void
  onManageAccount: () => void
}

export function UserProfileDropdown({ user, onLogout, onSettings, onManageAccount }: UserProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const defaultUser = {
    name: "John Doe",
    email: "john@example.com"
  }

  const currentUser = user || defaultUser

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 h-10 px-3 hover:bg-gray-100 border-2 border-transparent hover:border-black"
      >
        <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
          <User className="w-4 h-4 text-white" />
        </div>
        <ChevronDown className={`w-4 h-4 text-black transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isOpen && (
        <Card className="absolute right-0 top-full mt-2 w-fit shadow-lg border-4 border-black bg-white z-50 animate-in slide-in-from-top-2 duration-200">
          <CardContent className="p-0">
            {/* User Info */}
            <div className="p-4 border-b-2 border-black">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-black truncate">{currentUser.name}</p>
                  <p className="text-xs text-gray-500 truncate">{currentUser.email}</p>
                </div>
              </div>
            </div>

            {/* User Info */}
            <div className="py-2">
              <button
                onClick={() => {
                  onManageAccount()
                  setIsOpen(false)
                }}
                className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-black hover:bg-gray-100 transition-colors"
              >
                <User className="w-4 h-4" />
                <span>Manage Account</span>
              </button>
              
              <button
                onClick={() => {
                  onSettings()
                  setIsOpen(false)
                }}
                className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-black hover:bg-gray-100 transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </button>
              
              <div className="border-t-2 border-black mt-2 pt-2">
                <button
                  onClick={() => {
                    onLogout()
                    setIsOpen(false)
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-black hover:bg-gray-100 transition-colors font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
