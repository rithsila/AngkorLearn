import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏛️</span>
              <span className="font-bold text-xl text-gray-900">AngkorLearn</span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="text-gray-600 hover:text-gray-900 font-medium transition"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-6 animate-fade-in">
            Learn Anything with
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-accent-500">
              {' '}AI Tutoring
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto animate-slide-up">
            Upload any PDF, book, or document and transform it into a personalized 
            learning experience with 5 AI tutors, quizzes, and progress tracking.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up">
            <Link
              href="/register"
              className="bg-primary-600 text-white px-8 py-3 rounded-xl font-semibold text-lg hover:bg-primary-700 transition shadow-lg hover:shadow-xl"
            >
              Start Learning Free →
            </Link>
            <Link
              href="/discover"
              className="bg-white text-gray-700 px-8 py-3 rounded-xl font-semibold text-lg border border-gray-300 hover:border-gray-400 transition"
            >
              Explore Content
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-gray-50 hover:bg-gray-100 transition">
              <div className="text-4xl mb-4">📤</div>
              <h3 className="text-xl font-semibold mb-2">Upload Content</h3>
              <p className="text-gray-600">
                Upload any PDF, ebook, or document. Our AI analyzes and structures it for learning.
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-gray-50 hover:bg-gray-100 transition">
              <div className="text-4xl mb-4">🤖</div>
              <h3 className="text-xl font-semibold mb-2">Learn with AI</h3>
              <p className="text-gray-600">
                Chat with 5 AI roles: Tutor, Examiner, Coach, Planner, and Reviewer.
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-gray-50 hover:bg-gray-100 transition">
              <div className="text-4xl mb-4">📈</div>
              <h3 className="text-xl font-semibold mb-2">Track Progress</h3>
              <p className="text-gray-600">
                Monitor your learning journey with detailed analytics and mastery tracking.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-gray-200">
        <div className="max-w-6xl mx-auto text-center text-gray-500">
          <p>© 2024 AngkorLearn 🇰🇭 Built with ❤️ for learners in Cambodia.</p>
        </div>
      </footer>
    </main>
  );
}
