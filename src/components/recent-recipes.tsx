import Link from 'next/link';
import { Clock, Heart } from 'lucide-react';

import { listRecentRecipes } from '@/lib/recipe/service';
import { formatDate, CARD_COLORS } from '@/lib/utils';

const RECIPE_ICONS = ['🍲', '🍝', '🍛', '🍰', '🥗'];

export async function RecentRecipes() {
  const items = (await listRecentRecipes()).slice(0, 5);

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
      {/* Decorative card behind */}
      <div className="absolute -top-1 right-2 left-2 h-full rounded-3xl bg-[#e1bee7]/40" />

      <div className="relative rounded-3xl border border-[#f8bbd9]/30 bg-white p-4 shadow-xl shadow-[#f8bbd9]/20">
        {/* Recipe list */}
        <div className="space-y-3">
          {items.map((item, index) => (
            <Link
              href={`/recipes/${item.id}`}
              key={item.id}
              className="group flex cursor-pointer items-center gap-3 rounded-2xl bg-[#fef7f9] p-3 transition-all hover:bg-[#fce4ec]/50"
            >
              {/* Icon */}
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

              {/* Info */}
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

              {/* Heart icon */}
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#fef7f9] text-[#c8b8b8]">
                <Heart className="h-4 w-4" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
