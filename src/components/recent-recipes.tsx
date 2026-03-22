'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { Clock } from 'lucide-react';

import { getRecentRecipes } from '@/lib/api/client';
import {
  HOME_RECIPES_CACHE_KEY,
  RECENT_RECIPES_LIMIT,
} from '@/lib/api/cache-keys';
import { ErrorDisplay } from '@/components/error-display';
import { RecipeDeleteButton } from '@/components/recipe-delete-button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate, CARD_COLORS, extractErrorCode } from '@/lib/utils';

const RECIPE_ICONS = ['🍲', '🍝', '🍛', '🍰', '🥗'];

export function RecentRecipes() {
  const { data, error, isLoading, mutate } = useSWR(
    HOME_RECIPES_CACHE_KEY,
    () => getRecentRecipes(RECENT_RECIPES_LIMIT),
  );

  if (isLoading) {
    return (
      <div className="relative">
        <div className="absolute -top-1 right-2 left-2 h-full rounded-3xl bg-[#e1bee7]/40" />
        <div className="relative rounded-3xl border border-[#f8bbd9]/30 bg-white p-4 shadow-xl shadow-[#f8bbd9]/20">
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center gap-3 rounded-2xl bg-[#fef7f9] p-3"
              >
                <Skeleton className="h-12 w-12 rounded-2xl" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3 rounded-md" />
                  <Skeleton className="h-3 w-1/3 rounded-md" />
                </div>
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            ))}
          </div>
        </div>
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
        <div className="relative rounded-3xl border border-[#f8bbd9]/30 bg-white p-8 shadow-xl shadow-[#f8bbd9]/20">
          <div className="py-8 text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-[#fce4ec]">
              <span className="text-3xl">🍳</span>
            </div>
            <p className="font-display text-base text-[#6b5b4f]">
              아직 추출한 레시피가 없어요
            </p>
            <p className="font-body mt-1 text-sm text-[#8b7b7b]">
              위에서 YouTube 링크를 입력해 첫 번째 레시피를 만들어 보세요
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute -top-1 right-2 left-2 h-full rounded-3xl bg-[#e1bee7]/40" />

      <div className="relative rounded-3xl border border-[#f8bbd9]/30 bg-white p-4 shadow-xl shadow-[#f8bbd9]/20">
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={item.id} className="relative">
              <Link
                href={`/recipes/${item.id}`}
                className="group flex cursor-pointer items-center gap-3 rounded-2xl bg-[#fef7f9] p-3 pr-14 transition-all hover:bg-[#fce4ec]/50"
              >
                <div
                  className={`h-12 w-12 ${CARD_COLORS[index % CARD_COLORS.length]} flex items-center justify-center rounded-2xl text-2xl shadow-sm transition-transform group-hover:scale-105`}
                >
                  {item.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.thumbnailUrl}
                      alt={item.title}
                      className="h-full w-full rounded-2xl object-cover"
                      loading="lazy"
                    />
                  ) : (
                    RECIPE_ICONS[index % RECIPE_ICONS.length]
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-sm font-medium text-[#4a4a4a]">
                    {item.title}
                  </h4>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="flex items-center gap-1 text-xs text-[#8b7b7b]">
                      <Clock className="h-3 w-3" />
                      {formatDate(item.updatedAt)}
                    </span>
                  </div>
                </div>
              </Link>

              <div className="absolute top-1/2 right-3 -translate-y-1/2">
                <RecipeDeleteButton
                  recipeId={item.id}
                  recipeTitle={item.title}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
