import { Skeleton } from '@/components/ui/skeleton';

export default function RecipeLoading() {
  return (
    <main className="flex-1 px-5 py-10">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="space-y-3">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-5 w-1/3" />
        </div>
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </div>
    </main>
  );
}
