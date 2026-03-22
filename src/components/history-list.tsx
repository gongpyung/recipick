'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { ChefHat, Heart } from 'lucide-react';

import { getRecentRecipes } from '@/lib/api/client';
import { ErrorDisplay } from '@/components/error-display';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate, CARD_COLORS, extractErrorCode } from '@/lib/utils';

export function HistoryList() {
  const { data, isLoading, error, mutate } = useSWR('recent-recipes-full', () =>
    getRecentRecipes(),
  );

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-2xl border border-[#f8bbd9]/30 bg-white shadow-lg shadow-[#f8bbd9]/20"
          >
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
        code={extractErrorCode(error)}
        message={error instanceof Error ? error.message : undefined}
        onRetry={() => void mutate()}
      />
    );
  }

  const items = data?.items ?? [];

  if (items.length === 0) {
    return (
      <div className="relative">
        <div className="absolute -top-1 right-2 left-2 h-full rounded-3xl bg-[#e1bee7]/40" />
        <div className="absolute -top-2 right-4 left-4 h-full rounded-3xl bg-[#c8e6c9]/30" />
        <div className="relative rounded-3xl border border-[#f8bbd9]/30 bg-white p-5 shadow-xl shadow-[#f8bbd9]/20">
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#fce4ec] to-[#f8bbd9] shadow-lg shadow-[#f8bbd9]/30">
              <ChefHat className="h-12 w-12 text-[#ad1457]" />
            </div>
            <h3 className="font-display mb-2 text-lg font-medium text-[#6b5b4f]">
              아직 추출한 레시피가 없어요
            </h3>
            <p className="font-body mb-6 text-sm text-[#8b7b7b]">
              YouTube 링크로 첫 레시피를 추출해보세요!
            </p>
            <Link
              href="/"
              className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-gradient-to-r from-[#f8bbd9] to-[#e8a4b8] px-6 py-3 font-medium text-white shadow-lg shadow-[#f8bbd9]/30 transition-all hover:-translate-y-0.5 hover:shadow-xl"
            >
              <ChefHat className="h-5 w-5" />
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
      <div className="absolute -top-1 right-2 left-2 h-full rounded-3xl bg-[#e1bee7]/40" />
      <div className="absolute -top-2 right-4 left-4 h-full rounded-3xl bg-[#c8e6c9]/30" />

      <div className="relative rounded-3xl border border-[#f8bbd9]/30 bg-white p-5 shadow-xl shadow-[#f8bbd9]/20">
        {/* Recipe grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => (
            <Link
              key={item.id}
              href={`/recipes/${item.id}`}
              className="group relative cursor-pointer overflow-hidden rounded-2xl bg-[#fef7f9] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              {/* Thumbnail area */}
              <div
                className={`h-32 ${CARD_COLORS[index % CARD_COLORS.length]} flex items-center justify-center`}
              >
                {item.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.thumbnailUrl}
                    alt={item.title}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/60 shadow-sm transition-transform group-hover:scale-110">
                    <ChefHat className="h-8 w-8 text-[#ad1457]" />
                  </div>
                )}
              </div>

              {/* Heart button */}
              <div className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-[#c8b8b8] shadow-md">
                <Heart className="h-4 w-4" />
              </div>

              {/* Info area */}
              <div className="p-3">
                <h3 className="truncate text-sm font-medium text-[#4a4a4a] transition-colors group-hover:text-[#ad1457]">
                  {item.title}
                </h3>
                <p className="mt-1 text-xs text-[#8b7b7b]">
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
