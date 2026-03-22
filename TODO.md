# 레시픽 (Recipick) TODO

## 완료된 개발 단계

- [x] Step 1: 데이터 파이프라인 (URL 파싱, YouTube API, Supabase)
- [x] Step 2: AI 추출 엔진 (Z.ai LLM, 정규화, 스키마 검증)
- [x] Step 3: 프론트엔드 핵심 화면 (홈, 진행, 결과, 인분 조절)
- [x] Step 4: 편집 + 히스토리 + 폴리시
- [x] v0 디자인 통합 (귀여운 한국 앱 스타일)
- [x] 브랜딩: 레시픽 (Recipick) 적용
- [x] Playwright E2E 테스트 44개
- [x] Smoke Test 통과 (봄동비빔밥, 대파제육볶음)
- [x] UI Fix: 재료 줄바꿈, 하단 네비 반응형, 페이지 너비
- [x] warning.code 내부 코드 UI 노출 제거
- [x] 폴더명 변경 (youtube-recipe-ai → recipick)

---

## 배포

- [x] GitHub 저장소에 push (https://github.com/gongpyung/recipick)
- [x] Vercel 연결 + 자동 배포 설정
- [x] 환경변수 설정 (Supabase, YouTube API, Z.ai)
- [ ] 도메인 연결 (recipick.com 등)
- [ ] 배포 후 실서비스 E2E 확인

---

## 품질 검증

- [ ] eval set 구축 (15~20개 실제 YouTube 영상 선정)
- [ ] eval set으로 추출 품질 검증 (schema valid rate, 재료 recall)
- [ ] 프롬프트 튜닝 (eval set 결과 기반)
- [ ] LLM 응답 속도 개선 (glm-5 ~70초 → 목표 30초 이내)

---

## 보안 (공개 서비스 전환 시 필수)

- [ ] **[CRITICAL]** API 인증 레이어 추가 (현재 인증 없이 전체 공개)
- [ ] **[HIGH]** PATCH /api/recipes/:id 입력값 Zod 런타임 검증 추가
- [ ] **[HIGH]** Rate Limiting 도입 (POST /api/extractions — YouTube/LLM 비용 보호)
- [ ] **[HIGH]** Service Role Key → anon key + RLS 전환
- [ ] **[MEDIUM]** 썸네일 URL 검증 + `next/image` 전환 (XSS 방지)
- [ ] **[MEDIUM]** `raw_output_json` 민감정보 분리 또는 접근 제한
- [ ] **[LOW]** CORS 헤더 명시적 설정

---

## 기술 부채

- [ ] Supabase 타입 캐스팅 (`as unknown as SupabaseSubset`) 정리
- [ ] `next/image`로 YouTube 썸네일 마이그레이션
- [ ] `setTimeout` background dispatch → durable worker/queue 전환
- [ ] DB atomic transaction (현재 rollback 보완)

---

## 후속 기능 (v1.1+)

- [ ] 자막 없는 영상 ASR fallback
- [ ] OCR/비전 기반 재료 인식
- [ ] 즐겨찾기 기능
- [ ] 설정 페이지
- [ ] 공유 기능 (SNS 공유 등)
