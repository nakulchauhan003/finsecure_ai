import React, { useEffect, useRef, useState } from 'react'
import { Send, Mic, LogIn, User, PiggyBank } from 'lucide-react'

type Message = {
  id: string
  text: string
  isUser: boolean
}

function generateId() {
  return Math.random().toString(36).slice(2, 9)
}

export default function Chatbot() {
  const [showChatbot, setShowChatbot] = useState(true)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: generateId(),
      text: "👋 Hi! I'm LoanAssist. Ask about EMIs, eligibility or account status.",
      isUser: false,
    },
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const processMessage = async (text: string): Promise<string> => {
    await new Promise((r) => setTimeout(r, 400))
    const msg = text.toLowerCase()
    if (!isAuthenticated) {
      if (msg.includes('login') || msg.includes('authenticate')) return 'Please login to access account-specific data.'
      return "I can help with loans and EMIs. Please login for personalized info (type 'login')."
    }
    if (msg.includes('emi') || msg.includes('due') || msg.includes('payment')) return 'Your next EMI of ₹4,500 is due on 2025-05-20.'
    if (msg.includes('eligible') || msg.includes('eligibility')) return 'Based on your profile you may be eligible for a loan up to ₹300,000.'
    return "Sorry, I didn't understand that. Try: 'emi', 'eligibility', or 'login'."
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const text = inputValue.trim()
    if (!text) return

    const userMessage: Message = { id: generateId(), text, isUser: true }
    setMessages((m) => [...m, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      const reply = await processMessage(text)
      if (text.toLowerCase() === 'login') {
        setIsAuthenticated(true)
        setMessages((m) => [...m, { id: generateId(), text: 'Logged in successfully.', isUser: false }])
      }
      setTimeout(() => {
        setMessages((m) => [...m, { id: generateId(), text: reply, isUser: false }])
        setIsLoading(false)
      }, 300)
    } catch (err) {
      setMessages((m) => [...m, { id: generateId(), text: "Sorry, something went wrong.", isUser: false }])
      setIsLoading(false)
    }
  }

  const handleVoiceToggle = () => {
    // Lightweight simulation of voice input
    setIsLoading(true)
    setTimeout(() => {
      setInputValue('Check my EMI status')
      setIsLoading(false)
    }, 800)
  }

  return (
    <div className="font-sans">
      {!showChatbot && (
        <button
          onClick={() => setShowChatbot(true)}
          className="fixed bottom-6 right-6 bg-blue-600 text-white rounded-full p-4 shadow-lg hover:bg-blue-700 transition-colors z-10"
          aria-label="Open chatbot"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
          </svg>
        </button>
      )}

      {showChatbot && (
        <div className="fixed bottom-6 right-6 w-80 h-[480px] bg-white rounded-lg shadow-xl flex flex-col overflow-hidden border border-gray-200 z-20">
          <div className="bg-blue-600 text-white px-4 py-3 flex justify-between items-center">
            <div className="flex items-center">
              <PiggyBank className="mr-2" size={18} />
              <h3 className="font-bold">LoanAssist</h3>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-sm">
                {isAuthenticated ? (
                  <div className="flex items-center"><User size={14} className="mr-1" />Logged in</div>
                ) : (
                  <div className="flex items-center"><LogIn size={14} className="mr-1" />Login</div>
                )}
              </div>
              <button onClick={() => setShowChatbot(false)} className="text-white hover:text-gray-200">
                ×
              </button>
            </div>
          </div>

          <div className="flex-1 px-3 py-2 overflow-y-auto bg-gray-50">
            {messages.map((message) => (
              <div key={message.id} className={`mb-3 flex ${message.isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`${message.isUser ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'} px-3 py-2 rounded-lg max-w-[75%]`}>
                  {message.text}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center space-x-2 p-2 mb-2">
                <div className="animate-pulse w-2 h-2 bg-blue-600 rounded-full" />
                <div className="animate-pulse w-2 h-2 bg-blue-600 rounded-full delay-100" />
                <div className="animate-pulse w-2 h-2 bg-blue-600 rounded-full delay-200" />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="px-3 py-3 bg-white border-t border-gray-200">
            <div className="flex items-center gap-2">
              <button type="button" onClick={handleVoiceToggle} className="p-2 rounded-full bg-gray-100 hover:bg-gray-200">
                <Mic size={16} />
              </button>
              <input
                aria-label="Chat input"
                className="flex-1 py-2 px-3 rounded-full bg-gray-100 focus:outline-none"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type a message..."
              />
              <button type="submit" className="ml-1 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700">
                <Send size={14} />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
