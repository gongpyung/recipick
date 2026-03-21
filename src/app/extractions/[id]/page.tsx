import { ExtractionProgress } from '@/components/extraction-progress';

export default async function ExtractionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="flex-1 px-6 py-12">
      <div className="mx-auto w-full max-w-3xl">
        <ExtractionProgress extractionId={id} />
      </div>
    </main>
  );
}
