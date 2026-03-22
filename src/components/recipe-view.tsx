'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChefHat,
  Clock,
  Edit3,
  ExternalLink,
  Info,
  Lightbulb,
  Link2,
  Share2,
  ShoppingBasket,
} from 'lucide-react';

import { getRecipe } from '@/lib/api/client';
import { recipeDetailCacheKey } from '@/lib/api/cache-keys';
import { scaleIngredient } from '@/lib/recipe/scaling';
import type { RecipeConfidence, WarningSeverity } from '@/lib/extraction/types';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, extractErrorCode } from '@/lib/utils';
import { ErrorDisplay } from '@/components/error-display';
import { RecipeDeleteButton } from '@/components/recipe-delete-button';
import { ServingControl } from '@/components/serving-control';

const RecipeEditForm = dynamic(
  () =>
    import('@/components/recipe-edit-form').then(
      (module) => module.RecipeEditForm,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-4">
        <Skeleton className="h-10 w-40 rounded-xl" />
        <Skeleton className="h-52 w-full rounded-3xl" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    ),
  },
);

function ConfidenceBadge({ confidence }: { confidence: RecipeConfidence }) {
  if (confidence === 'high') return null;
  return (
    <span
      className={cn(
        'font-body inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase',
        confidence === 'low' ? 'bg-[#ffcdd2]/30 text-[#c62828]' : 'badge-gold',
      )}
    >
      {confidence === 'low' ? '확인 필요' : '추정'}
    </span>
  );
}

function SeverityIcon({ severity }: { severity: WarningSeverity }) {
  if (severity === 'error')
    return <AlertTriangle className="size-5 shrink-0 text-[#c62828]" />;
  if (severity === 'warning')
    return <AlertTriangle className="size-5 shrink-0 text-[#e65100]" />;
  return <Info className="size-5 shrink-0 text-blue-500" />;
}

export function RecipeView({ recipeId }: { recipeId: string }) {
  const router = useRouter();
  const { data, error, isLoading, mutate } = useSWR(
    recipeDetailCacheKey(recipeId),
    () => getRecipe(recipeId),
  );
  const [targetServings, setTargetServings] = useState(2);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (data?.baseServings) {
      setTargetServings(data.baseServings);
    }
  }, [data?.baseServings]);

  const scaledIngredients = useMemo(() => {
    if (!data) return [];
    return data.ingredients.map((ingredient) => ({
      ...ingredient,
      scaled: scaleIngredient(ingredient, targetServings, data.baseServings),
    }));
  }, [data, targetServings]);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-12 w-2/3 rounded-xl" />
        <Skeleton className="h-6 w-1/3 rounded-lg" />
        <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <ErrorDisplay
        code={extractErrorCode(error)}
        message={error instanceof Error ? error.message : undefined}
        onRetry={() => void mutate()}
      />
    );
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyFailed(false);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
      setCopyFailed(true);
      setTimeout(() => setCopyFailed(false), 1500);
    }
  }

  if (isEditing) {
    return (
      <div className="print-full">
        <div className="relative">
          <div className="absolute -top-1.5 right-3 left-3 h-full rounded-3xl bg-[#f8bbd9]/30" />
          <div className="absolute -top-0.5 right-1.5 left-1.5 h-full rounded-3xl bg-[#f8bbd9]/50" />
          <div className="relative rounded-3xl border border-[#f8bbd9]/30 bg-white p-6 shadow-xl shadow-[#f8bbd9]/20 md:p-8">
            <h2 className="font-display mb-8 text-xl text-[#6b5b4f]">
              레시피 수정
            </h2>
            <RecipeEditForm
              initialData={{
                title: data.title,
                baseServings: data.baseServings,
                ingredients: data.ingredients,
                steps: data.steps,
                tips: data.tips,
                warnings: data.warnings,
                confidence: data.confidence,
              }}
              onCancel={() => setIsEditing(false)}
              onSaved={async () => {
                setIsEditing(false);
                await mutate();
              }}
              recipeId={recipeId}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="print-full space-y-6">
      {/* ===== RECIPE HEADER ===== */}
      <div className="relative">
        <div className="absolute -top-1 right-2 left-2 h-full rounded-3xl bg-[#f8bbd9]/30" />
        <div className="relative rounded-3xl border border-[#f8bbd9]/30 bg-white p-5 shadow-xl shadow-[#f8bbd9]/20">
          {/* Top navigation */}
          <div className="no-print mb-4 flex items-center justify-between">
            <Link
              href="/"
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-2xl bg-[#fef7f9] transition-colors hover:bg-[#fce4ec]"
            >
              <ArrowLeft className="h-5 w-5 text-[#6b5b4f]" />
            </Link>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-2xl bg-[#fef7f9] transition-colors hover:bg-[#fce4ec]"
              >
                {copied ? (
                  <Check className="h-5 w-5 text-[#2e5f30]" />
                ) : (
                  <Share2 className="h-5 w-5 text-[#6b5b4f]" />
                )}
              </button>
            </div>
          </div>

          {/* Recipe title */}
          <div className="text-center">
            {data.youtubeUrl && (
              <a
                href={data.youtubeUrl}
                target="_blank"
                rel="noreferrer"
                className="mb-3 inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#c8e6c9] px-3 py-1.5 transition-colors hover:bg-[#a5d6a7]"
              >
                <span className="text-sm">🎬</span>
                <span className="text-xs font-medium text-[#2e5f30]">
                  원본 영상 보기
                </span>
              </a>
            )}
            <h1 className="font-display mb-2 text-2xl text-[#4a4a4a]">
              {data.title}
            </h1>
            {data.summary && (
              <p className="font-body mb-2 text-sm leading-relaxed text-[#8b7b7b]">
                {data.summary}
              </p>
            )}
            <div className="flex items-center justify-center gap-4 text-sm text-[#8b7b7b]">
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-[#e8a4b8]" />
                {data.baseServings ? `${data.baseServings}인분` : '인분 미정'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== SERVING CONTROL ===== */}
      <ServingControl
        baseServings={data.baseServings}
        onChange={setTargetServings}
        targetServings={targetServings}
      />

      {/* ===== MAIN CONTENT ===== */}
      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        {/* INGREDIENTS */}
        <div className="relative">
          <div className="absolute -top-1 right-2 left-2 h-full rounded-3xl bg-[#c8e6c9]/40" />
          <div className="relative rounded-3xl border border-[#c8e6c9]/30 bg-white p-4 shadow-xl shadow-[#c8e6c9]/20">
            {/* Header */}
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#c8e6c9]">
                <ShoppingBasket className="h-4 w-4 text-[#2e5f30]" />
              </div>
              <h2 className="text-base font-semibold text-[#6b5b4f]">재료</h2>
              {data.baseServings && targetServings !== data.baseServings && (
                <span className="ml-auto text-xs font-semibold text-[#e8a4b8]">
                  {targetServings}인분 기준
                </span>
              )}
              <span className="ml-auto text-xs text-[#8b7b7b]">
                {scaledIngredients.length}가지
              </span>
            </div>

            {/* Ingredient list */}
            <div className="space-y-0 overflow-hidden rounded-2xl">
              {scaledIngredients.map((ingredient, index) => (
                <div
                  key={`${ingredient.name}-${index}`}
                  className={cn(
                    'flex items-center justify-between px-4 py-3',
                    index % 2 === 0 ? 'bg-[#fef7f9]' : 'bg-white',
                    ingredient.confidence === 'low' && 'opacity-50',
                  )}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#f8bbd9]/50 text-xs text-[#e8a4b8]">
                      {index + 1}
                    </span>
                    <span className="font-body text-sm break-keep text-[#4a4a4a]">
                      {ingredient.name}
                    </span>
                    {ingredient.note && (
                      <span className="font-body shrink-0 text-xs text-[#8b7b7b]">
                        {ingredient.note}
                      </span>
                    )}
                    <ConfidenceBadge confidence={ingredient.confidence} />
                  </div>
                  <span className="shrink-0 rounded-lg bg-[#fce4ec] px-2.5 py-1 text-sm font-medium text-[#6b5b4f]">
                    <span className="font-bold">
                      {ingredient.scaled.displayAmount ?? '적당량'}
                    </span>{' '}
                    <span className="text-[#8b7b7b]">
                      {ingredient.scaled.displayUnit ?? ''}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* STEPS */}
        <div className="relative">
          <div className="absolute -top-1 right-2 left-2 h-full rounded-3xl bg-[#f8bbd9]/40" />
          <div className="relative rounded-3xl border border-[#f8bbd9]/30 bg-white p-4 shadow-xl shadow-[#f8bbd9]/20">
            {/* Header */}
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#f8bbd9]">
                <ChefHat className="h-4 w-4 text-[#ad1457]" />
              </div>
              <h2 className="text-base font-semibold text-[#6b5b4f]">
                조리 순서
              </h2>
              <span className="ml-auto text-xs text-[#8b7b7b]">
                {data.steps.length}단계
              </span>
            </div>

            {/* Steps list */}
            <div className="relative">
              {/* Connecting line */}
              <div className="absolute top-6 bottom-6 left-4 w-0.5 bg-gradient-to-b from-[#f8bbd9] via-[#e8a4b8] to-[#f8bbd9]" />

              <div className="space-y-4">
                {data.steps.map((step, index) => (
                  <div key={step.stepNo} className="relative flex gap-4">
                    {/* Step number badge */}
                    <div className="relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#f8bbd9] to-[#e8a4b8] shadow-md">
                      <span className="text-sm font-bold text-white">
                        {step.stepNo}
                      </span>
                    </div>

                    {/* Step content */}
                    <div
                      className={cn(
                        'flex-1 rounded-2xl p-3',
                        index % 2 === 0 ? 'bg-[#fef7f9]' : 'bg-[#fce4ec]/30',
                      )}
                    >
                      <p className="font-body text-sm leading-relaxed text-[#4a4a4a]">
                        {step.text}
                      </p>
                      {step.note && (
                        <p className="font-body mt-2 text-xs text-[#8b7b7b]">
                          {step.note}
                        </p>
                      )}
                      {step.confidence !== 'high' && (
                        <div className="mt-2">
                          <ConfidenceBadge confidence={step.confidence} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== TIPS + WARNINGS ===== */}
      {(data.tips.length > 0 || data.warnings.length > 0) && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Tips Card */}
          {data.tips.length > 0 && (
            <div className="relative">
              <div className="absolute -top-0.5 right-1 left-1 h-full rounded-2xl bg-[#a5d6a7]/30" />
              <div className="relative rounded-2xl border border-[#c8e6c9]/50 bg-[#e8f5e9] p-4 shadow-lg shadow-[#c8e6c9]/20">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#c8e6c9]">
                    <Lightbulb className="h-4 w-4 text-[#2e5f30]" />
                  </div>
                  <h2 className="text-sm font-semibold text-[#2e5f30]">
                    요리 팁
                  </h2>
                </div>
                <div className="space-y-2">
                  {data.tips.map((tip, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-lg bg-[#c8e6c9] text-xs text-[#2e5f30]">
                        {i + 1}
                      </span>
                      <p className="text-sm leading-relaxed text-[#4a4a4a]">
                        {tip}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Warnings Card */}
          {data.warnings.length > 0 && (
            <div className="relative">
              <div className="absolute -top-0.5 right-1 left-1 h-full rounded-2xl bg-[#ffcc80]/30" />
              <div className="relative rounded-2xl border border-[#ffe0b2]/50 bg-[#fff8e1] p-4 shadow-lg shadow-[#ffe0b2]/20">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#ffe0b2]">
                    <AlertTriangle className="h-4 w-4 text-[#e65100]" />
                  </div>
                  <h2 className="text-sm font-semibold text-[#e65100]">
                    주의사항
                  </h2>
                </div>
                <div className="space-y-2">
                  {data.warnings.map((warning, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <SeverityIcon severity={warning.severity} />
                      <div>
                        <p className="font-body text-sm font-medium text-[#4a4a4a]">
                          {warning.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== ACTION BUTTONS ===== */}
      <div className="no-print relative">
        <div className="absolute -top-0.5 right-1 left-1 h-full rounded-2xl bg-[#e1bee7]/30" />
        <div className="relative rounded-2xl border border-[#e1bee7]/30 bg-white p-4 shadow-lg shadow-[#e1bee7]/20">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {/* Edit button */}
            <button
              onClick={() => setIsEditing(true)}
              className="group flex cursor-pointer flex-col items-center gap-2 rounded-2xl bg-[#fef7f9] p-3 transition-colors hover:bg-[#fce4ec]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f8bbd9] transition-transform group-hover:scale-105">
                <Edit3 className="h-5 w-5 text-[#ad1457]" />
              </div>
              <span className="text-xs font-medium text-[#6b5b4f]">
                수정하기
              </span>
            </button>

            {/* Copy link button */}
            <button
              onClick={handleCopy}
              className="group flex cursor-pointer flex-col items-center gap-2 rounded-2xl bg-[#fef7f9] p-3 transition-colors hover:bg-[#fce4ec]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#c8e6c9] transition-transform group-hover:scale-105">
                <Link2 className="h-5 w-5 text-[#2e5f30]" />
              </div>
              <span className="text-xs font-medium text-[#6b5b4f]">
                {copyFailed ? '복사 실패' : copied ? '복사됨!' : '링크 복사'}
              </span>
            </button>

            {/* Original video button */}
            {data.youtubeUrl ? (
              <a
                href={data.youtubeUrl}
                target="_blank"
                rel="noreferrer"
                className="group flex cursor-pointer flex-col items-center gap-2 rounded-2xl bg-[#fef7f9] p-3 transition-colors hover:bg-[#fce4ec]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ffcdd2] transition-transform group-hover:scale-105">
                  <ExternalLink className="h-5 w-5 text-[#c62828]" />
                </div>
                <span className="text-xs font-medium text-[#6b5b4f]">
                  원본 영상
                </span>
              </a>
            ) : (
              <Link
                href="/"
                className="group flex cursor-pointer flex-col items-center gap-2 rounded-2xl bg-[#fef7f9] p-3 transition-colors hover:bg-[#fce4ec]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ffcdd2] transition-transform group-hover:scale-105">
                  <ExternalLink className="h-5 w-5 text-[#c62828]" />
                </div>
                <span className="text-xs font-medium text-[#6b5b4f]">
                  새 추출
                </span>
              </Link>
            )}

            <RecipeDeleteButton
              recipeId={recipeId}
              recipeTitle={data.title}
              mode="card"
              onDeleted={() => router.replace('/history')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
