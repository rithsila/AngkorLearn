'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User } from 'lucide-react';

type SessionState = 'init' | 'explain' | 'user_explain' | 'evaluate' | 'decide_next' | 'complete' | 'paused';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  sessionState: SessionState;
  isStarted: boolean;
}

export function ChatInterface({ messages, onSendMessage, sessionState, isStarted }: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const message = input.trim();
    setInput('');
    setIsLoading(true);
    
    await onSendMessage(message);
    setIsLoading(false);
  };

  const getPlaceholder = () => {
    switch (sessionState) {
      case 'explain':
        return 'Ask a question about this concept...';
      case 'user_explain':
        return 'Explain this concept in your own words...';
      case 'complete':
        return 'Session completed!';
      case 'paused':
        return 'Session paused. Resume to continue...';
      default:
        return 'Type your message...';
    }
  };

  const getStateIndicator = () => {
    switch (sessionState) {
      case 'explain':
        return { text: 'Tutor is explaining', color: 'bg-blue-500' };
      case 'user_explain':
        return { text: 'Your turn to explain', color: 'bg-green-500' };
      case 'evaluate':
        return { text: 'Evaluating understanding', color: 'bg-yellow-500' };
      case 'decide_next':
        return { text: 'Deciding next step', color: 'bg-purple-500' };
      case 'complete':
        return { text: 'Session complete', color: 'bg-green-600' };
      case 'paused':
        return { text: 'Session paused', color: 'bg-gray-500' };
      default:
        return { text: 'Ready to start', color: 'bg-gray-500' };
    }
  };

  const stateIndicator = getStateIndicator();

  return (
    <div className="flex-1 flex flex-col bg-gray-850 min-w-0">
      {/* State indicator */}
      <div className="px-4 py-2 bg-gray-800 border-b border-gray-700 flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${stateIndicator.color}`}></div>
        <span className="text-sm text-gray-400">{stateIndicator.text}</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!isStarted ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Bot className="w-12 h-12 text-purple-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">
                Ready to Learn
              </h3>
              <p className="text-gray-400 text-sm">
                Click &quot;Start Learning&quot; to begin your session
              </p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Starting session...</p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  message.role === 'user' ? 'bg-purple-600' : 'bg-gray-700'
                }`}>
                  {message.role === 'user' ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-gray-300" />
                  )}
                </div>
                <div className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === 'user' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-700 text-gray-100'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <span className="text-xs opacity-50 mt-1 block">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={getPlaceholder()}
            disabled={!isStarted || sessionState === 'complete' || sessionState === 'paused' || isLoading}
            className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!input.trim() || !isStarted || sessionState === 'complete' || sessionState === 'paused' || isLoading}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
