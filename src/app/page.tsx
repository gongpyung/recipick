import { Sparkles, Timer, Utensils } from 'lucide-react';

import { RecentRecipes } from '@/components/recent-recipes';
import { UrlInputForm } from '@/components/url-input-form';
import { BottomNav } from '@/components/bottom-nav';

export const dynamic = 'force-dynamic';

const FEATURES = [
  {
    icon: Utensils,
    title: '영상 · 쇼츠 지원',
    desc: 'YouTube 일반 영상과 Shorts 링크를 모두 분석합니다',
    color: 'bg-[#ffcdd2]',
    iconColor: 'text-[#e53935]',
  },
  {
    icon: Sparkles,
    title: 'AI 자동 추출',
    desc: '자막과 설명을 분석해 재료·단계를 자동으로 구조화합니다',
    color: 'bg-[#c8e6c9]',
    iconColor: 'text-[#2e5f30]',
  },
  {
    icon: Timer,
    title: '인분 조절',
    desc: '인분 수를 바꾸면 재료량이 자동으로 계산됩니다',
    color: 'bg-[#ffe0b2]',
    iconColor: 'text-[#e65100]',
  },
] as const;

export default function Home() {
  return (
    <main className="flex-1 pb-24 md:pb-0">
      {/* Background decorations */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-[#f8bbd9]/30 blur-3xl" />
        <div className="absolute top-1/2 -left-20 h-48 w-48 rounded-full bg-[#c8e6c9]/30 blur-3xl" />
        <div className="absolute right-10 bottom-20 h-32 w-32 rounded-full bg-[#ffe0b2]/30 blur-2xl" />
      </div>

      {/* Hero Section */}
      <section className="hero-bg relative border-b border-[#f8bbd9]/20 px-6 pt-14 pb-24 md:pt-20 md:pb-24">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl space-y-10 text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-[#f8bbd9]/30 bg-white px-4 py-1.5 shadow-sm">
              <span className="size-2 animate-pulse rounded-full bg-[#e8a4b8]" />
              <span className="font-body text-xs font-semibold tracking-wide text-[#e8a4b8]">
                Recipick
              </span>
            </div>

            {/* Heading */}
            <div className="space-y-5">
              <h1 className="font-display text-4xl leading-[1.1] tracking-tight text-[#4a4a4a] sm:text-5xl lg:text-6xl">
                당신이 본 요리 영상,
                <br />
                <span className="text-[#e8a4b8]">스마트하게 픽하다</span>
              </h1>
              <p className="font-body mx-auto max-w-lg text-base leading-relaxed text-[#8b7b7b] md:text-lg">
                유튜브 링크 하나면 충분합니다. AI가 자막과 설명을 분석해서 재료,
                조리 순서, 팁까지 깔끔하게 정리해 드려요.
              </p>
            </div>

            {/* URL Input */}
            <div className="mx-auto max-w-lg">
              <UrlInputForm />
            </div>
          </div>

          {/* Feature Cards */}
          <div className="mx-auto mt-16 grid max-w-4xl gap-6 sm:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, desc, color, iconColor }) => (
              <div key={title} className="relative">
                {/* Decorative card behind */}
                <div className="absolute -top-1 right-2 left-2 h-full rounded-3xl bg-[#e1bee7]/30" />
                <div className="relative flex cursor-default flex-col items-center gap-4 rounded-3xl border border-[#f8bbd9]/30 bg-white p-6 text-center shadow-xl shadow-[#f8bbd9]/20">
                  <div
                    className={`flex size-12 items-center justify-center rounded-2xl ${color}`}
                  >
                    <Icon className={`size-6 ${iconColor}`} />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="font-display text-base text-[#6b5b4f]">
                      {title}
                    </h3>
                    <p className="font-body text-sm leading-relaxed text-[#8b7b7b]">
                      {desc}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Recipes */}
      <section className="relative px-6 py-14 md:py-20" id="recent">
        <div className="mx-auto max-w-6xl space-y-8">
          <div className="space-y-2">
            <h2 className="font-display flex items-center gap-2 text-2xl tracking-tight text-[#6b5b4f] md:text-3xl">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#c8e6c9] text-sm">
                📋
              </span>
              최근 추출한 레시피
            </h2>
            <p className="font-body text-sm text-[#8b7b7b]">
              최근에 만든 레시피를 바로 확인할 수 있어요
            </p>
          </div>
          <RecentRecipes />
        </div>
      </section>

      {/* Bottom Navigation */}
      <BottomNav />
    </main>
  );
}
