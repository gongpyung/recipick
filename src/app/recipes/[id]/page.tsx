import { RecipeView } from '@/components/recipe-view';

export default async function RecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="flex-1 px-6 py-12">
      <div className="mx-auto w-full max-w-6xl">
        <RecipeView recipeId={id} />
      </div>
    </main>
  );
}
