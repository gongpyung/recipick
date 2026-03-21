import Link from 'next/link';
import { Clock } from 'lucide-react';

import { listRecentRecipes } from '@/lib/recipe/service';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export async function RecentRecipes() {
  const items = (await listRecentRecipes()).slice(0, 5);

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-card/50 px-6 py-10 text-center">
        <p className="text-sm text-muted-foreground">
          아직 추출한 레시피가 없어요. 첫 번째 유튜브 레시피를 추출해 보세요.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <Link href={`/recipes/${item.id}`} key={item.id}>
          <article className="group overflow-hidden rounded-xl border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
            <div className="aspect-video overflow-hidden bg-muted">
              {item.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.thumbnailUrl}
                  alt={item.title}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground/40">
                  <Clock className="size-8" />
                </div>
              )}
            </div>
            <div className="space-y-1.5 p-4">
              <h3 className="line-clamp-2 text-sm font-medium leading-snug">
                {item.title}
              </h3>
              <p className="text-xs text-muted-foreground">
                {formatDate(item.updatedAt)}
              </p>
            </div>
          </article>
        </Link>
      ))}
    </div>
  );
}
