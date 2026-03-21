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
      <div className="absolute -top-2 left-2 right-2 h-full bg-[#ffe0b2]/60 rounded-3xl transform rotate-1" />
      <div className="absolute -top-1 left-1 right-1 h-full bg-[#c8e6c9]/60 rounded-3xl transform -rotate-1" />

      {/* Main card */}
      <div className="relative bg-white rounded-3xl p-5 shadow-xl shadow-[#f8bbd9]/20 border border-[#f8bbd9]/30">
        {/* Card title */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-[#ffcdd2] rounded-xl flex items-center justify-center">
            <Youtube className="w-4 h-4 text-[#e53935]" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#4a4a4a]">영상에서 레시피 추출</h2>
            <p className="text-xs text-[#8b7b7b]">YouTube 링크를 붙여넣으세요</p>
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
              className="w-full px-4 py-3 bg-[#fef7f9] border border-[#f8bbd9]/50 rounded-2xl text-sm text-[#4a4a4a] placeholder:text-[#c8b8b8] focus:outline-none focus:ring-2 focus:ring-[#e8a4b8]/50 focus:border-transparent transition-all h-12"
            />
          </div>

          {/* Extract button */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 h-12 bg-gradient-to-r from-[#f8bbd9] to-[#e8a4b8] text-white font-medium rounded-2xl shadow-lg shadow-[#f8bbd9]/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl hover:shadow-[#f8bbd9]/40 transition-all active:scale-[0.98] border-0 cursor-pointer"
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
                className="font-body inline-flex items-center gap-1.5 text-xs font-semibold text-[#e8a4b8] transition-colors hover:text-[#ad1457] cursor-pointer"
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
