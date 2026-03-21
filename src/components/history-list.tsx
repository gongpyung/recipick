'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { ChefHat, Heart } from 'lucide-react';

import { getRecentRecipes } from '@/lib/api/client';
import { ErrorDisplay } from '@/components/error-display';
import { Skeleton } from '@/components/ui/skeleton';

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

const CARD_COLORS = [
  'bg-[#ffcdd2]',
  'bg-[#c8e6c9]',
  'bg-[#ffe0b2]',
  'bg-[#f8bbd9]',
  'bg-[#b3e5fc]',
  'bg-[#ffccbc]',
];

export function HistoryList() {
  const { data, isLoading, error, mutate } = useSWR('recent-recipes-full', () =>
    getRecentRecipes(),
  );

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="bg-white rounded-2xl overflow-hidden shadow-lg shadow-[#f8bbd9]/20 border border-[#f8bbd9]/30">
            <Skeleton className="h-32 w-full" />
            <div className="space-y-3 p-4">
              <Skeleton className="h-4 w-3/4 rounded-md" />
              <Skeleton className="h-3 w-1/3 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <ErrorDisplay
        code={'code' in error ? String(error.code) : 'INTERNAL_ERROR'}
        message={error instanceof Error ? error.message : undefined}
        onRetry={() => void mutate()}
      />
    );
  }

  const items = data?.items ?? [];

  if (items.length === 0) {
    return (
      <div className="relative">
        <div className="absolute -top-1 left-2 right-2 h-full bg-[#e1bee7]/40 rounded-3xl" />
        <div className="absolute -top-2 left-4 right-4 h-full bg-[#c8e6c9]/30 rounded-3xl" />
        <div className="relative bg-white rounded-3xl p-5 shadow-xl shadow-[#f8bbd9]/20 border border-[#f8bbd9]/30">
          <div className="py-12 text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-[#fce4ec] to-[#f8bbd9] rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#f8bbd9]/30">
              <ChefHat className="w-12 h-12 text-[#ad1457]" />
            </div>
            <h3 className="text-lg font-medium text-[#6b5b4f] mb-2 font-display">
              아직 추출한 레시피가 없어요
            </h3>
            <p className="text-sm text-[#8b7b7b] mb-6 font-body">
              YouTube 링크로 첫 레시피를 추출해보세요!
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#f8bbd9] to-[#e8a4b8] text-white rounded-full font-medium shadow-lg shadow-[#f8bbd9]/30 hover:shadow-xl hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              <ChefHat className="w-5 h-5" />
              레시피 픽하러 가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Decorative cards behind */}
      <div className="absolute -top-1 left-2 right-2 h-full bg-[#e1bee7]/40 rounded-3xl" />
      <div className="absolute -top-2 left-4 right-4 h-full bg-[#c8e6c9]/30 rounded-3xl" />

      <div className="relative bg-white rounded-3xl p-5 shadow-xl shadow-[#f8bbd9]/20 border border-[#f8bbd9]/30">
        {/* Recipe grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item, index) => (
            <Link
              key={item.id}
              href={`/recipes/${item.id}`}
              className="group relative bg-[#fef7f9] rounded-2xl overflow-hidden hover:-translate-y-1 hover:shadow-lg transition-all duration-300 cursor-pointer"
            >
              {/* Thumbnail area */}
              <div className={`h-32 ${CARD_COLORS[index % CARD_COLORS.length]} flex items-center justify-center`}>
                {item.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.thumbnailUrl}
                    alt={item.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-16 h-16 bg-white/60 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                    <ChefHat className="w-8 h-8 text-[#ad1457]" />
                  </div>
                )}
              </div>

              {/* Heart button */}
              <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 text-[#c8b8b8] flex items-center justify-center shadow-md">
                <Heart className="w-4 h-4" />
              </div>

              {/* Info area */}
              <div className="p-3">
                <h3 className="text-sm font-medium text-[#4a4a4a] truncate group-hover:text-[#ad1457] transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs text-[#8b7b7b] mt-1">
                  {formatDate(item.updatedAt)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
