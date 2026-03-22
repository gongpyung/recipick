'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Heart, Home, Search, Settings } from 'lucide-react';

const navItems = [
  { id: 'home', label: '홈', icon: Home, href: '/' },
  { id: 'recipes', label: '레시피', icon: BookOpen, href: '/history' },
  { id: 'search', label: '검색', icon: Search, isMain: true, href: '/' },
  {
    id: 'favorites',
    label: '즐겨찾기',
    icon: Heart,
    href: '/',
    disabled: true,
  },
  { id: 'settings', label: '설정', icon: Settings, href: '/', disabled: true },
];

export function BottomNav() {
  const pathname = usePathname();

  const getActiveTab = () => {
    if (pathname === '/') return 'home';
    if (pathname === '/history' || pathname.startsWith('/recipes'))
      return 'recipes';
    return 'home';
  };

  const activeTab = getActiveTab();

  return (
    <div className="no-print fixed right-0 bottom-0 left-0 z-50 md:hidden">
      {/* Blur background */}
      <div className="absolute inset-0 border-t border-[#f8bbd9]/30 bg-white/80 backdrop-blur-lg" />

      <div className="relative mx-auto max-w-md px-6 py-3">
        <div className="flex items-center justify-between">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            if (item.isMain) {
              return (
                <Link key={item.id} href={item.href} className="relative -mt-8">
                  <div className="flex h-14 w-14 transform items-center justify-center rounded-2xl bg-gradient-to-br from-[#f8bbd9] to-[#e8a4b8] shadow-lg shadow-[#f8bbd9]/40 transition-all hover:scale-105 active:scale-95">
                    <Icon className="h-6 w-6 text-white" />
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
                className="flex min-w-[48px] flex-col items-center gap-1 py-1"
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all ${
                    isActive ? 'bg-[#fce4ec]' : 'bg-transparent'
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 transition-colors ${
                      isActive ? 'text-[#e8a4b8]' : 'text-[#8b7b7b]'
                    }`}
                  />
                </div>
                <span
                  className={`text-[10px] font-medium transition-colors ${
                    isActive ? 'text-[#e8a4b8]' : 'text-[#8b7b7b]'
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* iOS style home indicator */}
      <div className="flex justify-center pb-2">
        <div className="h-1 w-32 rounded-full bg-[#4a4a4a]/10" />
      </div>
    </div>
  );
}
