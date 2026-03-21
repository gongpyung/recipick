'use client';

import Link from 'next/link';
import { AlertTriangle, Home, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';

const ERROR_COPY: Record<
  string,
  { title: string; description: string; retryable: boolean }
> = {
  INVALID_URL: {
    title: '유효한 유튜브 URL이 아닙니다',
    description: '링크를 다시 확인해 주세요.',
    retryable: false,
  },
  VIDEO_NOT_FOUND: {
    title: '영상을 찾을 수 없습니다',
    description: '삭제되었거나 비공개 영상일 수 있습니다.',
    retryable: false,
  },
  INSUFFICIENT_SOURCE_TEXT: {
    title: '자막 또는 설명 정보가 부족합니다',
    description: '자막이 충분한 영상으로 다시 시도해 주세요.',
    retryable: false,
  },
  NON_RECIPE_VIDEO: {
    title: '레시피 영상이 아닙니다',
    description: '요리 영상 링크인지 확인해 주세요.',
    retryable: false,
  },
  LLM_REQUEST_FAILED: {
    title: 'AI 처리 중 오류가 발생했습니다',
    description: '잠시 후 다시 시도해 주세요.',
    retryable: true,
  },
  LLM_RATE_LIMITED: {
    title: '잠시 후 다시 시도해 주세요',
    description: '요청이 몰려 응답이 지연되고 있습니다.',
    retryable: true,
  },
  INTERNAL_ERROR: {
    title: '서버 오류가 발생했습니다',
    description: '잠시 후 다시 시도하거나 홈으로 돌아가 주세요.',
    retryable: true,
  },
};

export function ErrorDisplay({
  code,
  message,
  retryLabel = '다시 시도하기',
  onRetry,
}: {
  code: string;
  message?: string;
  retryLabel?: string;
  onRetry?: () => void;
}) {
  const copy = ERROR_COPY[code] ?? {
    title: '오류가 발생했습니다',
    description: message ?? '잠시 후 다시 시도해 주세요.',
    retryable: true,
  };

  return (
    <div className="mx-auto max-w-md space-y-6 text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-destructive/10">
        <AlertTriangle className="size-7 text-destructive" />
      </div>
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">{copy.title}</h2>
        <p className="text-sm text-muted-foreground">
          {message ?? copy.description}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {copy.retryable && onRetry ? (
          <Button onClick={onRetry} variant="outline">
            <RotateCcw className="size-4" />
            {retryLabel}
          </Button>
        ) : null}
        <Button nativeButton={false} render={<Link href="/" />}>
          <Home className="size-4" />
          홈으로 돌아가기
        </Button>
      </div>
    </div>
  );
}
