'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { BookOpen, Clock } from 'lucide-react';

import { getRecentRecipes } from '@/lib/api/client';
import { Skeleton } from '@/components/ui/skeleton';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function HistoryList() {
  const { data, isLoading } = useSWR('recent-recipes-full', () =>
    getRecentRecipes(),
  );

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="overflow-hidden rounded-xl border bg-card">
            <Skeleton className="aspect-video w-full" />
            <div className="space-y-2 p-4">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const items = data?.items ?? [];

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed bg-card/50 px-6 py-16">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-muted">
          <BookOpen className="size-6 text-muted-foreground" />
        </div>
        <div className="space-y-1 text-center">
          <p className="font-medium text-foreground">
            아직 추출한 레시피가 없어요
          </p>
          <p className="text-sm text-muted-foreground">
            홈에서 YouTube 링크를 입력해서 첫 번째 레시피를 만들어 보세요.
          </p>
        </div>
        <Link
          href="/"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          레시피 추출하러 가기
        </Link>
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
