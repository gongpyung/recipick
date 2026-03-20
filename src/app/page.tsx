import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <main className="bg-muted/30 flex flex-1 items-center justify-center px-6 py-24">
      <section className="bg-background w-full max-w-4xl rounded-3xl border p-10 shadow-sm">
        <div className="space-y-6">
          <span className="bg-primary/10 text-primary inline-flex rounded-full px-4 py-1 text-sm font-medium">
            Step 1 · Foundation + Data Pipeline
          </span>
          <div className="space-y-4">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              YouTube Recipe AI
            </h1>
            <p className="text-muted-foreground max-w-2xl text-lg leading-8">
              유튜브 일반 영상과 쇼츠 URL을 입력하면 레시피 구조화를 위한 데이터
              파이프라인을 준비하는 MVP입니다. 현재는 URL 파싱, 메타데이터/자막
              수집, 저장 레이어까지 구현하는 Step 1을 진행 중입니다.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              'YouTube URL 검증과 videoId 파싱',
              '메타데이터·자막 수집 및 텍스트 정리',
              'Supabase 저장과 extraction 상태 추적',
            ].map((item) => (
              <div
                key={item}
                className="bg-card text-card-foreground rounded-2xl border px-5 py-4 text-sm"
              >
                {item}
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button nativeButton={false} render={<a href="/api/extractions" />}>
              API 준비 상태 보기
            </Button>
            <Button
              nativeButton={false}
              render={
                <a href="https://nextjs.org/docs/app/api-reference/file-conventions/route" />
              }
              variant="outline"
            >
              Next.js Route Handlers
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
