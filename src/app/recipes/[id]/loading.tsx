import { Skeleton } from '@/components/ui/skeleton';

export default function RecipeLoading() {
  return (
    <main className="min-h-screen flex-1 bg-gradient-to-b from-[#fce4ec] via-[#fef7f9] to-[#fff8e1] pb-28">
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        <div className="rounded-3xl border border-[#f8bbd9]/30 bg-white p-5 shadow-xl shadow-[#f8bbd9]/20">
          <Skeleton className="mx-auto h-8 w-2/3 rounded-lg" />
          <Skeleton className="mx-auto mt-2 h-5 w-1/3 rounded-lg" />
        </div>

        <Skeleton className="h-16 w-full rounded-2xl" />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-[#c8e6c9]/30 bg-white p-4 shadow-xl shadow-[#c8e6c9]/20">
            <Skeleton className="mb-4 h-6 w-16 rounded-lg" />
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-[#f8bbd9]/30 bg-white p-4 shadow-xl shadow-[#f8bbd9]/20">
            <Skeleton className="mb-4 h-6 w-20 rounded-lg" />
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
