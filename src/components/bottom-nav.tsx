'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Heart, Home, Search, Settings } from 'lucide-react';

const navItems = [
  { id: 'home', label: '홈', icon: Home, href: '/' },
  { id: 'recipes', label: '레시피', icon: BookOpen, href: '/history' },
  { id: 'search', label: '검색', icon: Search, isMain: true, href: '/' },
  { id: 'favorites', label: '즐겨찾기', icon: Heart, href: '/', disabled: true },
  { id: 'settings', label: '설정', icon: Settings, href: '/', disabled: true },
];

export function BottomNav() {
  const pathname = usePathname();

  const getActiveTab = () => {
    if (pathname === '/') return 'home';
    if (pathname === '/history' || pathname.startsWith('/recipes')) return 'recipes';
    return 'home';
  };

  const activeTab = getActiveTab();

  return (
    <div className="no-print fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* Blur background */}
      <div className="absolute inset-0 bg-white/80 backdrop-blur-lg border-t border-[#f8bbd9]/30" />

      <div className="relative max-w-md mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            if (item.isMain) {
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className="relative -mt-8"
                >
                  <div className="w-14 h-14 bg-gradient-to-br from-[#f8bbd9] to-[#e8a4b8] rounded-2xl flex items-center justify-center shadow-lg shadow-[#f8bbd9]/40 transform hover:scale-105 transition-all active:scale-95">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </Link>
              );
            }

            if (item.disabled) {
              return (
                <div
                  key={item.id}
                  role="button"
                  aria-disabled="true"
                  aria-label={`${item.label} (준비 중)`}
                  tabIndex={-1}
                  className="flex min-w-[48px] cursor-not-allowed flex-col items-center gap-1 py-1 opacity-40"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-transparent transition-all">
                    <Icon className="h-5 w-5 text-[#8b7b7b] transition-colors" />
                  </div>
                  <span className="text-[10px] font-medium text-[#8b7b7b] transition-colors">
                    {item.label}
                  </span>
                </div>
              );
            }

            return (
              <Link
                key={item.id}
                href={item.href}
                className="flex flex-col items-center gap-1 min-w-[48px] py-1"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  isActive
                    ? 'bg-[#fce4ec]'
                    : 'bg-transparent'
                }`}>
                  <Icon className={`w-5 h-5 transition-colors ${
                    isActive
                      ? 'text-[#e8a4b8]'
                      : 'text-[#8b7b7b]'
                  }`} />
                </div>
                <span className={`text-[10px] font-medium transition-colors ${
                  isActive
                    ? 'text-[#e8a4b8]'
                    : 'text-[#8b7b7b]'
                }`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* iOS style home indicator */}
      <div className="flex justify-center pb-2">
        <div className="w-32 h-1 bg-[#4a4a4a]/10 rounded-full" />
      </div>
    </div>
  );
}
