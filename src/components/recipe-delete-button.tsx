'use client';

import { useState } from 'react';
import { LoaderCircle, Trash2 } from 'lucide-react';
import { mutate } from 'swr';

import type { RecentRecipeListItem } from '@/lib/recipe/service';
import { deleteRecipe } from '@/lib/api/client';
import {
  HOME_RECIPES_CACHE_KEY,
  HISTORY_RECIPES_CACHE_KEY,
  recipeDetailCacheKey,
} from '@/lib/api/cache-keys';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type RecentRecipeResponse = { items: RecentRecipeListItem[] };

type RecipeDeleteButtonProps = {
  recipeId: string;
  recipeTitle: string;
  onDeleted?: () => void | Promise<void>;
  mode?: 'icon' | 'card';
};

function removeRecipeFromCache(
  current: RecentRecipeResponse | undefined,
  recipeId: string,
): RecentRecipeResponse | undefined {
  if (!current) {
    return current;
  }

  return {
    ...current,
    items: current.items.filter((item) => item.id !== recipeId),
  };
}

export function RecipeDeleteButton({
  recipeId,
  recipeTitle,
  onDeleted,
  mode = 'icon',
}: RecipeDeleteButtonProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setError(null);
    setIsDeleting(true);

    try {
      await deleteRecipe(recipeId);

      await Promise.all([
        mutate<RecentRecipeResponse>(
          HOME_RECIPES_CACHE_KEY,
          (current) => removeRecipeFromCache(current, recipeId),
          { revalidate: false },
        ),
        mutate<RecentRecipeResponse>(
          HISTORY_RECIPES_CACHE_KEY,
          (current) => removeRecipeFromCache(current, recipeId),
          { revalidate: false },
        ),
        mutate(recipeDetailCacheKey(recipeId), undefined, {
          revalidate: false,
        }),
      ]);

      setConfirmOpen(false);
      await onDeleted?.();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : '삭제 중 오류가 발생했습니다.',
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      {mode === 'icon' ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => {
            setError(null);
            setConfirmOpen(true);
          }}
          aria-label={`${recipeTitle} 삭제하기`}
          className="cursor-pointer rounded-full bg-[#ffcdd2]/90 text-[#e53935] shadow-md transition-colors hover:bg-[#ef9a9a] hover:text-white"
        >
          <Trash2 className="size-4" />
        </Button>
      ) : (
        <button
          type="button"
          onClick={() => {
            setError(null);
            setConfirmOpen(true);
          }}
          className="group flex cursor-pointer flex-col items-center gap-2 rounded-2xl bg-[#fff1f2] p-3 transition-colors hover:bg-[#ffe4e6]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ffcdd2] transition-transform group-hover:scale-105">
            <Trash2 className="h-5 w-5 text-[#c62828]" />
          </div>
          <span className="text-xs font-medium text-[#6b5b4f]">삭제하기</span>
        </button>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>레시피를 삭제할까요?</DialogTitle>
            <DialogDescription>
              <span className="font-medium text-[#4a4a4a]">{recipeTitle}</span>{' '}
              레시피가 목록과 상세 화면에서 사라집니다. 이 작업은 되돌릴 수
              없습니다.
            </DialogDescription>
          </DialogHeader>

          {error ? (
            <div className="rounded-xl bg-[#ffcdd2]/30 px-4 py-3 text-sm font-medium text-[#c62828]">
              {error}
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={isDeleting}
              className="border-[#f8bbd9] text-[#6b5b4f] hover:bg-[#fef7f9]"
            >
              취소
            </Button>
            <Button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="border-0 bg-[#e53935] text-white hover:bg-[#c62828]"
            >
              {isDeleting ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" />
                  삭제 중...
                </>
              ) : (
                <>
                  <Trash2 className="size-4" />
                  삭제하기
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
