'use client';

import { Info, Minus, Plus, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';

const MIN_SERVINGS = 1;
const MAX_SERVINGS = 20;

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
      <div className="relative">
        <div className="absolute -top-0.5 right-1 left-1 h-full rounded-2xl bg-[#ffe0b2]/40" />
        <div className="relative rounded-2xl border border-[#ffe0b2]/30 bg-[#fff8e1] p-4 shadow-lg shadow-[#ffe0b2]/20">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#ffe0b2]">
              <Info className="h-4 w-4 text-[#e65100]" />
            </div>
            <span className="font-body text-sm text-[#6b5b4f]">
              영상에 인분 정보가 명시되지 않아 인분 조절을 사용할 수 없어요
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Decorative background */}
      <div className="absolute -top-0.5 right-1 left-1 h-full rounded-2xl bg-[#ffe0b2]/40" />

      <div className="relative rounded-2xl border border-[#ffe0b2]/30 bg-white p-4 shadow-lg shadow-[#ffe0b2]/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#ffe0b2]">
              <Users className="h-4 w-4 text-[#e65100]" />
            </div>
            <span className="text-sm font-medium text-[#6b5b4f]">
              인분 조절
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Button
              disabled={targetServings <= MIN_SERVINGS}
              onClick={() =>
                onChange(Math.max(MIN_SERVINGS, targetServings - 1))
              }
              size="icon"
              type="button"
              variant="ghost"
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[#f8bbd9]/30 bg-[#fef7f9] shadow-sm transition-colors hover:bg-[#fce4ec] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Minus className="h-4 w-4 text-[#e8a4b8]" />
            </Button>

            <div className="flex h-12 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f8bbd9] to-[#e8a4b8] shadow-md">
              <span className="text-xl font-bold text-white">
                {targetServings}
              </span>
            </div>

            <Button
              disabled={targetServings >= MAX_SERVINGS}
              onClick={() =>
                onChange(Math.min(MAX_SERVINGS, targetServings + 1))
              }
              size="icon"
              type="button"
              variant="ghost"
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[#f8bbd9]/30 bg-[#fef7f9] shadow-sm transition-colors hover:bg-[#fce4ec] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="h-4 w-4 text-[#e8a4b8]" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
