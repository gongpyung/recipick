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
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#f8bbd9]/30 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-20 w-48 h-48 bg-[#c8e6c9]/30 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-32 h-32 bg-[#ffe0b2]/30 rounded-full blur-2xl" />
      </div>

      <div className="relative mx-auto w-full max-w-md px-4 py-6">
        <ExtractionProgress extractionId={id} />
      </div>

      <BottomNav />
    </main>
  );
}
