'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Bot, Send, X, Mic, MicOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionResultList {
  length: number
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  length: number
  isFinal: boolean
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: (event: SpeechRecognitionEvent) => void
  onend: () => void
  onerror: (event: any) => void
  start: () => void
  stop: () => void
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition
    webkitSpeechRecognition: new () => SpeechRecognition
  }
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const LoadingDots = () => {
  return (
    <div className="flex space-x-1 items-center">
      <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
      <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
    </div>
  )
}

export const AIAssistant = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [micError, setMicError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)
  const isProcessingRef = useRef(false)
  const finalTranscriptRef = useRef('')

  useEffect(() => {
    // Initialize speech recognition
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (SpeechRecognition) {
        try {
          recognitionRef.current = new SpeechRecognition()
          recognitionRef.current.continuous = true // Enable continuous recognition
          recognitionRef.current.interimResults = true // Get interim results
          recognitionRef.current.lang = 'en-US'

          recognitionRef.current.onresult = async (event: SpeechRecognitionEvent) => {
            let interimTranscript = ''
            let finalTranscript = ''

            for (let i = event.resultIndex; i < event.results.length; i++) {
              const result = event.results[i]
              if (result && result[0]) {
                const transcript = result[0].transcript
                if (result.isFinal) {
                  finalTranscript += transcript
                } else {
                  interimTranscript += transcript
                }
              }
            }

            // Update input with interim results
            setInput(interimTranscript || finalTranscript)

            // If we have a final transcript and we're not already processing
            if (finalTranscript && !isProcessingRef.current) {
              isProcessingRef.current = true
              finalTranscriptRef.current = finalTranscript
              await handleSubmit(new Event('submit') as any)
              isProcessingRef.current = false
            }
          }

          recognitionRef.current.onend = () => {
            if (isListening) {
              // Restart recognition if we're still supposed to be listening
              try {
                recognitionRef.current?.start()
              } catch (error) {
                console.error('Error restarting speech recognition:', error)
                setIsListening(false)
                setMicError('Error with speech recognition. Please try again.')
              }
            }
          }

          recognitionRef.current.onerror = (event) => {
            console.error('Speech recognition error:', event)
            setMicError('Error with speech recognition. Please try again.')
            setIsListening(false)
          }
        } catch (error) {
          console.error('Error initializing speech recognition:', error)
          setMicError('Speech recognition is not supported in your browser.')
        }
      } else {
        setMicError('Speech recognition is not supported in your browser.')
      }
    }

    // Initialize speech synthesis
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      if (synthRef.current) {
        synthRef.current.cancel()
      }
    }
  }, [])

  const startListening = () => {
    if (!recognitionRef.current) {
      setMicError('Speech recognition is not available.')
      return
    }

    try {
      setMicError(null)
      finalTranscriptRef.current = ''
      recognitionRef.current.start()
      setIsListening(true)
    } catch (error) {
      console.error('Error starting speech recognition:', error)
      setMicError('Failed to start speech recognition. Please try again.')
      setIsListening(false)
    }
  }

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
        setIsListening(false)
      } catch (error) {
        console.error('Error stopping speech recognition:', error)
        setMicError('Error stopping speech recognition.')
      }
    }
  }

  const speak = (text: string) => {
    if (synthRef.current) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => {
        setIsSpeaking(false)
        // If we're still listening, restart recognition after speaking
        if (isListening && recognitionRef.current) {
          try {
            recognitionRef.current.start()
          } catch (error) {
            console.error('Error restarting speech recognition after speaking:', error)
          }
        }
      }
      synthRef.current.speak(utterance)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const messageToSend = finalTranscriptRef.current || input
    if (!messageToSend.trim()) return

    const userMessage: Message = { role: 'user', content: messageToSend }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    finalTranscriptRef.current = ''
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageToSend }),
      })

      const data = await response.json()
      const assistantMessage: Message = { role: 'assistant', content: data.message }
      setMessages((prev) => [...prev, assistantMessage])
      speak(data.message)
    } catch (error) {
      console.error('Error:', error)
      const errorMessage = 'Sorry, I encountered an error. Please try again.'
      setMessages((prev) => [...prev, { role: 'assistant', content: errorMessage }])
      speak(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'rounded-full w-12 h-12 p-0',
          isOpen ? 'bg-destructive hover:bg-destructive/90' : 'bg-primary hover:bg-primary/90',
        )}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
      </Button>

      {isOpen && (
        <Card className="absolute bottom-16 right-0 w-[350px] shadow-lg">
          <div className="p-4 border-b">
            <h3 className="font-semibold">AI Assistant</h3>
          </div>
          <ScrollArea ref={scrollRef} className="h-[340px] p-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  'mb-4 p-3 rounded-lg',
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground ml-auto'
                    : 'bg-muted',
                )}
              >
                {message.content}
              </div>
            ))}
            {isLoading && (
              <div className="flex w-fit max-w-[85%] rounded-lg bg-muted px-4 py-2">
                <LoadingDots />
              </div>
            )}
          </ScrollArea>
          <form onSubmit={handleSubmit} className="border-t p-4">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isListening ? "I'm listening..." : 'Type your message...'}
                className="flex-1"
                disabled={isLoading || isListening}
              />
              <Button
                type="button"
                size="icon"
                variant={isListening ? 'destructive' : 'outline'}
                onClick={isListening ? stopListening : startListening}
                disabled={isLoading || isSpeaking || !!micError}
                title={micError || (isListening ? 'Stop listening' : 'Start listening')}
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
              <Button type="submit" size="icon" disabled={isLoading || isListening}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
            {micError && <p className="text-sm text-destructive mt-2">{micError}</p>}
          </form>
        </Card>
      )}
    </div>
  )
}
