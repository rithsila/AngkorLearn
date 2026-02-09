import Link from 'next/link';
import { Sidebar } from '@/components/layout/Sidebar';

export default function DashboardPage() {
  // Mock data - will be replaced with real data
  const mockContent = [
    { id: '1', title: 'Introduction to Machine Learning', progress: 65, status: 'READY' },
    { id: '2', title: 'React Best Practices', progress: 30, status: 'READY' },
    { id: '3', title: 'Financial Markets Guide', progress: 0, status: 'PROCESSING' },
  ];

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
            <div className="text-2xl font-bold text-gray-900">3</div>
            <div className="text-gray-600">Total Content</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="text-3xl mb-2">⏱️</div>
            <div className="text-2xl font-bold text-gray-900">12.5h</div>
            <div className="text-gray-600">Learning Time</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="text-3xl mb-2">🎯</div>
            <div className="text-2xl font-bold text-gray-900">47%</div>
            <div className="text-gray-600">Avg Progress</div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockContent.map((content) => (
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
                    <span className="text-sm">Processing...</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary-500 h-2 rounded-full transition-all"
                          style={{ width: `${content.progress}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600">{content.progress}%</span>
                    </div>
                    <Link
                      href={`/learn/${content.id}`}
                      className="block text-center bg-primary-50 text-primary-600 py-2 rounded-lg font-medium hover:bg-primary-100 transition"
                    >
                      Continue Learning
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
      </main>
    </div>
  );
}
