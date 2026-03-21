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
        <div className="absolute -top-0.5 left-1 right-1 h-full bg-[#ffe0b2]/40 rounded-2xl" />
        <div className="relative bg-[#fff8e1] rounded-2xl p-4 shadow-lg shadow-[#ffe0b2]/20 border border-[#ffe0b2]/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#ffe0b2] rounded-xl flex items-center justify-center">
              <Info className="w-4 h-4 text-[#e65100]" />
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
      <div className="absolute -top-0.5 left-1 right-1 h-full bg-[#ffe0b2]/40 rounded-2xl" />

      <div className="relative bg-white rounded-2xl p-4 shadow-lg shadow-[#ffe0b2]/20 border border-[#ffe0b2]/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#ffe0b2] rounded-xl flex items-center justify-center">
              <Users className="w-4 h-4 text-[#e65100]" />
            </div>
            <span className="text-sm font-medium text-[#6b5b4f]">인분 조절</span>
          </div>

          <div className="flex items-center gap-3">
            <Button
              disabled={targetServings <= MIN_SERVINGS}
              onClick={() => onChange(Math.max(MIN_SERVINGS, targetServings - 1))}
              size="icon"
              type="button"
              variant="ghost"
              className="w-10 h-10 bg-[#fef7f9] rounded-full flex items-center justify-center hover:bg-[#fce4ec] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm border border-[#f8bbd9]/30 cursor-pointer"
            >
              <Minus className="w-4 h-4 text-[#e8a4b8]" />
            </Button>

            <div className="w-14 h-12 bg-gradient-to-br from-[#f8bbd9] to-[#e8a4b8] rounded-2xl flex items-center justify-center shadow-md">
              <span className="text-xl font-bold text-white">{targetServings}</span>
            </div>

            <Button
              disabled={targetServings >= MAX_SERVINGS}
              onClick={() => onChange(Math.min(MAX_SERVINGS, targetServings + 1))}
              size="icon"
              type="button"
              variant="ghost"
              className="w-10 h-10 bg-[#fef7f9] rounded-full flex items-center justify-center hover:bg-[#fce4ec] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm border border-[#f8bbd9]/30 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#e8a4b8]" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
