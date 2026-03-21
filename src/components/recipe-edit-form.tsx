'use client';

import { useState } from 'react';
import { LoaderCircle, Plus, Trash2 } from 'lucide-react';

import type {
  RecipeConfidence,
  RecipeIngredient,
  RecipeStep,
  RecipeWarning,
} from '@/lib/extraction/types';
import { updateRecipe } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface RecipeEditFormProps {
  recipeId: string;
  initialData: {
    title: string;
    baseServings: number | null;
    ingredients: RecipeIngredient[];
    steps: RecipeStep[];
    tips: string[];
    warnings: RecipeWarning[];
    confidence: RecipeConfidence;
  };
  onSaved: () => void;
  onCancel: () => void;
}

export function RecipeEditForm({
  recipeId,
  initialData,
  onSaved,
  onCancel,
}: RecipeEditFormProps) {
  const [title, setTitle] = useState(initialData.title);
  const [baseServings, setBaseServings] = useState<string>(
    initialData.baseServings?.toString() ?? '',
  );
  const [ingredients, setIngredients] = useState(initialData.ingredients);
  const [steps, setSteps] = useState(initialData.steps);
  const [tips, setTips] = useState(initialData.tips);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  function updateIngredient(index: number, patch: Partial<RecipeIngredient>) {
    setIngredients((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  }

  function removeIngredient(index: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  }

  function addIngredient() {
    setIngredients((prev) => [
      ...prev,
      {
        name: '',
        amount: null,
        amountText: null,
        unit: null,
        scalable: true,
        note: null,
        confidence: 'medium' as RecipeConfidence,
      },
    ]);
  }

  function updateStep(index: number, text: string) {
    setSteps((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, text } : item,
      ),
    );
  }

  function removeStep(index: number) {
    setSteps((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((item, i) => ({ ...item, stepNo: i + 1 })),
    );
  }

  function addStep() {
    setSteps((prev) => [
      ...prev,
      {
        stepNo: prev.length + 1,
        text: '',
        note: null,
        confidence: 'medium' as RecipeConfidence,
      },
    ]);
  }

  function updateTip(index: number, value: string) {
    setTips((prev) => prev.map((item, i) => (i === index ? value : item)));
  }

  function removeTip(index: number) {
    setTips((prev) => prev.filter((_, i) => i !== index));
  }

  function addTip() {
    setTips((prev) => [...prev, '']);
  }

  function hasChanges() {
    return (
      title !== initialData.title ||
      baseServings !== (initialData.baseServings?.toString() ?? '') ||
      JSON.stringify(ingredients) !== JSON.stringify(initialData.ingredients) ||
      JSON.stringify(steps) !== JSON.stringify(initialData.steps) ||
      JSON.stringify(tips) !== JSON.stringify(initialData.tips)
    );
  }

  function handleCancel() {
    if (hasChanges()) {
      setConfirmOpen(true);
      return;
    }
    onCancel();
  }

  async function handleSave() {
    setError(null);
    setIsSaving(true);

    try {
      const servingsNum = baseServings ? Number(baseServings) : null;
      await updateRecipe(recipeId, {
        title,
        baseServings: servingsNum,
        ingredients,
        steps: steps.map((s, i) => ({ ...s, stepNo: i + 1 })),
        tips: tips.filter(Boolean),
        warnings: initialData.warnings,
        confidence: initialData.confidence,
      });
      onSaved();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="edit-title">레시피 제목</Label>
        <Input
          id="edit-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-lg font-semibold"
        />
      </div>

      {/* Base servings */}
      <div className="space-y-2">
        <Label htmlFor="edit-servings">기본 인분 수</Label>
        <Input
          id="edit-servings"
          type="number"
          min="1"
          max="20"
          value={baseServings}
          onChange={(e) => setBaseServings(e.target.value)}
          placeholder="인분 수를 입력하세요"
          className="w-32"
        />
      </div>

      {/* Ingredients */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>재료</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={addIngredient}
          >
            <Plus className="size-3.5" />
            재료 추가
          </Button>
        </div>
        <div className="space-y-2">
          {ingredients.map((ingredient, index) => (
            <div
              key={index}
              className="flex items-start gap-2 rounded-xl border bg-card p-3"
            >
              <div className="grid flex-1 gap-2 sm:grid-cols-4">
                <Input
                  placeholder="재료명"
                  value={ingredient.name}
                  onChange={(e) =>
                    updateIngredient(index, { name: e.target.value })
                  }
                  className="sm:col-span-2"
                />
                <Input
                  placeholder="수량"
                  type="number"
                  step="any"
                  value={ingredient.amount?.toString() ?? ''}
                  onChange={(e) =>
                    updateIngredient(index, {
                      amount: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                />
                <Input
                  placeholder="단위"
                  value={ingredient.unit ?? ''}
                  onChange={(e) =>
                    updateIngredient(index, {
                      unit: e.target.value || null,
                    })
                  }
                />
                <Input
                  placeholder="메모"
                  value={ingredient.note ?? ''}
                  onChange={(e) =>
                    updateIngredient(index, {
                      note: e.target.value || null,
                    })
                  }
                  className="sm:col-span-4"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeIngredient(index)}
                className="mt-0.5 shrink-0 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>조리 단계</Label>
          <Button type="button" variant="ghost" size="sm" onClick={addStep}>
            <Plus className="size-3.5" />
            단계 추가
          </Button>
        </div>
        <div className="space-y-2">
          {steps.map((step, index) => (
            <div key={index} className="flex items-start gap-2">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                {index + 1}
              </div>
              <Textarea
                placeholder={`${index + 1}단계 내용`}
                value={step.text}
                onChange={(e) => updateStep(index, e.target.value)}
                rows={2}
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeStep(index)}
                className="mt-0.5 shrink-0 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Tips */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>팁</Label>
          <Button type="button" variant="ghost" size="sm" onClick={addTip}>
            <Plus className="size-3.5" />
            팁 추가
          </Button>
        </div>
        <div className="space-y-2">
          {tips.map((tip, index) => (
            <div key={index} className="flex items-start gap-2">
              <Input
                placeholder="팁 내용"
                value={tip}
                onChange={(e) => updateTip(index, e.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeTip(index)}
                className="shrink-0 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-end gap-3 border-t pt-5">
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          disabled={isSaving}
        >
          취소
        </Button>
        <Button type="button" onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <LoaderCircle className="size-4 animate-spin" />
              저장 중...
            </>
          ) : (
            '저장하기'
          )}
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>수정 내용을 버리시겠습니까?</DialogTitle>
            <DialogDescription>
              저장하지 않은 변경 사항이 사라집니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
            >
              계속 수정하기
            </Button>
            <Button
              type="button"
              onClick={() => {
                setConfirmOpen(false);
                onCancel();
              }}
            >
              변경 사항 버리기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
