import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'AngkorLearn - AI-Powered Learning Platform for Cambodia',
  description: 'Transform any content into personalized learning experiences with AI tutoring, quizzes, and progress tracking.',
  keywords: ['learning', 'AI', 'education', 'tutoring', 'Cambodia', 'Khmer'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
