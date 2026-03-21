import { Skeleton } from '@/components/ui/skeleton';

export default function HistoryLoading() {
  return (
    <main className="min-h-screen flex-1 bg-gradient-to-b from-[#fce4ec] via-[#fef7f9] to-[#fff8e1] pb-24">
      <div className="relative mx-auto w-full max-w-lg space-y-6 px-4 py-6">
        <div>
          <Skeleton className="h-7 w-36 rounded-lg" />
          <Skeleton className="mt-1 h-4 w-64 rounded-lg" />
        </div>

        <div className="rounded-3xl border border-[#f8bbd9]/30 bg-white p-5 shadow-xl shadow-[#f8bbd9]/20">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-2xl bg-[#fef7f9]">
                <Skeleton className="h-32 w-full" />
                <div className="space-y-2 p-3">
                  <Skeleton className="h-4 w-3/4 rounded-md" />
                  <Skeleton className="h-3 w-1/3 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
