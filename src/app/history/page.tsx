import { HistoryList } from '@/components/history-list';

export default function HistoryPage() {
  return (
    <main className="flex-1 px-5 py-10">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">최근 레시피</h1>
          <p className="text-sm text-muted-foreground">
            최근에 추출한 레시피를 다시 열어 확인할 수 있어요.
          </p>
        </div>
        <HistoryList />
      </div>
    </main>
  );
}
