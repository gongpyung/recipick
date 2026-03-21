'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { Check, Circle, LoaderCircle } from 'lucide-react';

import { getExtraction } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { ErrorDisplay } from '@/components/error-display';

const STAGES = [
  { key: 'validating_url', label: 'URL 확인 중' },
  { key: 'fetching_metadata', label: '영상 정보 수집 중' },
  { key: 'fetching_captions', label: '자막 수집 중' },
  { key: 'structuring', label: '레시피 구조화 중' },
  { key: 'normalizing', label: '결과 검증 중' },
  { key: 'saving', label: '저장 중' },
] as const;

function getStageIndex(stage: string) {
  return STAGES.findIndex((s) => s.key === stage);
}

export function ExtractionProgress({ extractionId }: { extractionId: string }) {
  const router = useRouter();
  const { data, error, mutate } = useSWR(
    ['extraction', extractionId],
    () => getExtraction(extractionId),
    {
      refreshInterval: (currentData) =>
        currentData?.status === 'completed' || currentData?.status === 'failed'
          ? 0
          : 2000,
    },
  );

  useEffect(() => {
    if (data?.status === 'completed' && data.recipeId) {
      router.push(`/recipes/${data.recipeId}`);
    }
  }, [data, router]);

  if (error) {
    return (
      <ErrorDisplay
        code={'code' in error ? String(error.code) : 'INTERNAL_ERROR'}
        message={error instanceof Error ? error.message : undefined}
        onRetry={() => void mutate()}
      />
    );
  }

  if (data?.status === 'failed') {
    return (
      <ErrorDisplay
        code={data.errorCode ?? 'INTERNAL_ERROR'}
        message={data.message}
        retryLabel="홈에서 다시 시도하기"
        onRetry={() => router.push('/')}
      />
    );
  }

  const currentStage = data?.stage ?? 'validating_url';
  const currentIndex = getStageIndex(currentStage);

  return (
    <div className="mx-auto max-w-md space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">
          레시피를 만들고 있어요
        </h1>
        <p className="text-sm text-muted-foreground">
          잠시만 기다려 주세요. 보통 1~2분 정도 걸려요.
        </p>
      </div>

      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="space-y-0">
          {STAGES.map((stage, index) => {
            const isDone = currentIndex > index;
            const isCurrent = currentIndex === index;
            const isLast = index === STAGES.length - 1;

            return (
              <div key={stage.key} className="flex gap-3.5">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      'flex size-7 shrink-0 items-center justify-center rounded-full transition-all',
                      isDone && 'bg-primary text-primary-foreground',
                      isCurrent && 'bg-primary/15 text-primary ring-2 ring-primary/30',
                      !isDone && !isCurrent && 'bg-muted text-muted-foreground/50',
                    )}
                  >
                    {isDone ? (
                      <Check className="size-3.5" />
                    ) : isCurrent ? (
                      <LoaderCircle className="size-3.5 animate-spin" />
                    ) : (
                      <Circle className="size-2.5" />
                    )}
                  </div>
                  {!isLast && (
                    <div
                      className={cn(
                        'my-1 h-6 w-px',
                        isDone ? 'bg-primary/40' : 'bg-border',
                      )}
                    />
                  )}
                </div>
                <div className={cn('pb-5', isLast && 'pb-0')}>
                  <p
                    className={cn(
                      'pt-0.5 text-sm font-medium leading-7',
                      isDone && 'text-foreground',
                      isCurrent && 'text-primary',
                      !isDone && !isCurrent && 'text-muted-foreground/60',
                    )}
                  >
                    {stage.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
