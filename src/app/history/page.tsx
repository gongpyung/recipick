import { HistoryList } from '@/components/history-list';
import { BottomNav } from '@/components/bottom-nav';

export default function HistoryPage() {
  return (
    <main className="min-h-screen flex-1 bg-gradient-to-b from-[#fce4ec] via-[#fef7f9] to-[#fff8e1] pb-24 md:pb-8">
      {/* Background decorations */}
      <div className="pointer-events-none fixed top-0 left-0 h-40 w-40 rounded-full bg-[#f8bbd9]/20 blur-3xl" />
      <div className="pointer-events-none fixed right-0 bottom-20 h-60 w-60 rounded-full bg-[#c8e6c9]/20 blur-3xl" />

      <div className="relative mx-auto w-full max-w-lg space-y-6 px-4 py-6 lg:max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="font-display text-xl text-[#6b5b4f]">최근 레시피</h1>
          <p className="font-body text-xs text-[#8b7b7b]">
            최근에 추출한 레시피를 다시 확인할 수 있어요
          </p>
        </div>
        <HistoryList />
      </div>

      <BottomNav />
    </main>
  );
}
