import Link from 'next/link';
import { Clock, Heart } from 'lucide-react';

import { listRecentRecipes } from '@/lib/recipe/service';

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

const RECIPE_COLORS = [
  'bg-[#ffcdd2]',
  'bg-[#c8e6c9]',
  'bg-[#ffe0b2]',
  'bg-[#f8bbd9]',
  'bg-[#b3e5fc]',
];

const RECIPE_ICONS = ['🍲', '🍝', '🍛', '🍰', '🥗'];

export async function RecentRecipes() {
  const items = (await listRecentRecipes()).slice(0, 5);

  if (items.length === 0) {
    return (
      <div className="relative">
        <div className="absolute -top-1 left-2 right-2 h-full bg-[#e1bee7]/40 rounded-3xl" />
        <div className="relative bg-white rounded-3xl p-8 shadow-xl shadow-[#f8bbd9]/20 border border-[#f8bbd9]/30">
          <div className="py-8 text-center">
            <div className="w-16 h-16 bg-[#fce4ec] rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-3xl">🍳</span>
            </div>
            <p className="font-display text-base text-[#6b5b4f]">아직 추출한 레시피가 없어요</p>
            <p className="font-body text-sm text-[#8b7b7b] mt-1">
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
      <div className="absolute -top-1 left-2 right-2 h-full bg-[#e1bee7]/40 rounded-3xl" />

      <div className="relative bg-white rounded-3xl p-4 shadow-xl shadow-[#f8bbd9]/20 border border-[#f8bbd9]/30">
        {/* Recipe list */}
        <div className="space-y-3">
          {items.map((item, index) => (
            <Link
              href={`/recipes/${item.id}`}
              key={item.id}
              className="flex items-center gap-3 p-3 bg-[#fef7f9] rounded-2xl hover:bg-[#fce4ec]/50 transition-all cursor-pointer group"
            >
              {/* Icon */}
              <div className={`w-12 h-12 ${RECIPE_COLORS[index % RECIPE_COLORS.length]} rounded-2xl flex items-center justify-center text-2xl shadow-sm group-hover:scale-105 transition-transform`}>
                {item.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.thumbnailUrl}
                    alt={item.title}
                    className="w-full h-full object-cover rounded-2xl"
                    loading="lazy"
                  />
                ) : (
                  RECIPE_ICONS[index % RECIPE_ICONS.length]
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-[#4a4a4a] truncate">
                  {item.title}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="flex items-center gap-1 text-xs text-[#8b7b7b]">
                    <Clock className="w-3 h-3" />
                    {formatDate(item.updatedAt)}
                  </span>
                </div>
              </div>

              {/* Heart icon */}
              <div className="w-8 h-8 rounded-full bg-[#fef7f9] text-[#c8b8b8] flex items-center justify-center">
                <Heart className="w-4 h-4" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
