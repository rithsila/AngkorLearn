'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/dashboard', label: 'Library', icon: '📚' },
  { href: '/discover', label: 'Discover', icon: '🔍' },
  { href: '/progress', label: 'Progress', icon: '📈' },
  { href: '/creator', label: 'Creator', icon: '💰' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🏛️</span>
          <span className="font-bold text-xl text-gray-900">AngkorLearn</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                    isActive
                      ? 'bg-primary-50 text-primary-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Upload Button */}
      <div className="p-4 border-t border-gray-200">
        <Link
          href="/upload"
          className="flex items-center justify-center gap-2 w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 transition"
        >
          <span>📤</span>
          <span>Upload Content</span>
        </Link>
      </div>

      {/* User */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
            <span>👤</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-900 truncate">User</div>
            <div className="text-sm text-gray-500 truncate">user@example.com</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
