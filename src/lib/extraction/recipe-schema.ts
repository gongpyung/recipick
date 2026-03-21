import { z } from 'zod';

import type { StructuredRecipe } from '@/lib/extraction/types';

const recipeConfidenceSchema = z.enum(['high', 'medium', 'low']);
const warningSeveritySchema = z.enum(['info', 'warning', 'error']);
const recipeWarningCodeSchema = z.enum([
  'MISSING_QUANTITY',
  'MISSING_BASE_SERVINGS',
  'LOW_CONFIDENCE_INGREDIENT',
  'LOW_CONFIDENCE_STEP',
  'MULTIPLE_DISHES_DETECTED',
  'NON_RECIPE_VIDEO',
  'INSUFFICIENT_SOURCE_TEXT',
  'OCR_REQUIRED_BUT_DISABLED',
]);

export const structuredRecipeSchema = z
  .object({
    title: z.string().trim().min(1),
    source: z.object({
      youtubeUrl: z.string().trim().url(),
      videoId: z.string().trim().min(1),
      sourceType: z.enum(['video', 'shorts']),
      language: z.string().trim().min(1).nullable(),
    }),
    baseServings: z.number().min(0.25).nullable(),
    summary: z.string().trim().nullable(),
    ingredients: z
      .array(
        z.object({
          name: z.string().trim().min(1),
          amount: z.number().min(0).nullable(),
          amountText: z.string().trim().nullable().optional(),
          unit: z.string().trim().nullable(),
          scalable: z.boolean(),
          note: z.string().trim().nullable(),
          confidence: recipeConfidenceSchema,
        }),
      )
      .min(1),
    steps: z
      .array(
        z.object({
          stepNo: z.number().int().min(1),
          text: z.string().trim().min(1),
          note: z.string().trim().nullable().optional(),
          confidence: recipeConfidenceSchema,
        }),
      )
      .min(1),
    tips: z.array(z.string().trim()).default([]),
    warnings: z
      .array(
        z.object({
          code: recipeWarningCodeSchema,
          message: z.string().trim().min(1),
          severity: warningSeveritySchema,
        }),
      )
      .default([]),
    confidence: recipeConfidenceSchema,
    extractionMeta: z
      .object({
        usedSources: z
          .array(
            z.enum(['title', 'description', 'captions', 'asr', 'ocr', 'vision']),
          )
          .optional(),
        model: z.string().trim().nullable().optional(),
        extractorVersion: z.string().trim().nullable().optional(),
      })
      .optional(),
  })
  .strict();

export type StructuredRecipeInput = z.infer<typeof structuredRecipeSchema>;

export function parseStructuredRecipe(payload: unknown): StructuredRecipe {
  return structuredRecipeSchema.parse(payload) as StructuredRecipe;
}
