"use client"

import { useState, useEffect } from "react"

interface TextTypeProps {
  text: string
  typingSpeed?: number
  initialDelay?: number
  showCursor?: boolean
  cursorCharacter?: string
  cursorClassName?: string
  loop?: boolean
  className?: string
  textColors?: string[]
}

export function TextType({
  text,
  typingSpeed = 100,
  initialDelay = 0,
  showCursor = true,
  cursorCharacter = "|",
  cursorClassName = "",
  loop = false,
  className = "",
  textColors = ["inherit"]
}: TextTypeProps) {
  const [displayedText, setDisplayedText] = useState("")
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isTyping, setIsTyping] = useState(false)
  const [showCursorBlink, setShowCursorBlink] = useState(true)

  useEffect(() => {
    const startTyping = setTimeout(() => {
      setIsTyping(true)
    }, initialDelay)

    return () => clearTimeout(startTyping)
  }, [initialDelay])

  useEffect(() => {
    if (!isTyping) return

    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(text.slice(0, currentIndex + 1))
        setCurrentIndex(currentIndex + 1)
      }, typingSpeed)

      return () => clearTimeout(timeout)
    } else if (loop) {
      const resetTimeout = setTimeout(() => {
        setDisplayedText("")
        setCurrentIndex(0)
      }, 2000) // Wait 2 seconds before restarting

      return () => clearTimeout(resetTimeout)
    }
  }, [currentIndex, isTyping, text, typingSpeed, loop])

  useEffect(() => {
    if (!showCursor) return

    const interval = setInterval(() => {
      setShowCursorBlink(prev => !prev)
    }, 500)

    return () => clearInterval(interval)
  }, [showCursor])

  const textColor = textColors[0] || "inherit"

  return (
    <span className={className} style={{ color: textColor }}>
      {displayedText}
      {showCursor && (
        <span 
          className={`${cursorClassName} ${showCursorBlink ? 'opacity-100' : 'opacity-0'} transition-opacity duration-100`}
        >
          {cursorCharacter}
        </span>
      )}
    </span>
  )
}