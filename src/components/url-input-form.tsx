'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardPaste, LoaderCircle, Utensils } from 'lucide-react';

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

  const helperText = useMemo(
    () => 'youtube.com · youtu.be · YouTube Shorts 링크를 지원합니다',
    [],
  );

  async function handleClipboardSuggestion() {
    if (!navigator.clipboard || !window.isSecureContext) {
      return;
    }

    try {
      const text = await navigator.clipboard.readText();
      if (parseYouTubeUrl(text).isValid && text !== value) {
        setClipboardValue(text);
      }
    } catch {
      // clipboard read not available
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
    <div className="rounded-2xl border bg-card p-6 shadow-sm md:p-8">
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2.5">
          <label
            className="text-sm font-medium text-foreground"
            htmlFor="youtube-url"
          >
            YouTube 링크
          </label>
          <div className="relative">
            <Input
              id="youtube-url"
              type="url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                if (error) setError(null);
              }}
              onFocus={handleClipboardSuggestion}
              autoComplete="off"
              inputMode="url"
              className="h-12 text-base pr-4 pl-4"
            />
          </div>
          <p className="text-xs text-muted-foreground">{helperText}</p>
        </div>

        {clipboardValue ? (
          <button
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm text-accent-foreground transition-colors hover:bg-accent/80"
            type="button"
            onClick={() => {
              setValue(clipboardValue);
              setClipboardValue(null);
            }}
          >
            <ClipboardPaste className="size-4 text-primary" />
            클립보드의 YouTube 링크 붙여넣기
          </button>
        ) : null}

        {error ? (
          <div className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <Button
          className="h-12 w-full text-base font-semibold"
          disabled={isSubmitting}
          type="submit"
          size="lg"
        >
          {isSubmitting ? (
            <>
              <LoaderCircle className="size-5 animate-spin" />
              추출 중...
            </>
          ) : (
            <>
              <Utensils className="size-5" />
              레시피 추출하기
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
