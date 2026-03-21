'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import {
  AlertTriangle,
  Check,
  Copy,
  ExternalLink,
  Info,
  Lightbulb,
} from 'lucide-react';

import { getRecipe } from '@/lib/api/client';
import { scaleIngredient } from '@/lib/recipe/scaling';
import type { RecipeConfidence, WarningSeverity } from '@/lib/extraction/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ErrorDisplay } from '@/components/error-display';
import { RecipeEditForm } from '@/components/recipe-edit-form';
import { ServingControl } from '@/components/serving-control';

function ConfidenceBadge({ confidence }: { confidence: RecipeConfidence }) {
  if (confidence === 'high') return null;
  return (
    <Badge
      variant={confidence === 'low' ? 'destructive' : 'secondary'}
      className="text-[10px]"
    >
      {confidence === 'low' ? '확인 필요' : '추정'}
    </Badge>
  );
}

function SeverityIcon({ severity }: { severity: WarningSeverity }) {
  if (severity === 'error') return <AlertTriangle className="size-4 shrink-0 text-destructive" />;
  if (severity === 'warning') return <AlertTriangle className="size-4 shrink-0 text-amber-500" />;
  return <Info className="size-4 shrink-0 text-blue-500" />;
}

export function RecipeView({ recipeId }: { recipeId: string }) {
  const { data, error, isLoading, mutate } = useSWR(
    ['recipe', recipeId],
    () => getRecipe(recipeId),
  );
  const [targetServings, setTargetServings] = useState(2);
  const [copied, setCopied] = useState(false);
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
      <div className="space-y-6">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-6 w-1/3" />
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
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
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="print-full space-y-6">
      {isEditing ? (
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
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
      ) : (
        <>
      {/* Title section */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {data.title}
            </h1>
            {data.summary ? (
              <p className="max-w-2xl text-sm text-muted-foreground">
                {data.summary}
              </p>
            ) : null}
          </div>
          <div className="no-print flex flex-wrap gap-2">
            <Button
              onClick={handleCopy}
              size="sm"
              type="button"
              variant="outline"
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? '복사됨' : '링크 복사'}
            </Button>
            {data.youtubeUrl ? (
              <Button
                nativeButton={false}
                render={
                  <a href={data.youtubeUrl} rel="noreferrer" target="_blank" />
                }
                size="sm"
                variant="outline"
              >
                <ExternalLink className="size-3.5" />
                원본 영상
              </Button>
            ) : null}
          </div>
        </div>

        <ServingControl
          baseServings={data.baseServings}
          onChange={setTargetServings}
          targetServings={targetServings}
        />
      </div>

      {/* Main content: 2 columns on desktop */}
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        {/* Ingredients */}
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">재료</h2>
          <ul className="space-y-0">
            {scaledIngredients.map((ingredient, index) => (
              <li
                key={`${ingredient.name}-${index}`}
                className={cn(
                  'flex items-center justify-between gap-3 border-b py-3 last:border-b-0',
                  ingredient.confidence === 'low' && 'opacity-60',
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{ingredient.name}</span>
                  {ingredient.note && (
                    <span className="text-xs text-muted-foreground">
                      ({ingredient.note})
                    </span>
                  )}
                  <ConfidenceBadge confidence={ingredient.confidence} />
                  {!ingredient.scalable && ingredient.amount !== null && (
                    <span className="text-[10px] text-muted-foreground">고정</span>
                  )}
                </div>
                <span
                  className="shrink-0 text-right text-sm font-medium tabular-nums"
                  title={ingredient.amountText ?? undefined}
                >
                  {ingredient.scaled.displayAmount ?? '적당량'}{' '}
                  <span className="text-muted-foreground">
                    {ingredient.scaled.displayUnit ?? ''}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Steps */}
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">조리 단계</h2>
          <ol className="space-y-5">
            {data.steps.map((step) => (
              <li key={step.stepNo} className="flex gap-3.5">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {step.stepNo}
                </div>
                <div className="space-y-1 pt-0.5">
                  <p className="text-sm leading-relaxed">{step.text}</p>
                  {step.note && (
                    <p className="text-xs text-muted-foreground">{step.note}</p>
                  )}
                  <ConfidenceBadge confidence={step.confidence} />
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Tips + Warnings */}
      {(data.tips.length > 0 || data.warnings.length > 0) && (
        <div className="grid gap-6 lg:grid-cols-2">
          {data.tips.length > 0 && (
            <div className="rounded-2xl border bg-accent/40 p-5">
              <div className="mb-3 flex items-center gap-2">
                <Lightbulb className="size-4 text-primary" />
                <h2 className="text-sm font-semibold">팁</h2>
              </div>
              <ul className="space-y-2">
                {data.tips.map((tip, i) => (
                  <li key={i} className="text-sm leading-relaxed text-foreground/80">
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.warnings.length > 0 && (
            <div className="rounded-2xl border bg-card p-5">
              <h2 className="mb-3 text-sm font-semibold">주의사항</h2>
              <div className="space-y-3">
                {data.warnings.map((warning, i) => (
                  <div key={i} className="flex gap-2.5">
                    <SeverityIcon severity={warning.severity} />
                    <div>
                      <p className="text-sm">{warning.message}</p>
                      <p className="text-[10px] text-muted-foreground">{warning.code}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 pt-2">
        <Button variant="outline" nativeButton={false} render={<Link href="/" />}>
          다른 영상 추출하기
        </Button>
        <Button onClick={() => setIsEditing(true)} variant="secondary">
          수정하기
        </Button>
      </div>
        </>
      )}
    </div>
  );
}
