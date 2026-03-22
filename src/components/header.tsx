'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChefHat, Clock, Sparkles } from 'lucide-react';

import { cn } from '@/lib/utils';

export function Header() {
  const pathname = usePathname();

  return (
    <header className="no-print sticky top-0 z-30 border-b border-[#f8bbd9]/30 bg-white/80 backdrop-blur-lg">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="group flex cursor-pointer items-center gap-3">
          {/* Logo icon */}
          <div className="relative">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f8bbd9] to-[#e8a4b8] shadow-lg shadow-[#f8bbd9]/30 transition-transform duration-200 group-hover:scale-105">
              <ChefHat className="size-6 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-[#ffe0b2]">
              <Sparkles className="size-2.5 text-[#ff9800]" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-display text-2xl leading-tight tracking-wide text-[#6b5b4f]">
              레시픽
            </span>
            <span className="font-body text-xs leading-none text-[#8b7b7b]">
              스마트하게 픽하다
            </span>
          </div>
        </Link>

        <nav className="flex items-center">
          <Link
            href="/history"
            className={cn(
              'flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200',
              pathname === '/history'
                ? 'bg-gradient-to-r from-[#f8bbd9] to-[#e8a4b8] text-white shadow-md shadow-[#f8bbd9]/30'
                : 'text-[#8b7b7b] hover:bg-[#fce4ec] hover:text-[#6b5b4f]',
            )}
          >
            <Clock className="size-4" />
            최근 레시피
          </Link>
        </nav>
      </div>
    </header>
  );
}
