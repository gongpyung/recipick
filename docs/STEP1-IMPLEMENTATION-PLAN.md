# Step 1: Foundation + Data Pipeline - Implementation Plan

## Overview

YouTube Recipe AI의 기반 구축 단계. 프로젝트 부트스트랩 + URL 파싱 + YouTube 메타데이터/자막 수집 + Supabase 저장까지 완료한다.

## Tech Stack

- Framework: Next.js 15 + TypeScript + App Router
- Styling: Tailwind CSS + shadcn/ui
- Database: Supabase (Postgres) - Free tier
- Testing: Vitest
- YouTube: YouTube Data API v3
- LLM: Z.ai GLM coding plan (Step 1에서는 미연동, 환경변수만 정의)

## Confirmed Decisions

- Storage: Supabase (not localStorage)
- Progress tracking: Polling (not SSE)
- Cache: Same videoId → reuse latest completed extraction (24h TTL)
- Tips storage: JSON column in recipes table
- Rate Limiting: Removed from Step 1 (frontend debounce only, server-side in Step 2)
- IDs: Supabase UUID (not custom nanoid)

---

## Execution Structure: 3 Stages

### Stage A: Bootstrap (Sequential, main branch)

#### Task 1-1. Project Creation [S]

- `npx create-next-app@latest --typescript --app --tailwind --src-dir --eslint`
- Install shadcn/ui: `npx shadcn@latest init`
- Verify: `npm run dev` → localhost:3000 accessible

#### Task 1-2. Linting + Testing Setup [S]

- ESLint config: Next.js defaults + `@typescript-eslint/recommended`
- Prettier config: singleQuote, trailingComma, semi
- Vitest: install and configure `vitest.config.ts`
- Add scripts: `test`, `test:watch`, `type-check`, `format`
- Verify: `npm run lint` + `npm test` pass with dummy test

#### Task 1-3. Environment Variables + Validation [S]

- Create `.env.example`:

  ```env
  # Supabase
  NEXT_PUBLIC_SUPABASE_URL=
  NEXT_PUBLIC_SUPABASE_ANON_KEY=
  SUPABASE_SERVICE_ROLE_KEY=

  # YouTube
  YOUTUBE_API_KEY=

  # Z.ai (not used in Step 1)
  ZAI_API_KEY=
  ZAI_BASE_URL=https://api.z.ai/api/coding/paas/v4
  ZAI_MODEL=
  ```

- Create `src/lib/env.ts`: Zod-based runtime validation
  - App must fail fast if required vars are missing
  - Required for Step 1: SUPABASE vars + YOUTUBE_API_KEY
  - ZAI vars: optional in Step 1
- Ensure `.env.local` is in `.gitignore`
- Verify: Missing env var → clear error message on server start

**After Stage A:** Commit and push to main. All Stage B branches fork from here.

---

### Stage B: Parallel Development (3 independent tracks)

#### Track 1: DB/Types (branch: `feat/step1-db-schema`)

**Exclusive paths:** `src/lib/supabase/`, `src/lib/extraction/types.ts`, `supabase/`

##### Task 2-1. TypeScript Type Definitions [S]

File: `src/lib/extraction/types.ts`

```typescript
export type ExtractionStatus = 'queued' | 'processing' | 'completed' | 'failed';
export type ExtractionStage =
  | 'validating_url'
  | 'fetching_metadata'
  | 'fetching_captions'
  | 'structuring'
  | 'normalizing'
  | 'saving';

export interface VideoRecord {
  id: string;
  youtube_url: string;
  youtube_id: string;
  source_type: 'video' | 'shorts';
  title: string | null;
  thumbnail_url: string | null;
  description_text: string | null;
  caption_text: string | null;
  source_language: string | null;
  created_at: string;
}

export interface ExtractionRecord {
  id: string;
  video_id: string;
  status: ExtractionStatus;
  stage: ExtractionStage | null;
  model_name: string | null;
  extractor_version: string | null;
  raw_output_json: Record<string, unknown> | null;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}
```

##### Task 2-2. Supabase Setup + Migration [M]

File: `src/lib/supabase/client.ts`

- Install `@supabase/supabase-js`
- Server-side client using `SUPABASE_SERVICE_ROLE_KEY`
- No client-side direct Supabase access (all through API routes)

File: `supabase/migrations/001_initial_schema.sql`

```sql
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  youtube_url TEXT NOT NULL,
  youtube_id TEXT NOT NULL UNIQUE,
  source_type TEXT NOT NULL CHECK (source_type IN ('video', 'shorts')),
  title TEXT,
  thumbnail_url TEXT,
  description_text TEXT,
  caption_text TEXT,
  source_language TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_videos_youtube_id ON videos(youtube_id);

CREATE TABLE extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id),
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  stage TEXT,
  model_name TEXT,
  extractor_version TEXT,
  raw_output_json JSONB,
  error_code TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_extractions_video_id ON extractions(video_id);
CREATE INDEX idx_extractions_status ON extractions(status);
CREATE INDEX idx_extractions_video_status ON extractions(video_id, status);
```

File: `src/lib/supabase/types.ts`

- DB row types (can be auto-generated via `supabase gen types typescript`)

Verify: Tables created in Supabase Dashboard or via `supabase db push`

---

#### Track 2: YouTube Modules (branch: `feat/step1-youtube`)

**Exclusive paths:** `src/lib/youtube/`, `__tests__/lib/youtube/`

##### Task 3-1. URL Validator + Video ID Parser [S]

File: `src/lib/youtube/url-parser.ts`

Supported URL patterns:

- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtube.com/watch?v=VIDEO_ID`
- `https://m.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `https://www.youtube.com/shorts/VIDEO_ID`
- `https://youtube.com/shorts/VIDEO_ID`

Additional query params (`&t=`, `&list=`, `&si=`) must be tolerated.

Return type:

```typescript
interface ParseResult {
  isValid: boolean;
  videoId?: string;
  sourceType?: 'video' | 'shorts';
  error?: string;
}
```

YouTube video ID rules: 11 characters, alphanumeric + `-` + `_`

Tests (`__tests__/lib/youtube/url-parser.test.ts`):

- Valid cases: 6+ URL variations
- Invalid cases: empty string, other domains, incomplete URL, missing videoId
- Edge cases: extra params, http (insecure), www variations, mobile URLs

##### Task 3-2. YouTube Data API v3 Client [M]

File: `src/lib/youtube/api-client.ts`

Two main functions:

1. `fetchVideoMetadata(videoId: string)`:
   - Call YouTube Data API v3 `videos.list` with `part=snippet`
   - Extract: title, description, thumbnails, channelTitle, defaultLanguage
   - Also extract duration from `contentDetails` part (useful for filtering)
   - Return:
     ```typescript
     interface VideoMetadata {
       title: string;
       description: string;
       thumbnailUrl: string;
       channelName: string;
       language: string | null;
       durationSeconds: number | null;
     }
     ```

2. `fetchCaptions(videoId: string)`:
   - Call YouTube Data API v3 `captions.list` with `part=snippet`
   - Note: `captions.download` requires OAuth, not just API key
   - **Fallback strategy**: Use `youtube-transcript` npm package for actual caption text
   - Language priority: manual > auto-generated, Korean > English > other
   - Return:
     ```typescript
     interface CaptionResult {
       text: string;
       language: string | null;
       isAutoGenerated: boolean;
     }
     ```
   - If no captions available: return `null` (not an error, just a warning)

Error handling:

- API quota exceeded (403) → clear error message
- Video not found (404) → upstream_error
- Network timeout → retry once, then fail

Tests: fixture-based unit tests (mocked API responses) + 1 manual smoke test with real URL

##### Task 3-3. Text Cleaner Module [M]

File: `src/lib/youtube/text-cleaner.ts`

Processing rules (from 04-AI-PROCESSING-SPEC):

1. Remove timestamps (`[00:00]`, `0:00`, etc.)
2. Remove duplicate text (common in auto-captions)
3. Normalize excessive whitespace/newlines
4. Remove hashtags/links/SNS promotion text (optional)
5. Combine description + caption text

Return:

```typescript
interface CleanedText {
  combinedText: string;
  descriptionText: string;
  captionText: string | null;
  usedSources: ('title' | 'description' | 'captions')[];
}
```

Tests:

- Timestamp removal
- Duplicate detection and removal
- Whitespace normalization
- Empty/null input handling
- Combined output format

---

#### Track 3: Error/Utils (branch: `feat/step1-error-utils`)

**Exclusive paths:** `src/lib/api/`, `src/lib/extraction/errors.ts`

##### Task 4-1. Error Standardization Module [S]

File: `src/lib/api/response.ts`

```typescript
interface ApiErrorResponse {
  error: string;
  code: string;
  category: 'user_error' | 'upstream_error' | 'internal_error';
}

function errorResponse(
  code: string,
  message: string,
  status: number,
): NextResponse;
function successResponse<T>(data: T, status?: number): NextResponse;
```

File: `src/lib/extraction/errors.ts`

```typescript
enum ExtractionErrorCode {
  INVALID_URL = 'INVALID_URL',
  UNSUPPORTED_URL = 'UNSUPPORTED_URL',
  VIDEO_NOT_FOUND = 'VIDEO_NOT_FOUND',
  CAPTIONS_NOT_AVAILABLE = 'CAPTIONS_NOT_AVAILABLE',
  METADATA_FETCH_FAILED = 'METADATA_FETCH_FAILED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  EXTRACTION_TIMEOUT = 'EXTRACTION_TIMEOUT',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

// Error code → HTTP status + category mapping
// Error code → user-facing message mapping (Korean)
```

Tests: Error response format validation

**After Track 3 completes early:** Write additional tests for Track 1 or Track 2 modules.

---

### Stage C: Integration (Sequential, main branch)

**Merge all 3 branches into main first.**

##### Task 4-2. Extraction Service [L]

File: `src/lib/extraction/service.ts`

Main orchestration logic:

```typescript
async function createExtraction(
  youtubeUrl: string,
  options?: { forceReExtract?: boolean },
): Promise<ExtractionResult>;
async function getExtraction(extractionId: string): Promise<ExtractionRecord>;
```

`createExtraction` flow:

1. Parse URL → validate → extract videoId
2. Check cache: query `videos` by youtube_id → find latest completed extraction within 24h
   - If cached and not forceReExtract → return cached extractionId
   - If in-progress extraction exists → return that extractionId
3. Upsert video record in `videos` table
4. Create extraction record (status: `queued`)
5. Update stage → `fetching_metadata`
6. Fetch metadata via YouTube API v3 → update videos table
7. Update stage → `fetching_captions`
8. Fetch captions → update videos table
9. Clean/combine text
10. Update stage → `structuring` (Step 1 stops here, status remains `processing`)
    - In Step 2, LLM call happens at this stage
11. Log duration per stage

Timeout guard: AbortController with 8s timeout on entire pipeline.
On failure: update extraction status to `failed` with error_code and error_message.

##### Task 4-3. API Endpoints [M]

File: `src/app/api/extractions/route.ts`

- POST handler: parse body → call createExtraction → return 202
- Frontend debounce recommendation: 2+ seconds between submissions

File: `src/app/api/extractions/[id]/route.ts`

- GET handler: call getExtraction → return status
- 404 if extraction not found

Response formats must match `docs/05-API-CONTRACT.md`.

##### Task 5-1. GitHub Actions CI [S]

File: `.github/workflows/ci.yml`

- Trigger: push / PR
- Steps: `npm ci` → `npm run lint` → `npm run type-check` → `npm test`
- Node.js 20.x
- Env: mock values for Supabase/YouTube (tests should not hit real APIs)

---

## Folder Structure (Final)

```
recipick/
├── .env.example
├── .env.local                    (gitignored)
├── .github/workflows/ci.yml
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── vitest.config.ts
├── components.json
├── package.json
├── docs/                         (existing, unchanged)
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── api/
│   │       └── extractions/
│   │           ├── route.ts
│   │           └── [id]/
│   │               └── route.ts
│   ├── lib/
│   │   ├── env.ts
│   │   ├── api/
│   │   │   └── response.ts
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   └── types.ts
│   │   ├── youtube/
│   │   │   ├── url-parser.ts
│   │   │   ├── api-client.ts
│   │   │   └── text-cleaner.ts
│   │   └── extraction/
│   │       ├── types.ts
│   │       ├── service.ts
│   │       └── errors.ts
│   └── types/
│       └── schema.ts
└── __tests__/
    ├── lib/
    │   ├── youtube/
    │   │   ├── url-parser.test.ts
    │   │   ├── api-client.test.ts
    │   │   └── text-cleaner.test.ts
    │   └── extraction/
    │       └── service.test.ts
    └── api/
        └── extractions.test.ts
```

## Conflict Prevention Rules

| Track             | Exclusive Paths                                                 | Never Touch                             |
| ----------------- | --------------------------------------------------------------- | --------------------------------------- |
| Track 1 (DB)      | `src/lib/supabase/`, `src/lib/extraction/types.ts`, `supabase/` | `src/lib/youtube/`                      |
| Track 2 (YouTube) | `src/lib/youtube/`, `__tests__/lib/youtube/`                    | `src/lib/supabase/`                     |
| Track 3 (Errors)  | `src/lib/api/`, `src/lib/extraction/errors.ts`                  | `src/lib/youtube/`, `src/lib/supabase/` |

Shared files (`package.json`, `tsconfig.json`): Track 1 only.

## Success Criteria

- URL input → videoId parsing → metadata/caption collection → saved to Supabase videos table
- Extraction job creation and status query API working
- Error handling for unsupported/invalid URLs
- All tests passing
- TypeScript compilation with no errors
- ESLint with no errors
