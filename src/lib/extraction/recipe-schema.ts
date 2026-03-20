import { z } from 'zod';

const recipeConfidenceSchema = z.enum(['high', 'medium', 'low']);
const warningSeveritySchema = z.enum(['info', 'warning', 'error']);
const sourceUsageSchema = z.enum([
  'title',
  'description',
  'captions',
  'asr',
  'ocr',
  'vision',
]);
const warningCodeSchema = z.enum([
  'MISSING_QUANTITY',
  'MISSING_BASE_SERVINGS',
  'LOW_CONFIDENCE_INGREDIENT',
  'LOW_CONFIDENCE_STEP',
  'MULTIPLE_DISHES_DETECTED',
  'NON_RECIPE_VIDEO',
  'INSUFFICIENT_SOURCE_TEXT',
  'OCR_REQUIRED_BUT_DISABLED',
]);

export const structuredRecipeSchema = z.object({
  title: z.string().trim().min(1),
  source: z.object({
    youtubeUrl: z.string().url(),
    videoId: z.string().trim().min(1),
    sourceType: z.enum(['video', 'shorts']),
    language: z.string().trim().min(1).nullable(),
  }),
  baseServings: z.number().min(0.25).nullable(),
  summary: z.string().trim().min(1).nullable(),
  ingredients: z.array(
    z.object({
      name: z.string().trim().min(1),
      amount: z.number().min(0).nullable(),
      amountText: z.string().trim().min(1).nullable().optional(),
      unit: z.string().trim().min(1).nullable(),
      scalable: z.boolean(),
      note: z.string().trim().min(1).nullable(),
      confidence: recipeConfidenceSchema,
    }),
  ),
  steps: z
    .array(
      z.object({
        stepNo: z.number().int().min(1),
        text: z.string().trim().min(1),
        note: z.string().trim().min(1).nullable().optional(),
        confidence: recipeConfidenceSchema,
      }),
    )
    .min(1),
  tips: z.array(z.string().trim().min(1)),
  warnings: z.array(
    z.object({
      code: warningCodeSchema,
      message: z.string().trim().min(1),
      severity: warningSeveritySchema,
    }),
  ),
  confidence: recipeConfidenceSchema,
  extractionMeta: z
    .object({
      usedSources: z.array(sourceUsageSchema).optional(),
      model: z.string().trim().min(1).nullable().optional(),
      extractorVersion: z.string().trim().min(1).nullable().optional(),
    })
    .optional(),
});

export const recipePatchSchema = z.object({
  title: z.string().trim().min(1),
  baseServings: z.number().min(0.25).nullable(),
  summary: z.string().trim().min(1).nullable().optional(),
  ingredients: structuredRecipeSchema.shape.ingredients,
  steps: structuredRecipeSchema.shape.steps,
  tips: structuredRecipeSchema.shape.tips,
  warnings: structuredRecipeSchema.shape.warnings,
  confidence: recipeConfidenceSchema.optional(),
});

export type StructuredRecipeInput = z.infer<typeof structuredRecipeSchema>;
export type RecipePatchInput = z.infer<typeof recipePatchSchema>;
