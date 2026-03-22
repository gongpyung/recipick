import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <main className="flex-1 pb-24">
      <section className="hero-bg border-b border-[#f8bbd9]/20 px-6 pt-14 pb-16">
        <div className="mx-auto max-w-2xl space-y-8 text-center">
          <Skeleton className="mx-auto h-12 w-2/3 rounded-xl" />
          <Skeleton className="mx-auto h-6 w-1/2 rounded-lg" />
          <Skeleton className="mx-auto h-14 w-full max-w-lg rounded-3xl" />
        </div>
      </section>

      <section className="px-6 py-14">
        <div className="mx-auto max-w-6xl space-y-8">
          <Skeleton className="h-8 w-48 rounded-lg" />
          <div className="rounded-3xl border border-[#f8bbd9]/30 bg-white p-4 shadow-xl shadow-[#f8bbd9]/20">
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
