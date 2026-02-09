'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import api from '@/lib/api';
import { ContentPanel } from '@/components/learn/ContentPanel';
import { ChatInterface } from '@/components/learn/ChatInterface';
import { NotesPanel } from '@/components/learn/NotesPanel';
import { ProgressBar } from '@/components/learn/ProgressBar';
import { ArrowLeft, Play, Pause, CheckCircle } from 'lucide-react';

interface Concept {
  id: string;
  title: string;
  description: string | null;
}

interface Session {
  id: string;
  contentId: string;
  progress: number;
  status: string;
  content: {
    title: string;
    description: string | null;
  };
  currentConcept: Concept | null;
}

type SessionState = 'init' | 'explain' | 'user_explain' | 'evaluate' | 'decide_next' | 'complete' | 'paused';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// API Response types
interface CreateSessionResponse {
  session: Session;
  state?: SessionState;
}

interface StartSessionResponse {
  state: SessionState;
  concept?: Concept;
  response?: { explanation?: string } | string;
}

interface InteractResponse {
  state?: SessionState;
  response?: { explanation?: string } | string;
  evaluation?: { feedback: string; overallScore: number };
  decision?: { message: string; encouragement: string };
  progress?: number;
  concept?: Concept;
}

interface ResumeResponse {
  response?: { explanation?: string } | string;
}

export default function LearnPage() {
  const params = useParams();
  const router = useRouter();
  const { token, isAuthenticated, isLoading: authLoading } = useAuthStore();
  
  const [session, setSession] = useState<Session | null>(null);
  const [sessionState, setSessionState] = useState<SessionState>('init');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStarted, setIsStarted] = useState(false);

  const contentId = params.id as string;

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Create or resume session
  useEffect(() => {
    if (!token || !contentId) return;

    const initSession = async () => {
      try {
        setLoading(true);
        const response = await api.post<CreateSessionResponse>('/learning/sessions', { contentId });
        const data = response.data.data as CreateSessionResponse;
        setSession(data.session);
        setSessionState(data.state || 'init');
      } catch (err: unknown) {
        const error = err as { response?: { data?: { error?: { message?: string } } } };
        setError(error.response?.data?.error?.message || 'Failed to create session');
      } finally {
        setLoading(false);
      }
    };

    initSession();
  }, [token, contentId]);

  // Start the learning session
  const handleStart = async () => {
    if (!session) return;
    
    try {
      const response = await api.post<StartSessionResponse>(`/learning/sessions/${session.id}/start`);
      const data = response.data.data as StartSessionResponse;
      setIsStarted(true);
      setSessionState('explain');
      
      // Add tutor's initial explanation to messages
      if (data.response) {
        const content = typeof data.response === 'string' 
          ? data.response 
          : data.response.explanation || '';
        setMessages([{
          role: 'assistant',
          content,
          timestamp: new Date(),
        }]);
      }
      
      // Update concept
      if (data.concept) {
        setSession(prev => prev ? { ...prev, currentConcept: data.concept! } : null);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      setError(error.response?.data?.error?.message || 'Failed to start session');
    }
  };

  // Send a message
  const handleSendMessage = async (message: string) => {
    if (!session) return;
    
    // Add user message
    setMessages(prev => [...prev, {
      role: 'user',
      content: message,
      timestamp: new Date(),
    }]);

    try {
      const response = await api.post<InteractResponse>(`/learning/sessions/${session.id}/interact`, {
        message,
        state: sessionState,
      });
      const data = response.data.data as InteractResponse;
      
      // Update state
      if (data.state) {
        setSessionState(data.state);
      }
      
      // Add AI response
      let aiContent = '';
      if (data.response) {
        if (typeof data.response === 'string') {
          aiContent = data.response;
        } else if (data.response.explanation) {
          aiContent = data.response.explanation;
        }
      }
      
      // Add evaluation if present
      if (data.evaluation) {
        aiContent += `\n\n**Evaluation:** ${data.evaluation.feedback}\n- Score: ${data.evaluation.overallScore}%`;
      }
      
      // Add decision if present
      if (data.decision) {
        aiContent += `\n\n**Coach:** ${data.decision.message}\n${data.decision.encouragement}`;
      }
      
      if (aiContent) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: aiContent,
          timestamp: new Date(),
        }]);
      }
      
      // Update progress
      if (data.progress !== undefined) {
        setSession(prev => prev ? { ...prev, progress: data.progress! } : null);
      }
      
      // Update concept
      if (data.concept) {
        setSession(prev => prev ? { ...prev, currentConcept: data.concept! } : null);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${error.response?.data?.error?.message || 'Failed to process message'}`,
        timestamp: new Date(),
      }]);
    }
  };

  // Pause session
  const handlePause = async () => {
    if (!session) return;
    try {
      await api.post(`/learning/sessions/${session.id}/pause`);
      setSessionState('paused');
    } catch (err) {
      console.error('Failed to pause session:', err);
    }
  };

  // Resume session
  const handleResume = async () => {
    if (!session) return;
    try {
      const response = await api.post<ResumeResponse>(`/learning/sessions/${session.id}/resume`);
      const data = response.data.data as ResumeResponse;
      setSessionState('explain');
      if (data.response) {
        const content = typeof data.response === 'string'
          ? data.response
          : data.response.explanation || 'Welcome back! Let\'s continue.';
        setMessages(prev => [...prev, {
          role: 'assistant',
          content,
          timestamp: new Date(),
        }]);
      }
    } catch (err) {
      console.error('Failed to resume session:', err);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-red-500/10 border border-red-500 rounded-lg p-6 max-w-md">
          <h2 className="text-red-400 font-semibold mb-2">Error</h2>
          <p className="text-gray-300">{error}</p>
          <button 
            onClick={() => router.push('/dashboard')}
            className="mt-4 px-4 py-2 bg-gray-700 rounded-lg text-white hover:bg-gray-600"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-gray-400">Session not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push('/dashboard')}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-white font-semibold">{session.content.title}</h1>
              <p className="text-gray-400 text-sm">
                {session.currentConcept?.title || 'Getting started...'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <ProgressBar progress={session.progress} />
            
            {!isStarted ? (
              <button
                onClick={handleStart}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500"
              >
                <Play className="w-4 h-4" />
                Start Learning
              </button>
            ) : sessionState === 'paused' ? (
              <button
                onClick={handleResume}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500"
              >
                <Play className="w-4 h-4" />
                Resume
              </button>
            ) : sessionState === 'complete' ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-green-600/20 text-green-400 rounded-lg">
                <CheckCircle className="w-4 h-4" />
                Completed!
              </div>
            ) : (
              <button
                onClick={handlePause}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500"
              >
                <Pause className="w-4 h-4" />
                Pause
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content - Three Column Layout */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left: Content Panel */}
        <ContentPanel concept={session.currentConcept} />
        
        {/* Center: Chat Interface */}
        <ChatInterface 
          messages={messages}
          onSendMessage={handleSendMessage}
          sessionState={sessionState}
          isStarted={isStarted}
        />
        
        {/* Right: Notes Panel */}
        <NotesPanel sessionId={session.id} />
      </main>
    </div>
  );
}
