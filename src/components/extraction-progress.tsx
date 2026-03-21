'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import {
  Check,
  ChefHat,
  Link2,
  LoaderCircle,
  MessageSquareText,
  Save,
  ShieldCheck,
  Video,
} from 'lucide-react';

import { getExtraction } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { ErrorDisplay } from '@/components/error-display';

const STAGES = [
  { key: 'validating_url', label: 'URL 확인', desc: 'YouTube 링크를 분석하고 있어요', icon: Link2 },
  { key: 'fetching_metadata', label: '영상 정보 수집', desc: '영상 제목과 정보를 가져오고 있어요', icon: Video },
  { key: 'fetching_captions', label: '자막 수집', desc: '영상의 자막을 추출하고 있어요', icon: MessageSquareText },
  { key: 'structuring', label: '레시피 구조화', desc: 'AI가 재료와 단계를 정리하고 있어요', icon: ChefHat },
  { key: 'normalizing', label: '결과 검증', desc: '추출된 내용을 검토하고 있어요', icon: ShieldCheck },
  { key: 'saving', label: '저장', desc: '레시피를 저장하고 있어요', icon: Save },
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
    <div className="flex flex-col items-center">
      {/* Chef emoji icon */}
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-[#f8bbd9]/30 rounded-full scale-125 animate-pulse" />
        <div className="relative w-28 h-28 bg-gradient-to-br from-[#fce4ec] to-[#f8bbd9] rounded-full flex items-center justify-center shadow-lg shadow-[#f8bbd9]/30">
          <span className="text-5xl">👨‍🍳</span>
        </div>
        <div className="absolute -top-1 -right-1 w-6 h-6 bg-[#ffe0b2] rounded-full flex items-center justify-center text-xs animate-bounce">
          ✨
        </div>
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold text-[#4a4a4a] mb-2 font-display">
        레시피를 만들고 있어요
      </h1>
      <p className="text-sm text-[#8b7b7b] text-center mb-8 font-body">
        잠시만 기다려 주세요. 보통 1~2분 정도 걸려요
      </p>

      {/* Timeline card */}
      <div className="relative w-full">
        {/* Card decorations */}
        <div className="absolute inset-0 bg-[#c8e6c9]/40 rounded-3xl transform rotate-2 scale-[0.98]" />
        <div className="absolute inset-0 bg-[#ffe0b2]/40 rounded-3xl transform -rotate-1 scale-[0.99]" />

        {/* Main card */}
        <div className="relative bg-white rounded-3xl p-6 shadow-sm border border-[#f8bbd9]/20">
          <div className="space-y-0">
            {STAGES.map((stage, index) => {
              const StepIcon = stage.icon;
              const isDone = currentIndex > index;
              const isCurrent = currentIndex === index;
              const isLast = index === STAGES.length - 1;

              return (
                <div key={stage.key} className="relative">
                  <div className="flex items-start gap-4">
                    {/* Circle icon */}
                    <div className="relative flex flex-col items-center">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500',
                          isDone && 'bg-[#f8bbd9]',
                          isCurrent && 'bg-white border-2 border-[#f8bbd9]',
                          !isDone && !isCurrent && 'bg-[#f5f5f5] border-2 border-[#e0e0e0]',
                        )}
                      >
                        {isDone ? (
                          <Check className="w-5 h-5 text-white" />
                        ) : isCurrent ? (
                          <LoaderCircle className="w-5 h-5 text-[#e8a4b8] animate-spin" />
                        ) : (
                          <StepIcon className="w-4 h-4 text-[#bdbdbd]" />
                        )}
                      </div>

                      {/* Connecting line */}
                      {!isLast && (
                        <div
                          className={cn(
                            'w-0.5 h-12 transition-all duration-500',
                            isDone ? 'bg-[#f8bbd9]' : 'bg-[#e0e0e0]',
                          )}
                        />
                      )}
                    </div>

                    {/* Text */}
                    <div className="flex-1 pt-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'text-sm font-medium transition-colors',
                            isDone && 'text-[#e8a4b8]',
                            isCurrent && 'text-[#4a4a4a]',
                            !isDone && !isCurrent && 'text-[#bdbdbd]',
                          )}
                        >
                          {stage.label}
                        </span>
                        {isDone && (
                          <span className="text-xs text-[#c8e6c9]">완료</span>
                        )}
                      </div>

                      {/* Current stage description */}
                      {isCurrent && (
                        <p className="text-xs text-[#8b7b7b] mt-1 animate-pulse">
                          {stage.desc}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
