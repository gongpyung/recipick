'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardPaste, LoaderCircle, Sparkles, Youtube } from 'lucide-react';

import { createExtraction } from '@/lib/api/client';
import { parseYouTubeUrl } from '@/lib/youtube/url-parser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function UrlInputForm() {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clipboardValue, setClipboardValue] = useState<string | null>(null);

  const helperText = '요리 영상, 먹방, 레시피 영상 모두 OK!';

  async function handleClipboardSuggestion() {
    if (!navigator.clipboard || !window.isSecureContext) return;
    try {
      const text = await navigator.clipboard.readText();
      if (parseYouTubeUrl(text).isValid && text !== value) {
        setClipboardValue(text);
      }
    } catch {
      /* clipboard not available */
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const parseResult = parseYouTubeUrl(value);
    if (!parseResult.isValid) {
      setError(parseResult.error ?? '유효한 YouTube URL을 입력해 주세요.');
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await createExtraction(value);
      router.push(`/extractions/${result.extractionId}`);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : '추출 요청 중 오류가 발생했습니다.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative">
      {/* Decorative layered cards behind */}
      <div className="absolute -top-2 right-2 left-2 h-full rotate-1 transform rounded-3xl bg-[#ffe0b2]/60" />
      <div className="absolute -top-1 right-1 left-1 h-full -rotate-1 transform rounded-3xl bg-[#c8e6c9]/60" />

      {/* Main card */}
      <div className="relative rounded-3xl border border-[#f8bbd9]/30 bg-white p-5 shadow-xl shadow-[#f8bbd9]/20">
        {/* Card title */}
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#ffcdd2]">
            <Youtube className="h-4 w-4 text-[#e53935]" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#4a4a4a]">
              영상에서 레시피 추출
            </h2>
            <p className="text-xs text-[#8b7b7b]">
              YouTube 링크를 붙여넣으세요
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <Input
              type="url"
              placeholder="https://youtube.com/watch?v=..."
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                if (error) setError(null);
              }}
              onFocus={handleClipboardSuggestion}
              autoComplete="off"
              inputMode="url"
              className="h-12 w-full rounded-2xl border border-[#f8bbd9]/50 bg-[#fef7f9] px-4 py-3 text-sm text-[#4a4a4a] transition-all placeholder:text-[#c8b8b8] focus:border-transparent focus:ring-2 focus:ring-[#e8a4b8]/50 focus:outline-none"
            />
          </div>

          {/* Extract button */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border-0 bg-gradient-to-r from-[#f8bbd9] to-[#e8a4b8] py-3.5 font-medium text-white shadow-lg shadow-[#f8bbd9]/30 transition-all hover:shadow-xl hover:shadow-[#f8bbd9]/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <LoaderCircle className="size-4 animate-spin" />
                <span>레시피 추출 중...</span>
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                <span>레시피 픽하기</span>
              </>
            )}
          </Button>

          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <p className="font-body text-xs text-[#8b7b7b]">{helperText}</p>
            {clipboardValue ? (
              <button
                className="font-body inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-[#e8a4b8] transition-colors hover:text-[#ad1457]"
                type="button"
                onClick={() => {
                  setValue(clipboardValue);
                  setClipboardValue(null);
                }}
              >
                <ClipboardPaste className="size-3" />
                클립보드에서 붙여넣기
              </button>
            ) : null}
          </div>

          {error ? (
            <div className="font-body rounded-xl bg-[#ffcdd2]/30 px-4 py-3 text-sm font-medium text-[#c62828]">
              {error}
            </div>
          ) : null}
        </form>
      </div>
    </div>
  );
}
