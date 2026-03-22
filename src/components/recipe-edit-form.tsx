'use client';

import { useRef, useState } from 'react';
import {
  ChefHat,
  Lightbulb,
  LoaderCircle,
  Plus,
  Save,
  ShoppingBasket,
  Trash2,
  X,
} from 'lucide-react';

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

type EditableIngredient = RecipeIngredient & { _editId: number };
type EditableStep = RecipeStep & { _editId: number };
type EditableTip = { _editId: number; value: string };

export function RecipeEditForm({
  recipeId,
  initialData,
  onSaved,
  onCancel,
}: RecipeEditFormProps) {
  const nextIdRef = useRef(0);
  const [title, setTitle] = useState(initialData.title);
  const [baseServings, setBaseServings] = useState<string>(
    initialData.baseServings?.toString() ?? '',
  );
  const [ingredients, setIngredients] = useState<EditableIngredient[]>(() =>
    initialData.ingredients.map((item) => ({ ...item, _editId: getNextId() })),
  );
  const [steps, setSteps] = useState<EditableStep[]>(() =>
    initialData.steps.map((item) => ({ ...item, _editId: getNextId() })),
  );
  const [tips, setTips] = useState<EditableTip[]>(() =>
    initialData.tips.map((value) => ({ _editId: getNextId(), value })),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  function getNextId() {
    nextIdRef.current += 1;
    return nextIdRef.current;
  }

  function serializeIngredients(items: EditableIngredient[]) {
    return items.map((item) => ({
      name: item.name,
      amount: item.amount,
      amountText: item.amountText,
      unit: item.unit,
      scalable: item.scalable,
      note: item.note,
      confidence: item.confidence,
    }));
  }

  function serializeSteps(items: EditableStep[]) {
    return items.map((item, index) => ({
      stepNo: index + 1,
      text: item.text,
      note: item.note,
      confidence: item.confidence,
    }));
  }

  function serializeTips(items: EditableTip[]) {
    return items.map(({ value }) => value);
  }

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
        _editId: getNextId(),
      },
    ]);
  }

  function updateStep(index: number, text: string) {
    setSteps((prev) =>
      prev.map((item, i) => (i === index ? { ...item, text } : item)),
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
        _editId: getNextId(),
      },
    ]);
  }

  function updateTip(index: number, value: string) {
    setTips((prev) =>
      prev.map((item, i) => (i === index ? { ...item, value } : item)),
    );
  }

  function removeTip(index: number) {
    setTips((prev) => prev.filter((_, i) => i !== index));
  }

  function addTip() {
    setTips((prev) => [...prev, { _editId: getNextId(), value: '' }]);
  }

  function hasChanges() {
    return (
      title !== initialData.title ||
      baseServings !== (initialData.baseServings?.toString() ?? '') ||
      JSON.stringify(serializeIngredients(ingredients)) !==
        JSON.stringify(initialData.ingredients) ||
      JSON.stringify(serializeSteps(steps)) !==
        JSON.stringify(initialData.steps) ||
      JSON.stringify(serializeTips(tips)) !== JSON.stringify(initialData.tips)
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

    if (baseServings) {
      const n = Number(baseServings);
      if (Number.isNaN(n) || n <= 0) {
        setError('인분 수는 0보다 커야 합니다.');
        return;
      }
    }

    setIsSaving(true);
    try {
      const servingsNum = baseServings ? Number(baseServings) : null;
      await updateRecipe(recipeId, {
        title,
        baseServings: servingsNum,
        ingredients: serializeIngredients(ingredients),
        steps: serializeSteps(steps),
        tips: serializeTips(tips).filter(Boolean),
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
    <div className="space-y-6">
      {/* Title */}
      <div className="mb-5">
        <Label
          htmlFor="edit-title"
          className="mb-1.5 block text-xs text-[#8b7b7b]"
        >
          레시피 제목
        </Label>
        <Input
          id="edit-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-2xl border-2 border-transparent bg-[#fef7f9] px-4 py-3 text-xl font-semibold text-[#4a4a4a] transition-colors focus:border-[#f8bbd9] focus:outline-none"
          placeholder="레시피 제목을 입력하세요"
        />
      </div>

      {/* Servings */}
      <div className="mb-5">
        <Label
          htmlFor="edit-servings"
          className="mb-1.5 block text-xs text-[#8b7b7b]"
        >
          기본 인분
        </Label>
        <div className="flex items-center gap-2">
          <Input
            id="edit-servings"
            type="number"
            min="1"
            max="20"
            value={baseServings}
            onChange={(e) => setBaseServings(e.target.value)}
            placeholder="인분 수"
            className="w-20 rounded-2xl border-2 border-transparent bg-[#fef7f9] px-3 py-2 text-center text-lg font-medium text-[#4a4a4a] transition-colors focus:border-[#f8bbd9] focus:outline-none"
          />
          <span className="text-sm text-[#8b7b7b]">인분</span>
        </div>
      </div>

      {/* Ingredients section */}
      <div className="relative">
        <div className="absolute -top-1 right-2 left-2 h-full rounded-3xl bg-[#c8e6c9]/40" />
        <div className="relative rounded-3xl border border-[#c8e6c9]/30 bg-white p-4 shadow-xl shadow-[#c8e6c9]/20">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#c8e6c9]">
              <ShoppingBasket className="h-4 w-4 text-[#2e5f30]" />
            </div>
            <h3 className="text-base font-semibold text-[#6b5b4f]">재료</h3>
            <span className="ml-auto text-xs text-[#8b7b7b]">
              {ingredients.length}가지
            </span>
          </div>

          <div className="space-y-2">
            {ingredients.map((ingredient, index) => (
              <div
                key={ingredient._editId}
                className={`rounded-2xl p-3 ${index % 2 === 0 ? 'bg-[#fef7f9]' : 'border border-[#f8bbd9]/20 bg-white'}`}
              >
                <div className="flex items-start gap-2">
                  <span className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-[#f8bbd9]/50 text-xs text-[#e8a4b8]">
                    {index + 1}
                  </span>
                  <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
                    <Input
                      placeholder="재료명"
                      value={ingredient.name}
                      onChange={(e) =>
                        updateIngredient(index, { name: e.target.value })
                      }
                      className="col-span-2 rounded-xl border border-[#f8bbd9]/30 bg-white px-3 py-2 text-sm text-[#4a4a4a] focus:border-[#f8bbd9] focus:outline-none sm:col-span-1"
                    />
                    <Input
                      placeholder="수량"
                      type="number"
                      step="any"
                      value={ingredient.amount?.toString() ?? ''}
                      onChange={(e) =>
                        updateIngredient(index, {
                          amount: e.target.value
                            ? Number(e.target.value)
                            : null,
                        })
                      }
                      className="rounded-xl border border-[#f8bbd9]/30 bg-white px-3 py-2 text-sm text-[#4a4a4a] focus:border-[#f8bbd9] focus:outline-none"
                    />
                    <Input
                      placeholder="단위"
                      value={ingredient.unit ?? ''}
                      onChange={(e) =>
                        updateIngredient(index, {
                          unit: e.target.value || null,
                        })
                      }
                      className="rounded-xl border border-[#f8bbd9]/30 bg-white px-3 py-2 text-sm text-[#4a4a4a] focus:border-[#f8bbd9] focus:outline-none"
                    />
                    <Input
                      placeholder="메모 (선택)"
                      value={ingredient.note ?? ''}
                      onChange={(e) =>
                        updateIngredient(index, {
                          note: e.target.value || null,
                        })
                      }
                      className="col-span-2 rounded-xl border border-[#f8bbd9]/30 bg-white px-3 py-2 text-sm text-[#8b7b7b] focus:border-[#f8bbd9] focus:outline-none sm:col-span-1"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeIngredient(index)}
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-[#ffcdd2]/50 transition-colors hover:bg-[#ffcdd2]"
                  >
                    <Trash2 className="h-4 w-4 text-[#e53935]" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addIngredient}
            className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#c8e6c9]/30 py-3 text-sm text-[#2e5f30] transition-colors hover:bg-[#c8e6c9]/50"
          >
            <Plus className="h-4 w-4" />
            재료 추가
          </button>
        </div>
      </div>

      {/* Steps section */}
      <div className="relative">
        <div className="absolute -top-1 right-2 left-2 h-full rounded-3xl bg-[#f8bbd9]/40" />
        <div className="relative rounded-3xl border border-[#f8bbd9]/30 bg-white p-4 shadow-xl shadow-[#f8bbd9]/20">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#f8bbd9]">
              <ChefHat className="h-4 w-4 text-[#ad1457]" />
            </div>
            <h3 className="text-base font-semibold text-[#6b5b4f]">
              조리 순서
            </h3>
            <span className="ml-auto text-xs text-[#8b7b7b]">
              {steps.length}단계
            </span>
          </div>

          <div className="relative">
            <div className="absolute top-6 bottom-16 left-4 w-0.5 bg-gradient-to-b from-[#f8bbd9] via-[#e8a4b8] to-[#f8bbd9]" />

            <div className="space-y-4">
              {steps.map((step, index) => (
                <div key={step._editId} className="relative flex gap-4">
                  <div className="relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#f8bbd9] to-[#e8a4b8] shadow-md">
                    <span className="text-sm font-bold text-white">
                      {index + 1}
                    </span>
                  </div>
                  <div className="flex flex-1 gap-2">
                    <Textarea
                      value={step.text}
                      onChange={(e) => updateStep(index, e.target.value)}
                      placeholder={`${index + 1}단계 내용을 입력하세요`}
                      rows={2}
                      className={`flex-1 resize-none rounded-2xl border border-[#f8bbd9]/30 p-3 text-sm leading-relaxed text-[#4a4a4a] focus:border-[#f8bbd9] focus:outline-none ${
                        index % 2 === 0 ? 'bg-[#fef7f9]' : 'bg-[#fce4ec]/30'
                      }`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeStep(index)}
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-[#ffcdd2]/50 transition-colors hover:bg-[#ffcdd2]"
                    >
                      <Trash2 className="h-4 w-4 text-[#e53935]" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={addStep}
            className="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#f8bbd9]/30 py-3 text-sm text-[#ad1457] transition-colors hover:bg-[#f8bbd9]/50"
          >
            <Plus className="h-4 w-4" />
            단계 추가
          </button>
        </div>
      </div>

      {/* Tips section */}
      <div className="relative">
        <div className="absolute -top-0.5 right-1 left-1 h-full rounded-2xl bg-[#a5d6a7]/30" />
        <div className="relative rounded-2xl border border-[#c8e6c9]/50 bg-[#e8f5e9] p-4 shadow-lg shadow-[#c8e6c9]/20">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#c8e6c9]">
              <Lightbulb className="h-4 w-4 text-[#2e5f30]" />
            </div>
            <h3 className="text-sm font-semibold text-[#2e5f30]">요리 팁</h3>
          </div>

          <div className="space-y-2">
            {tips.map((tip, index) => (
              <div key={tip._editId} className="flex items-start gap-2">
                <span className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-lg bg-[#c8e6c9] text-xs text-[#2e5f30]">
                  {index + 1}
                </span>
                <Input
                  placeholder="요리 팁을 입력하세요"
                  value={tip.value}
                  onChange={(e) => updateTip(index, e.target.value)}
                  className="flex-1 rounded-xl border border-[#c8e6c9]/50 bg-white px-3 py-2 text-sm text-[#4a4a4a] focus:border-[#c8e6c9] focus:outline-none"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeTip(index)}
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-[#ffcdd2]/50 transition-colors hover:bg-[#ffcdd2]"
                >
                  <Trash2 className="h-4 w-4 text-[#e53935]" />
                </Button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addTip}
            className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#c8e6c9]/50 py-2.5 text-sm text-[#2e5f30] transition-colors hover:bg-[#c8e6c9]/70"
          >
            <Plus className="h-4 w-4" />팁 추가
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-[#ffcdd2]/30 px-4 py-3 text-sm font-medium text-[#c62828]">
          {error}
        </div>
      )}

      {/* Bottom buttons */}
      <div className="flex gap-3 pb-4">
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          disabled={isSaving}
          className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-[#f8bbd9] bg-white py-4 text-sm font-medium text-[#6b5b4f] shadow-md transition-colors hover:bg-[#fef7f9]"
        >
          <X className="h-4 w-4" />
          취소
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="flex flex-[2] cursor-pointer items-center justify-center gap-2 rounded-2xl border-0 bg-gradient-to-r from-[#f8bbd9] to-[#e8a4b8] py-4 text-sm font-medium text-white shadow-lg shadow-[#f8bbd9]/40 transition-opacity hover:opacity-90"
        >
          {isSaving ? (
            <>
              <LoaderCircle className="size-4 animate-spin" />
              저장 중...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              저장하기
            </>
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
              className="border-[#f8bbd9] text-[#6b5b4f] hover:bg-[#fef7f9]"
            >
              계속 수정하기
            </Button>
            <Button
              type="button"
              onClick={() => {
                setConfirmOpen(false);
                onCancel();
              }}
              className="border-0 bg-gradient-to-r from-[#f8bbd9] to-[#e8a4b8] text-white"
            >
              변경 사항 버리기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
