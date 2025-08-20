"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Loader2 } from "lucide-react"

interface UrlInputProps {
  onProcessUrl: (url: string) => Promise<void>
}

export function UrlInput({ onProcessUrl }: UrlInputProps) {
  const [url, setUrl] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  
  console.log('UrlInput 컴포넌트 렌더링됨')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('handleSubmit 호출됨:', url)
    if (!url.trim() || isProcessing) {
      console.log('비어있거나 처리 중이므로 종료')
      return
    }

    setIsProcessing(true)
    console.log('onProcessUrl 호출 시작:', url.trim())
    try {
      await onProcessUrl(url.trim())
      console.log('onProcessUrl 성공적으로 완료')
      setUrl("") // Reset input on success
    } catch (error) {
      console.error('URL 처리 실패:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 p-4 bg-white border-b">
      <Input
        type="url"
        placeholder="Enter YouTube URL..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        disabled={isProcessing}
        className="flex-1"
      />
      <Button 
        type="submit" 
        disabled={!url.trim() || isProcessing}
        size="icon"
      >
        {isProcessing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Plus className="w-4 h-4" />
        )}
      </Button>
    </form>
  )
}