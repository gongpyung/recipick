# YouTube Recipe AI

유튜브 일반 영상/쇼츠 URL을 넣으면 **구조화된 레시피**를 추출하고, **인분 수에 맞춰 재료량을 조절**할 수 있게 만드는 웹앱.

## 현재 상태
- 2026-03-20: 개발 시작 전 문서 세트 초안 생성
- 목표: 문서 합의 후 바로 MVP 개발 착수

## MVP 한 줄
- 입력: YouTube 영상/쇼츠 URL
- 출력: 제목 / 기본 인분 / 재료 / 조리 단계 / 팁 / 경고
- 핵심 기능: **인분 조절**, **결과 수정**, **최근 결과 다시 보기**

## 문서 인덱스
- `docs/01-PRD.md`
- `docs/02-USER-FLOWS-AND-SCREENS.md`
- `docs/03-EXTRACTION-RULES.md`
- `docs/03-EXTRACTION-SCHEMA.json`
- `docs/04-AI-PROCESSING-SPEC.md`
- `docs/05-API-CONTRACT.md`
- `docs/06-DOMAIN-AND-DB-SCHEMA.md`
- `docs/07-EVAL-SET.md`
- `docs/08-IMPLEMENTATION-BACKLOG.md`

## 추천 개발 순서
1. `01-PRD.md` 최종 합의
2. `03-EXTRACTION-SCHEMA.json` / `03-EXTRACTION-RULES.md` 확정
3. `04-AI-PROCESSING-SPEC.md` 확정
4. `05-API-CONTRACT.md` + `06-DOMAIN-AND-DB-SCHEMA.md` 기준으로 구현
5. `07-EVAL-SET.md`에 실제 테스트 URL 채우기
6. `08-IMPLEMENTATION-BACKLOG.md` 순서대로 개발

## 디자인 참고 방향
- 홈 화면: Recipe Retriever 스타일
- 결과 화면: BBC Good Food 스타일
- 장기 저장/라이브러리: Samsung Food Recipe Box 참고
- 카피 톤: 원본 Threads 아이디어 참고

## 비목표 (MVP 기준)
- 공개 레시피 커뮤니티
- 소셜 기능
- 장보기/쇼핑몰 연동
- 영양정보 자동 계산
- 완벽한 멀티플랫폼 영상 지원

## 제안 기술 스택
- Frontend: Next.js + TypeScript + Tailwind + shadcn/ui
- Backend: Next.js Route Handlers
- Storage: localStorage로 시작, 이후 DB 확장
- AI: **Z.ai GLM 코딩 플랜 기반 LLM API** + 자막 기반 파이프라인

## LLM API 결정
- 1차 LLM 제공자는 **Z.ai**로 고정
- 사용 플랜은 **GLM 코딩 플랜**
- 서버에서 Z.ai API를 호출하며, 브라우저에서 직접 외부 LLM API를 호출하지 않음
- 기본 방향은 **Z.ai coding endpoint** 사용
- 모델 ID는 구현 시점 계정에서 실제 사용 가능한 GLM 모델로 확정하되, 코드에서는 환경변수로 바꿀 수 있게 설계
- 권장 환경변수 예시:
  - `ZAI_API_KEY`
  - `ZAI_BASE_URL` (기본값 예: `https://api.z.ai/api/coding/paas/v4`)
  - `ZAI_MODEL`

## 메모
현재 기준으로는 **OCR/비전보다 자막/설명 기반 MVP를 먼저 출시**하는 쪽을 추천한다. 첫 버전에서 너무 많은 소스를 동시에 다루면 품질과 속도 둘 다 흔들릴 가능성이 높다.
