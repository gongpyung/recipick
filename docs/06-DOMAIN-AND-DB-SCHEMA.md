# 06. Domain and DB Schema

## 도메인 개요
### 핵심 엔터티
- Video
- Extraction
- Recipe
- Ingredient
- Step
- Warning

---

## 엔터티 관계
- 하나의 `Video`는 여러 `Extraction`을 가질 수 있다.
- 하나의 `Extraction`은 하나의 `Recipe`를 생성한다.
- 하나의 `Recipe`는 여러 `Ingredient`, `Step`, `Warning`을 가진다.

---

## 권장 테이블
### videos
- `id`
- `youtube_url`
- `youtube_id`
- `source_type` (`video` | `shorts`)
- `title`
- `thumbnail_url`
- `description_text`
- `caption_text`
- `source_language`
- `created_at`

### extractions
- `id`
- `video_id`
- `status`
- `stage`
- `model_name`
- `extractor_version`
- `raw_output_json`
- `error_code`
- `error_message`
- `created_at`
- `updated_at`

### recipes
- `id`
- `video_id`
- `extraction_id`
- `title`
- `summary`
- `base_servings`
- `confidence`
- `is_user_edited`
- `created_at`
- `updated_at`

### ingredients
- `id`
- `recipe_id`
- `sort_order`
- `name`
- `amount_value`
- `amount_text`
- `unit`
- `scalable`
- `note`
- `confidence`

### steps
- `id`
- `recipe_id`
- `step_no`
- `text`
- `note`
- `confidence`

### warnings
- `id`
- `recipe_id`
- `code`
- `message`
- `severity`

---

## 권장 인덱스
- `videos.youtube_id` unique
- `extractions.video_id`
- `recipes.video_id`
- `ingredients.recipe_id`
- `steps.recipe_id`
- `warnings.recipe_id`

---

## 중복 처리 규칙
### 권고안
같은 `youtube_id`가 다시 들어오면:
- 기본은 **가장 최근 recipe 재사용**
- 사용자가 `다시 추출`을 요청하면 새 extraction 생성

이유:
- 비용 절감
- 같은 영상 반복 처리 방지
- 사용자가 이미 수정한 결과 재사용 가능

---

## 저장 전략
### Phase 1
- localStorage + 서버 없는 저장도 가능
- 단, 도메인 모델은 DB 확장 가능하게 유지

### Phase 2
- Postgres / Supabase 등으로 확장
- 최근 결과, 수정본, 재추출 이력 관리

---

## 데이터 설계 메모
- `raw_output_json`은 반드시 남기는 쪽이 좋다.
- 디버깅, 품질 개선, prompt 개선에 매우 중요하다.
- `is_user_edited`는 MVP에서도 유용하다.

---

## SQL 예시 (개략)
```sql
create table recipes (
  id text primary key,
  video_id text not null,
  extraction_id text not null,
  title text not null,
  summary text,
  base_servings numeric,
  confidence text not null,
  is_user_edited boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```
