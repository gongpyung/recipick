import { ExtractionProgress } from '@/components/extraction-progress';
import { BottomNav } from '@/components/bottom-nav';

export default async function ExtractionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="flex-1 pb-24">
      {/* Background decorations */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-[#f8bbd9]/30 blur-3xl" />
        <div className="absolute top-1/2 -left-20 h-48 w-48 rounded-full bg-[#c8e6c9]/30 blur-3xl" />
        <div className="absolute right-10 bottom-20 h-32 w-32 rounded-full bg-[#ffe0b2]/30 blur-2xl" />
      </div>

      <div className="relative mx-auto w-full max-w-md px-4 py-6">
        <ExtractionProgress extractionId={id} />
      </div>

      <BottomNav />
    </main>
  );
}
