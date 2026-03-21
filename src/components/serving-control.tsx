'use client';

import { Info, Minus, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function ServingControl({
  baseServings,
  targetServings,
  onChange,
}: {
  baseServings: number | null;
  targetServings: number;
  onChange: (value: number) => void;
}) {
  const disabled = baseServings === null;

  if (disabled) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-accent/60 px-4 py-2.5 text-sm text-muted-foreground">
        <Info className="size-4 shrink-0" />
        영상에 인분 정보가 명시되어 있지 않아 인분 조절을 사용할 수 없어요.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <span className="text-sm text-muted-foreground">
        기본 {baseServings}인분
      </span>
      <div className="flex items-center gap-0.5 rounded-xl border bg-card p-1 shadow-sm">
        <Button
          disabled={targetServings <= 1}
          onClick={() => onChange(Math.max(1, targetServings - 1))}
          size="icon"
          type="button"
          variant="ghost"
          className="size-9 rounded-lg"
        >
          <Minus className="size-4" />
        </Button>
        <span
          className={cn(
            'min-w-16 text-center text-sm font-semibold tabular-nums',
            targetServings !== baseServings && 'text-primary',
          )}
        >
          {targetServings}인분
        </span>
        <Button
          disabled={targetServings >= 8}
          onClick={() => onChange(Math.min(8, targetServings + 1))}
          size="icon"
          type="button"
          variant="ghost"
          className="size-9 rounded-lg"
        >
          <Plus className="size-4" />
        </Button>
      </div>
    </div>
  );
}
