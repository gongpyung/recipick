'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChefHat,
  Clock,
  Edit3,
  ExternalLink,
  Heart,
  Info,
  Lightbulb,
  Link2,
  Share2,
  ShoppingBasket,
} from 'lucide-react';

import { getRecipe } from '@/lib/api/client';
import { scaleIngredient } from '@/lib/recipe/scaling';
import type { RecipeConfidence, WarningSeverity } from '@/lib/extraction/types';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ErrorDisplay } from '@/components/error-display';
import { RecipeEditForm } from '@/components/recipe-edit-form';
import { ServingControl } from '@/components/serving-control';

function ConfidenceBadge({ confidence }: { confidence: RecipeConfidence }) {
  if (confidence === 'high') return null;
  return (
    <span
      className={cn(
        'font-body inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
        confidence === 'low'
          ? 'bg-[#ffcdd2]/30 text-[#c62828]'
          : 'badge-gold',
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
  const { data, error, isLoading, mutate } = useSWR(
    ['recipe', recipeId],
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
        code={error && 'code' in error ? String(error.code) : 'INTERNAL_ERROR'}
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
          <div className="absolute -top-1.5 left-3 right-3 h-full bg-[#f8bbd9]/30 rounded-3xl" />
          <div className="absolute -top-0.5 left-1.5 right-1.5 h-full bg-[#f8bbd9]/50 rounded-3xl" />
          <div className="relative bg-white rounded-3xl p-6 md:p-8 shadow-xl shadow-[#f8bbd9]/20 border border-[#f8bbd9]/30">
            <h2 className="font-display mb-8 text-xl text-[#6b5b4f]">레시피 수정</h2>
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
        <div className="absolute -top-1 left-2 right-2 h-full bg-[#f8bbd9]/30 rounded-3xl" />
        <div className="relative bg-white rounded-3xl p-5 shadow-xl shadow-[#f8bbd9]/20 border border-[#f8bbd9]/30">
          {/* Top navigation */}
          <div className="flex items-center justify-between mb-4 no-print">
            <Link
              href="/"
              className="w-10 h-10 bg-[#fef7f9] rounded-2xl flex items-center justify-center hover:bg-[#fce4ec] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5 text-[#6b5b4f]" />
            </Link>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="w-10 h-10 bg-[#fef7f9] rounded-2xl flex items-center justify-center hover:bg-[#fce4ec] transition-colors cursor-pointer"
              >
                {copied ? (
                  <Check className="w-5 h-5 text-[#2e5f30]" />
                ) : (
                  <Share2 className="w-5 h-5 text-[#6b5b4f]" />
                )}
              </button>
              <button className="w-10 h-10 bg-[#ffcdd2] rounded-2xl flex items-center justify-center hover:bg-[#ef9a9a] transition-colors cursor-pointer">
                <Heart className="w-5 h-5 text-[#e53935] fill-current" />
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
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#c8e6c9] rounded-full mb-3 cursor-pointer hover:bg-[#a5d6a7] transition-colors"
              >
                <span className="text-sm">🎬</span>
                <span className="text-xs font-medium text-[#2e5f30]">원본 영상 보기</span>
              </a>
            )}
            <h1 className="text-2xl font-display text-[#4a4a4a] mb-2">
              {data.title}
            </h1>
            {data.summary && (
              <p className="font-body text-sm leading-relaxed text-[#8b7b7b] mb-2">
                {data.summary}
              </p>
            )}
            <div className="flex items-center justify-center gap-4 text-sm text-[#8b7b7b]">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#e8a4b8]" />
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
          <div className="absolute -top-1 left-2 right-2 h-full bg-[#c8e6c9]/40 rounded-3xl" />
          <div className="relative bg-white rounded-3xl p-4 shadow-xl shadow-[#c8e6c9]/20 border border-[#c8e6c9]/30">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-[#c8e6c9] rounded-xl flex items-center justify-center">
                <ShoppingBasket className="w-4 h-4 text-[#2e5f30]" />
              </div>
              <h2 className="text-base font-semibold text-[#6b5b4f]">재료</h2>
              {data.baseServings && targetServings !== data.baseServings && (
                <span className="text-xs font-semibold text-[#e8a4b8] ml-auto">
                  {targetServings}인분 기준
                </span>
              )}
              <span className="text-xs text-[#8b7b7b] ml-auto">{scaledIngredients.length}가지</span>
            </div>

            {/* Ingredient list */}
            <div className="space-y-0 rounded-2xl overflow-hidden">
              {scaledIngredients.map((ingredient, index) => (
                <div
                  key={`${ingredient.name}-${index}`}
                  className={cn(
                    'flex items-center justify-between px-4 py-3',
                    index % 2 === 0 ? 'bg-[#fef7f9]' : 'bg-white',
                    ingredient.confidence === 'low' && 'opacity-50',
                  )}
                >
                  <div className="flex flex-1 items-center gap-3 min-w-0">
                    <span className="w-6 h-6 bg-[#f8bbd9]/50 rounded-lg flex items-center justify-center text-xs text-[#e8a4b8]">
                      {index + 1}
                    </span>
                    <span className="font-body text-sm text-[#4a4a4a] break-keep">
                      {ingredient.name}
                    </span>
                    {ingredient.note && (
                      <span className="font-body shrink-0 text-xs text-[#8b7b7b]">
                        {ingredient.note}
                      </span>
                    )}
                    <ConfidenceBadge confidence={ingredient.confidence} />
                  </div>
                  <span className="text-sm font-medium text-[#6b5b4f] bg-[#fce4ec] px-2.5 py-1 rounded-lg shrink-0">
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
          <div className="absolute -top-1 left-2 right-2 h-full bg-[#f8bbd9]/40 rounded-3xl" />
          <div className="relative bg-white rounded-3xl p-4 shadow-xl shadow-[#f8bbd9]/20 border border-[#f8bbd9]/30">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-[#f8bbd9] rounded-xl flex items-center justify-center">
                <ChefHat className="w-4 h-4 text-[#ad1457]" />
              </div>
              <h2 className="text-base font-semibold text-[#6b5b4f]">조리 순서</h2>
              <span className="text-xs text-[#8b7b7b] ml-auto">{data.steps.length}단계</span>
            </div>

            {/* Steps list */}
            <div className="relative">
              {/* Connecting line */}
              <div className="absolute left-4 top-6 bottom-6 w-0.5 bg-gradient-to-b from-[#f8bbd9] via-[#e8a4b8] to-[#f8bbd9]" />

              <div className="space-y-4">
                {data.steps.map((step, index) => (
                  <div key={step.stepNo} className="flex gap-4 relative">
                    {/* Step number badge */}
                    <div className="relative z-10 w-8 h-8 bg-gradient-to-br from-[#f8bbd9] to-[#e8a4b8] rounded-full flex items-center justify-center shadow-md flex-shrink-0">
                      <span className="text-sm font-bold text-white">{step.stepNo}</span>
                    </div>

                    {/* Step content */}
                    <div className={cn(
                      'flex-1 p-3 rounded-2xl',
                      index % 2 === 0 ? 'bg-[#fef7f9]' : 'bg-[#fce4ec]/30',
                    )}>
                      <p className="font-body text-sm text-[#4a4a4a] leading-relaxed">{step.text}</p>
                      {step.note && (
                        <p className="font-body mt-2 text-xs text-[#8b7b7b]">{step.note}</p>
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
              <div className="absolute -top-0.5 left-1 right-1 h-full bg-[#a5d6a7]/30 rounded-2xl" />
              <div className="relative bg-[#e8f5e9] rounded-2xl p-4 shadow-lg shadow-[#c8e6c9]/20 border border-[#c8e6c9]/50">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 bg-[#c8e6c9] rounded-xl flex items-center justify-center">
                    <Lightbulb className="w-4 h-4 text-[#2e5f30]" />
                  </div>
                  <h2 className="text-sm font-semibold text-[#2e5f30]">요리 팁</h2>
                </div>
                <div className="space-y-2">
                  {data.tips.map((tip, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="w-5 h-5 bg-[#c8e6c9] rounded-lg flex items-center justify-center text-xs text-[#2e5f30] flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <p className="text-sm text-[#4a4a4a] leading-relaxed">{tip}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Warnings Card */}
          {data.warnings.length > 0 && (
            <div className="relative">
              <div className="absolute -top-0.5 left-1 right-1 h-full bg-[#ffcc80]/30 rounded-2xl" />
              <div className="relative bg-[#fff8e1] rounded-2xl p-4 shadow-lg shadow-[#ffe0b2]/20 border border-[#ffe0b2]/50">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 bg-[#ffe0b2] rounded-xl flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-[#e65100]" />
                  </div>
                  <h2 className="text-sm font-semibold text-[#e65100]">주의사항</h2>
                </div>
                <div className="space-y-2">
                  {data.warnings.map((warning, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <SeverityIcon severity={warning.severity} />
                      <div>
                        <p className="font-body text-sm font-medium text-[#4a4a4a]">{warning.message}</p>
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
        <div className="absolute -top-0.5 left-1 right-1 h-full bg-[#e1bee7]/30 rounded-2xl" />
        <div className="relative bg-white rounded-2xl p-4 shadow-lg shadow-[#e1bee7]/20 border border-[#e1bee7]/30">
          <div className="grid grid-cols-3 gap-3">
            {/* Edit button */}
            <button
              onClick={() => setIsEditing(true)}
              className="flex flex-col items-center gap-2 p-3 bg-[#fef7f9] rounded-2xl hover:bg-[#fce4ec] transition-colors group cursor-pointer"
            >
              <div className="w-10 h-10 bg-[#f8bbd9] rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                <Edit3 className="w-5 h-5 text-[#ad1457]" />
              </div>
              <span className="text-xs font-medium text-[#6b5b4f]">수정하기</span>
            </button>

            {/* Copy link button */}
            <button
              onClick={handleCopy}
              className="flex flex-col items-center gap-2 p-3 bg-[#fef7f9] rounded-2xl hover:bg-[#fce4ec] transition-colors group cursor-pointer"
            >
              <div className="w-10 h-10 bg-[#c8e6c9] rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                <Link2 className="w-5 h-5 text-[#2e5f30]" />
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
                className="flex flex-col items-center gap-2 p-3 bg-[#fef7f9] rounded-2xl hover:bg-[#fce4ec] transition-colors group cursor-pointer"
              >
                <div className="w-10 h-10 bg-[#ffcdd2] rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                  <ExternalLink className="w-5 h-5 text-[#c62828]" />
                </div>
                <span className="text-xs font-medium text-[#6b5b4f]">원본 영상</span>
              </a>
            ) : (
              <Link
                href="/"
                className="flex flex-col items-center gap-2 p-3 bg-[#fef7f9] rounded-2xl hover:bg-[#fce4ec] transition-colors group cursor-pointer"
              >
                <div className="w-10 h-10 bg-[#ffcdd2] rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                  <ExternalLink className="w-5 h-5 text-[#c62828]" />
                </div>
                <span className="text-xs font-medium text-[#6b5b4f]">새 추출</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
