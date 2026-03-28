import { RecipeView } from '@/components/recipe-view';
import { BottomNav } from '@/components/bottom-nav';
import { getRecipe } from '@/lib/recipe/service';

export const revalidate = 300;

export function generateStaticParams() {
  return [];
}

export default async function RecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const recipe = await getRecipe(id);

  return (
    <main className="min-h-screen flex-1 bg-gradient-to-b from-[#fce4ec] via-[#fef7f9] to-[#fff8e1] pb-24 md:pb-8">
      <div className="relative mx-auto w-full max-w-2xl px-4 py-6 lg:max-w-4xl">
        <RecipeView recipeId={id} initialData={recipe ?? undefined} />
      </div>

      <BottomNav />
    </main>
  );
}
