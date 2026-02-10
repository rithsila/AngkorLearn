'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import {
  StatCard,
  ConfidenceChart,
  WeakAreasPanel,
  MasteredPanel,
  ReviewCalendar,
} from '@/components/progress';

// ── Types ──────────────────────────────────────────────────────────

interface ContentProgress {
  contentId: string;
  contentTitle: string;
  totalConcepts: number;
  completedConcepts: number;
  progressPercent: number;
  averageConfidence: number;
  totalTimeMinutes: number;
  weakAreas: { conceptId: string; title: string; confidence: number }[];
  masteredAreas: { conceptId: string; title: string; confidence: number }[];
  lastSessionAt: string | null;
}

interface ProgressSummary {
  totalContents: number;
  completedContents: number;
  totalConcepts: number;
  completedConcepts: number;
  averageConfidence: number;
  totalTimeMinutes: number;
  currentStreak: number;
  longestStreak: number;
  contentProgress: ContentProgress[];
}

interface ConfidenceDataPoint {
  date: string;
  confidence: number;
  conceptTitle: string;
}

interface ReviewItem {
  conceptId: string;
  conceptTitle: string;
  lastReviewed: string;
  confidence: number;
  reviewDueDate: string;
  priority: 'high' | 'medium' | 'low';
}

// ── API Helpers ────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

async function apiFetch<T>(endpoint: string): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || json.message || 'Request failed');
  }
  return json.data as T;
}

// ── Page Component ─────────────────────────────────────────────────

export default function ProgressPage() {
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [confidenceData, setConfidenceData] = useState<ConfidenceDataPoint[]>([]);
  const [reviewSchedule, setReviewSchedule] = useState<ReviewItem[]>([]);
  const [selectedContent, setSelectedContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProgress();
  }, []);

  useEffect(() => {
    if (selectedContent) {
      loadConfidenceHistory(selectedContent);
    }
  }, [selectedContent]);

  const loadProgress = async () => {
    try {
      setIsLoading(true);

      const [summaryData, scheduleData] = await Promise.all([
        apiFetch<ProgressSummary>('/progress/summary'),
        apiFetch<ReviewItem[]>('/review/schedule'),
      ]);

      setSummary(summaryData);
      setReviewSchedule(scheduleData);

      // Auto-select first content for chart
      if (summaryData.contentProgress.length > 0) {
        const firstContentId = summaryData.contentProgress[0].contentId;
        setSelectedContent(firstContentId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load progress');
    } finally {
      setIsLoading(false);
    }
  };

  const loadConfidenceHistory = async (contentId: string) => {
    try {
      const history = await apiFetch<ConfidenceDataPoint[]>(
        `/progress/${contentId}/confidence-history`
      );
      setConfidenceData(history);
    } catch (err) {
      console.error('Failed to load confidence history:', err);
    }
  };

  const formatTime = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // ── Aggregate weak / mastered from all content ───────────────
  const allWeakAreas =
    summary?.contentProgress.flatMap((cp) => cp.weakAreas) ?? [];
  const allMasteredAreas =
    summary?.contentProgress.flatMap((cp) => cp.masteredAreas) ?? [];

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#0F172A' }}>
      <Sidebar />

      <main className="flex-1 p-8 overflow-y-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">📈 Learning Progress</h1>
          <p className="text-slate-400 mt-1">Track your learning journey and identify areas to improve</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-slate-400 flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              Loading your progress...
            </div>
          </div>
        ) : error ? (
          <div
            className="rounded-2xl p-6 text-center"
            style={{ backgroundColor: '#1E293B', border: '1px solid #334155' }}
          >
            <p className="text-red-400 mb-2">⚠️ {error}</p>
            <button
              onClick={loadProgress}
              className="text-indigo-400 hover:text-indigo-300 text-sm font-medium transition"
            >
              Try again
            </button>
          </div>
        ) : summary ? (
          <div className="space-y-6">
            {/* ── Overview Stats ────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Concepts Mastered"
                value={summary.completedConcepts}
                icon="🎓"
                color="#6366F1"
                trend={summary.completedConcepts > 0 ? 'up' : 'stable'}
                trendValue={`${summary.totalConcepts} total`}
              />
              <StatCard
                label="Avg Confidence"
                value={`${summary.averageConfidence}%`}
                icon="📊"
                color="#8B5CF6"
                trend={
                  summary.averageConfidence >= 70
                    ? 'up'
                    : summary.averageConfidence >= 40
                    ? 'stable'
                    : 'down'
                }
                trendValue={
                  summary.averageConfidence >= 70
                    ? 'Great!'
                    : summary.averageConfidence >= 40
                    ? 'Keep going'
                    : 'Needs work'
                }
              />
              <StatCard
                label="Total Time"
                value={formatTime(summary.totalTimeMinutes)}
                icon="⏱️"
                color="#10B981"
              />
              <StatCard
                label="Streak"
                value={`🔥 ${summary.currentStreak}`}
                icon=""
                color="#F59E0B"
                trend={summary.currentStreak > 0 ? 'up' : 'stable'}
                trendValue={`Best: ${summary.longestStreak} days`}
              />
            </div>

            {/* ── Content Selector ──────────────────────────── */}
            {summary.contentProgress.length > 1 && (
              <div
                className="rounded-2xl p-4 flex items-center gap-3 flex-wrap"
                style={{ backgroundColor: '#1E293B', border: '1px solid #334155' }}
              >
                <span className="text-sm text-slate-400">Viewing:</span>
                {summary.contentProgress.map((cp) => (
                  <button
                    key={cp.contentId}
                    onClick={() => setSelectedContent(cp.contentId)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
                      selectedContent === cp.contentId
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {cp.contentTitle}
                  </button>
                ))}
              </div>
            )}

            {/* ── Confidence Chart ──────────────────────────── */}
            <ConfidenceChart data={confidenceData} />

            {/* ── Weak Areas / Mastered ─────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <WeakAreasPanel areas={allWeakAreas} />
              <MasteredPanel areas={allMasteredAreas} />
            </div>

            {/* ── Review Schedule ───────────────────────────── */}
            <ReviewCalendar items={reviewSchedule} />

            {/* ── Per-Content Progress ──────────────────────── */}
            {summary.contentProgress.length > 0 && (
              <div
                className="rounded-2xl p-6"
                style={{
                  background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
                  border: '1px solid #334155',
                }}
              >
                <h3 className="text-lg font-semibold text-white mb-4">📚 Content Overview</h3>
                <div className="space-y-4">
                  {summary.contentProgress.map((cp) => (
                    <div
                      key={cp.contentId}
                      className="flex items-center gap-4 p-4 rounded-xl"
                      style={{ backgroundColor: '#0F172A', border: '1px solid #334155' }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate">{cp.contentTitle}</p>
                        <p className="text-sm text-slate-400 mt-0.5">
                          {cp.completedConcepts}/{cp.totalConcepts} concepts •{' '}
                          {formatTime(cp.totalTimeMinutes)} •{' '}
                          {cp.averageConfidence}% confidence
                        </p>
                      </div>
                      {/* Progress ring-like bar */}
                      <div className="w-32 shrink-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-slate-400">Progress</span>
                          <span className="text-xs font-medium text-indigo-400">
                            {cp.progressPercent}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2">
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{
                              width: `${cp.progressPercent}%`,
                              background: 'linear-gradient(90deg, #6366F1, #10B981)',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div
            className="rounded-2xl p-12 text-center"
            style={{ backgroundColor: '#1E293B', border: '1px solid #334155' }}
          >
            <p className="text-4xl mb-4">📈</p>
            <h2 className="text-xl font-semibold text-white mb-2">No progress yet</h2>
            <p className="text-slate-400">
              Start a learning session to see your progress here!
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
