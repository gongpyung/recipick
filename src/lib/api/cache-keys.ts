export const RECENT_RECIPES_LIMIT = 5;

export const HOME_RECIPES_CACHE_KEY = [
  'recent-recipes',
  RECENT_RECIPES_LIMIT,
] as const;

export const HISTORY_RECIPES_CACHE_KEY = 'recent-recipes-full';

export function recipeDetailCacheKey(recipeId: string) {
  return ['recipe', recipeId] as const;
}
