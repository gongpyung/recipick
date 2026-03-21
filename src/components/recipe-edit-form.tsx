'use client';

import { useRef, useState } from 'react';
import { ChefHat, Lightbulb, LoaderCircle, Plus, Save, ShoppingBasket, Trash2, X } from 'lucide-react';

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
        <Label htmlFor="edit-title" className="text-xs text-[#8b7b7b] mb-1.5 block">
          레시피 제목
        </Label>
        <Input
          id="edit-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full text-xl font-semibold text-[#4a4a4a] bg-[#fef7f9] rounded-2xl px-4 py-3 border-2 border-transparent focus:border-[#f8bbd9] focus:outline-none transition-colors"
          placeholder="레시피 제목을 입력하세요"
        />
      </div>

      {/* Servings */}
      <div className="mb-5">
        <Label htmlFor="edit-servings" className="text-xs text-[#8b7b7b] mb-1.5 block">
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
            className="w-20 text-center text-lg font-medium text-[#4a4a4a] bg-[#fef7f9] rounded-2xl px-3 py-2 border-2 border-transparent focus:border-[#f8bbd9] focus:outline-none transition-colors"
          />
          <span className="text-sm text-[#8b7b7b]">인분</span>
        </div>
      </div>

      {/* Ingredients section */}
      <div className="relative">
        <div className="absolute -top-1 left-2 right-2 h-full bg-[#c8e6c9]/40 rounded-3xl" />
        <div className="relative bg-white rounded-3xl p-4 shadow-xl shadow-[#c8e6c9]/20 border border-[#c8e6c9]/30">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-[#c8e6c9] rounded-xl flex items-center justify-center">
              <ShoppingBasket className="w-4 h-4 text-[#2e5f30]" />
            </div>
            <h3 className="text-base font-semibold text-[#6b5b4f]">재료</h3>
            <span className="text-xs text-[#8b7b7b] ml-auto">{ingredients.length}가지</span>
          </div>

          <div className="space-y-2">
            {ingredients.map((ingredient, index) => (
              <div
                key={ingredient._editId}
                className={`p-3 rounded-2xl ${index % 2 === 0 ? 'bg-[#fef7f9]' : 'bg-white border border-[#f8bbd9]/20'}`}
              >
                <div className="flex items-start gap-2">
                  <span className="w-6 h-6 bg-[#f8bbd9]/50 rounded-lg flex items-center justify-center text-xs text-[#e8a4b8] flex-shrink-0 mt-1">
                    {index + 1}
                  </span>
                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <Input
                      placeholder="재료명"
                      value={ingredient.name}
                      onChange={(e) =>
                        updateIngredient(index, { name: e.target.value })
                      }
                      className="col-span-2 sm:col-span-1 text-sm text-[#4a4a4a] bg-white rounded-xl px-3 py-2 border border-[#f8bbd9]/30 focus:border-[#f8bbd9] focus:outline-none"
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
                      className="text-sm text-[#4a4a4a] bg-white rounded-xl px-3 py-2 border border-[#f8bbd9]/30 focus:border-[#f8bbd9] focus:outline-none"
                    />
                    <Input
                      placeholder="단위"
                      value={ingredient.unit ?? ''}
                      onChange={(e) =>
                        updateIngredient(index, { unit: e.target.value || null })
                      }
                      className="text-sm text-[#4a4a4a] bg-white rounded-xl px-3 py-2 border border-[#f8bbd9]/30 focus:border-[#f8bbd9] focus:outline-none"
                    />
                    <Input
                      placeholder="메모 (선택)"
                      value={ingredient.note ?? ''}
                      onChange={(e) =>
                        updateIngredient(index, { note: e.target.value || null })
                      }
                      className="col-span-2 sm:col-span-1 text-sm text-[#8b7b7b] bg-white rounded-xl px-3 py-2 border border-[#f8bbd9]/30 focus:border-[#f8bbd9] focus:outline-none"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeIngredient(index)}
                    className="w-8 h-8 bg-[#ffcdd2]/50 rounded-xl flex items-center justify-center hover:bg-[#ffcdd2] transition-colors flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4 text-[#e53935]" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addIngredient}
            className="w-full mt-3 py-3 bg-[#c8e6c9]/30 hover:bg-[#c8e6c9]/50 rounded-2xl flex items-center justify-center gap-2 text-sm text-[#2e5f30] transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            재료 추가
          </button>
        </div>
      </div>

      {/* Steps section */}
      <div className="relative">
        <div className="absolute -top-1 left-2 right-2 h-full bg-[#f8bbd9]/40 rounded-3xl" />
        <div className="relative bg-white rounded-3xl p-4 shadow-xl shadow-[#f8bbd9]/20 border border-[#f8bbd9]/30">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-[#f8bbd9] rounded-xl flex items-center justify-center">
              <ChefHat className="w-4 h-4 text-[#ad1457]" />
            </div>
            <h3 className="text-base font-semibold text-[#6b5b4f]">조리 순서</h3>
            <span className="text-xs text-[#8b7b7b] ml-auto">{steps.length}단계</span>
          </div>

          <div className="relative">
            <div className="absolute left-4 top-6 bottom-16 w-0.5 bg-gradient-to-b from-[#f8bbd9] via-[#e8a4b8] to-[#f8bbd9]" />

            <div className="space-y-4">
              {steps.map((step, index) => (
                <div key={step._editId} className="flex gap-4 relative">
                  <div className="relative z-10 w-8 h-8 bg-gradient-to-br from-[#f8bbd9] to-[#e8a4b8] rounded-full flex items-center justify-center shadow-md flex-shrink-0">
                    <span className="text-sm font-bold text-white">{index + 1}</span>
                  </div>
                  <div className="flex-1 flex gap-2">
                    <Textarea
                      value={step.text}
                      onChange={(e) => updateStep(index, e.target.value)}
                      placeholder={`${index + 1}단계 내용을 입력하세요`}
                      rows={2}
                      className={`flex-1 text-sm text-[#4a4a4a] leading-relaxed p-3 rounded-2xl resize-none border border-[#f8bbd9]/30 focus:border-[#f8bbd9] focus:outline-none ${
                        index % 2 === 0 ? 'bg-[#fef7f9]' : 'bg-[#fce4ec]/30'
                      }`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeStep(index)}
                      className="w-8 h-8 bg-[#ffcdd2]/50 rounded-xl flex items-center justify-center hover:bg-[#ffcdd2] transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4 text-[#e53935]" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={addStep}
            className="w-full mt-4 py-3 bg-[#f8bbd9]/30 hover:bg-[#f8bbd9]/50 rounded-2xl flex items-center justify-center gap-2 text-sm text-[#ad1457] transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            단계 추가
          </button>
        </div>
      </div>

      {/* Tips section */}
      <div className="relative">
        <div className="absolute -top-0.5 left-1 right-1 h-full bg-[#a5d6a7]/30 rounded-2xl" />
        <div className="relative bg-[#e8f5e9] rounded-2xl p-4 shadow-lg shadow-[#c8e6c9]/20 border border-[#c8e6c9]/50">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 bg-[#c8e6c9] rounded-xl flex items-center justify-center">
              <Lightbulb className="w-4 h-4 text-[#2e5f30]" />
            </div>
            <h3 className="text-sm font-semibold text-[#2e5f30]">요리 팁</h3>
          </div>

          <div className="space-y-2">
            {tips.map((tip, index) => (
              <div key={tip._editId} className="flex items-start gap-2">
                <span className="w-5 h-5 bg-[#c8e6c9] rounded-lg flex items-center justify-center text-xs text-[#2e5f30] flex-shrink-0 mt-1">
                  {index + 1}
                </span>
                <Input
                  placeholder="요리 팁을 입력하세요"
                  value={tip.value}
                  onChange={(e) => updateTip(index, e.target.value)}
                  className="flex-1 text-sm text-[#4a4a4a] bg-white rounded-xl px-3 py-2 border border-[#c8e6c9]/50 focus:border-[#c8e6c9] focus:outline-none"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeTip(index)}
                  className="w-8 h-8 bg-[#ffcdd2]/50 rounded-xl flex items-center justify-center hover:bg-[#ffcdd2] transition-colors flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4 text-[#e53935]" />
                </Button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addTip}
            className="w-full mt-3 py-2.5 bg-[#c8e6c9]/50 hover:bg-[#c8e6c9]/70 rounded-xl flex items-center justify-center gap-2 text-sm text-[#2e5f30] transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            팁 추가
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
          className="flex-1 py-4 bg-white rounded-2xl flex items-center justify-center gap-2 text-sm font-medium text-[#6b5b4f] border-2 border-[#f8bbd9] hover:bg-[#fef7f9] transition-colors shadow-md cursor-pointer"
        >
          <X className="w-4 h-4" />
          취소
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="flex-[2] py-4 bg-gradient-to-r from-[#f8bbd9] to-[#e8a4b8] rounded-2xl flex items-center justify-center gap-2 text-sm font-medium text-white shadow-lg shadow-[#f8bbd9]/40 hover:opacity-90 transition-opacity border-0 cursor-pointer"
        >
          {isSaving ? (
            <>
              <LoaderCircle className="size-4 animate-spin" />
              저장 중...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
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
              className="bg-gradient-to-r from-[#f8bbd9] to-[#e8a4b8] text-white border-0"
            >
              변경 사항 버리기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
