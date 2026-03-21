import { RecentRecipes } from '@/components/recent-recipes';
import { UrlInputForm } from '@/components/url-input-form';

export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <main className="flex-1 px-5 py-10 md:py-16">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-14">
        <section className="mx-auto w-full max-w-xl space-y-8 text-center">
          <div className="space-y-3">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              유튜브 영상에서
              <br />
              <span className="text-primary">레시피를 추출</span>해 드려요
            </h1>
            <p className="mx-auto max-w-md text-muted-foreground">
              YouTube 링크를 붙여넣으면 자막과 설명을 분석해서
              재료, 조리 단계, 팁을 구조화된 레시피로 만들어 드립니다.
            </p>
          </div>
          <UrlInputForm />
        </section>

        <section className="space-y-5" id="recent">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold tracking-tight">
              최근 추출한 레시피
            </h2>
            <p className="text-sm text-muted-foreground">
              최근에 만든 레시피를 바로 확인할 수 있어요.
            </p>
          </div>
          <RecentRecipes />
        </section>
      </div>
    </main>
  );
}
