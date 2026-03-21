import { HistoryList } from '@/components/history-list';
import { BottomNav } from '@/components/bottom-nav';

export default function HistoryPage() {
  return (
    <main className="flex-1 min-h-screen bg-gradient-to-b from-[#fce4ec] via-[#fef7f9] to-[#fff8e1] pb-24 md:pb-8">
      {/* Background decorations */}
      <div className="fixed top-0 left-0 w-40 h-40 bg-[#f8bbd9]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-20 right-0 w-60 h-60 bg-[#c8e6c9]/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative mx-auto w-full max-w-lg px-4 py-6 space-y-6 lg:max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-xl font-display text-[#6b5b4f]">
            최근 레시피
          </h1>
          <p className="text-xs text-[#8b7b7b] font-body">
            최근에 추출한 레시피를 다시 확인할 수 있어요
          </p>
        </div>
        <HistoryList />
      </div>

      <BottomNav />
    </main>
  );
}
