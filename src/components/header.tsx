'use client';

import Link from 'next/link';
import { ChefHat, Clock } from 'lucide-react';

export function Header() {
  return (
    <header className="no-print bg-card/80 sticky top-0 z-30 border-b backdrop-blur-lg">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-3">
        <Link
          href="/"
          className="group flex items-center gap-2.5 transition-opacity hover:opacity-80"
        >
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ChefHat className="size-4.5" />
          </div>
          <span className="text-base font-semibold tracking-tight">
            레시피 AI
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          <Link
            href="/history"
            className="text-muted-foreground hover:bg-accent/60 hover:text-foreground flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors"
          >
            <Clock className="size-3.5" />
            최근 레시피
          </Link>
        </nav>
      </div>
    </header>
  );
}
