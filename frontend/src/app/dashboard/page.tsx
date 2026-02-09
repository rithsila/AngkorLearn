'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { contentApi, Content, ApiError } from '@/lib/api';

export default function DashboardPage() {
  const [contents, setContents] = useState<Content[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadContents();
  }, []);

  const loadContents = async () => {
    try {
      setIsLoading(true);
      const { contents } = await contentApi.list();
      setContents(contents);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load content';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const stats = {
    total: contents.length,
    ready: contents.filter(c => c.status === 'READY').length,
    avgProgress: contents.length > 0 
      ? Math.round(contents.reduce((acc, c) => acc + (c.processingProgress || 0), 0) / contents.length)
      : 0,
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      
      <main className="flex-1 p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Library</h1>
            <p className="text-gray-600">Continue your learning journey</p>
          </div>
          <Link
            href="/upload"
            className="bg-primary-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-700 transition flex items-center gap-2"
          >
            <span>📤</span> Upload Content
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="text-3xl mb-2">📚</div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-gray-600">Total Content</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="text-3xl mb-2">✅</div>
            <div className="text-2xl font-bold text-gray-900">{stats.ready}</div>
            <div className="text-gray-600">Ready to Learn</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="text-3xl mb-2">🎯</div>
            <div className="text-2xl font-bold text-gray-900">{stats.avgProgress}%</div>
            <div className="text-gray-600">Avg Progress</div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
            <button onClick={loadContents} className="ml-4 underline">Retry</button>
          </div>
        )}

        {/* Content Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin text-4xl mb-4">⏳</div>
            <p className="text-gray-500">Loading your content...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {contents.map((content) => (
              <div
                key={content.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition"
              >
                {/* Cover placeholder */}
                <div className="h-32 bg-gradient-to-br from-primary-100 to-accent-100 flex items-center justify-center">
                  <span className="text-4xl">📘</span>
                </div>
                
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                    {content.title}
                  </h3>
                  
                  {content.status === 'PROCESSING' ? (
                    <div className="flex items-center gap-2 text-amber-600">
                      <span className="animate-spin">⏳</span>
                      <span className="text-sm">Processing... {content.processingProgress}%</span>
                    </div>
                  ) : content.status === 'ERROR' ? (
                    <div className="flex items-center gap-2 text-red-600">
                      <span>❌</span>
                      <span className="text-sm">Processing failed</span>
                    </div>
                  ) : content.status === 'PENDING' ? (
                    <div className="flex items-center gap-2 text-gray-500">
                      <span>⏳</span>
                      <span className="text-sm">Pending...</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-primary-500 h-2 rounded-full transition-all"
                            style={{ width: `${content.processingProgress || 0}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600">{content.processingProgress || 0}%</span>
                      </div>
                      <Link
                        href={`/learn/${content.id}`}
                        className="block text-center bg-primary-50 text-primary-600 py-2 rounded-lg font-medium hover:bg-primary-100 transition"
                      >
                        Start Learning
                      </Link>
                    </>
                  )}
                </div>
              </div>
            ))}

            {/* Upload Card */}
            <Link
              href="/upload"
              className="bg-white rounded-xl shadow-sm border-2 border-dashed border-gray-300 overflow-hidden hover:border-primary-400 hover:bg-primary-50 transition flex flex-col items-center justify-center min-h-[200px] text-gray-500 hover:text-primary-600"
            >
              <span className="text-4xl mb-2">➕</span>
              <span className="font-medium">Add New Content</span>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
