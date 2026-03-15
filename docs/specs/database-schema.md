# Database Schema Reference

**Source:** `packages/database/schema.ts`
**ORM:** Drizzle (PostgreSQL)

This document is normative for persistent data shape and stored field semantics.

---

## Authentication Tables

### `user`

| Column               | Type        | Constraints                     | Default         |
| :------------------- | :---------- | :------------------------------ | :-------------- |
| `id`                 | `uuid`      | **PK**, auto-generated          | `defaultRandom()` |
| `name`               | `text`      | NOT NULL                        |                 |
| `email`              | `text`      | NOT NULL, UNIQUE                |                 |
| `email_verified`     | `boolean`   | NOT NULL                        |                 |
| `image`              | `text`      | nullable                        |                 |
| `native_lang`        | `text`      |                                 | `"en"`          |
| `target_lang`        | `text`      |                                 | `"es"`          |
| `created_at`         | `timestamp` | NOT NULL                        |                 |
| `updated_at`         | `timestamp` | NOT NULL                        |                 |
| `game_interval_minutes` | `integer` |                                | `10`            |

**Exported types:** `User` (select), `NewUser` (insert)

### `session`

| Column       | Type        | Constraints                          | Default         |
| :----------- | :---------- | :----------------------------------- | :-------------- |
| `id`         | `uuid`      | **PK**, auto-generated               | `defaultRandom()` |
| `user_id`    | `uuid`      | NOT NULL, **FK** -> `user.id`        |                 |
| `expires_at` | `timestamp` | NOT NULL                             |                 |
| `token`      | `text`      | NOT NULL, UNIQUE                     |                 |
| `created_at` | `timestamp` | NOT NULL                             |                 |
| `updated_at` | `timestamp` | NOT NULL                             |                 |
| `ip_address` | `text`      | nullable                             |                 |
| `user_agent` | `text`      | nullable                             |                 |

### `account`

| Column        | Type        | Constraints                          | Default         |
| :------------ | :---------- | :----------------------------------- | :-------------- |
| `id`          | `uuid`      | **PK**, auto-generated               | `defaultRandom()` |
| `account_id`  | `text`      | NOT NULL                             |                 |
| `provider_id` | `text`      | NOT NULL                             |                 |
| `user_id`     | `uuid`      | NOT NULL, **FK** -> `user.id`        |                 |
| `access_token`| `text`      | nullable                             |                 |
| `refresh_token`| `text`     | nullable                             |                 |
| `id_token`    | `text`      | nullable                             |                 |
| `expires_at`  | `timestamp` | nullable                             |                 |
| `password`    | `text`      | nullable                             |                 |
| `created_at`  | `timestamp` | NOT NULL                             |                 |
| `updated_at`  | `timestamp` | NOT NULL                             |                 |

### `verification`

| Column       | Type        | Constraints            | Default         |
| :----------- | :---------- | :--------------------- | :-------------- |
| `id`         | `uuid`      | **PK**, auto-generated | `defaultRandom()` |
| `identifier` | `text`      | NOT NULL               |                 |
| `value`      | `text`      | NOT NULL               |                 |
| `expires_at` | `timestamp` | NOT NULL               |                 |
| `created_at` | `timestamp` | nullable               |                 |
| `updated_at` | `timestamp` | nullable               |                 |

---

## Business Data Tables

### `video`

| Column          | Type        | Constraints            | Default          |
| :-------------- | :---------- | :--------------------- | :--------------- |
| `id`            | `uuid`      | **PK**, auto-generated | `defaultRandom()` |
| `title`         | `text`      | NOT NULL               |                  |
| `file_path`     | `text`      | NOT NULL               |                  |
| `thumbnail_path`| `text`      | nullable               |                  |
| `duration`      | `integer`   | nullable (seconds)     |                  |
| `created_at`    | `timestamp` | NOT NULL               | `now()`          |
| `updated_at`    | `timestamp` | NOT NULL               | `now()`          |
| `views`         | `integer`   | NOT NULL               | `0`              |
| `published`     | `boolean`   | NOT NULL               | `false`          |

**Stored path contract:**

- `file_path` stores the shared-media path used by the platform
- `thumbnail_path` stores the generated thumbnail path under the same shared media root
- Callers should treat these values as shared-media paths, not opaque external object-store keys

**Exported types:** `Video` (select), `NewVideo` (insert)

### `video_processing`

| Column            | Type        | Constraints                                | Default   |
| :---------------- | :---------- | :----------------------------------------- | :-------- |
| `video_id`        | `uuid`      | NOT NULL, **FK** -> `video.id`             |           |
| `target_lang`     | `text`      | NOT NULL                                   |           |
| `status`          | `text`      | NOT NULL (`PENDING`, `COMPLETED`, `ERROR`) |           |
| `progress_stage`  | `text`      | nullable                                   | `QUEUED`  |
| `progress_percent`| `integer`   | NOT NULL                                   | `0`       |
| `vtt_json`        | `jsonb`     | nullable, typed as `DbVttSegment[]`        |           |
| `created_at`      | `timestamp` | nullable                                   | `now()`   |

**Primary Key:** Composite (`video_id`, `target_lang`)

**Canonical semantics:**

- `status` is the coarse lifecycle field and may be `PENDING`, `COMPLETED`, or `ERROR`
- `progress_stage` is the finer-grained UI-facing stage; canonical values are defined in `docs/specs/processing-progress.md`
- `progress_percent` is an integer `0..100`
- Reprocessing resets the row for the same `(video_id, target_lang)` pair instead of creating a second active row

**Exported types:** `VideoProcessing` (select), `NewVideoProcessing` (insert)

### `watch_progress`

| Column            | Type        | Constraints                    | Default |
| :---------------- | :---------- | :----------------------------- | :------ |
| `user_id`         | `uuid`      | NOT NULL, **FK** -> `user.id`  |         |
| `video_id`        | `uuid`      | NOT NULL, **FK** -> `video.id` |         |
| `current_time`    | `integer`   | NOT NULL                       | `0`     |
| `duration`        | `integer`   | NOT NULL                       | `0`     |
| `progress_percent`| `integer`   | NOT NULL                       | `0`     |
| `updated_at`      | `timestamp` | NOT NULL                       | `now()` |

**Primary Key:** Composite (`user_id`, `video_id`)

**Canonical semantics:**

- Stores authenticated-user playback progress for a specific video
- `current_time` and `duration` are rounded whole-second values
- `progress_percent` stores the rounded, clamped watch completion percentage in the `0..100` range
- The watch route uses this row to resume playback and the dashboard uses it to derive Continue Watching state

**Exported types:** `WatchProgress` (select), `NewWatchProgress` (insert)

### `video_lemmas`

| Column    | Type      | Constraints                    |
| :-------- | :-------- | :----------------------------- |
| `video_id`| `uuid`   | NOT NULL, **FK** -> `video.id` |
| `lemma`   | `text`   | NOT NULL                       |
| `count`   | `integer`| NOT NULL                       |

**Primary Key:** Composite (`video_id`, `lemma`)
**Indexes:** `video_lemmas_lemma_idx` on `lemma`

The processing pipeline refreshes this table on save so the dashboard and future analytics can query per-video lemma frequency without re-reading `vtt_json`.

**Exported types:** `VideoLemma` (select), `NewVideoLemma` (insert)

### `known_words`

| Column     | Type      | Constraints                    | Default |
| :--------- | :-------- | :----------------------------- | :------ |
| `user_id`  | `uuid`   | NOT NULL, **FK** -> `user.id`  |         |
| `lemma`    | `text`   | NOT NULL                       |         |
| `lang`     | `text`   | NOT NULL (e.g., `"es"`)        |         |
| `level`    | `vocab_level` | nullable, enum              |         |
| `is_proper`| `boolean`| nullable                       | `false` |

**Primary Key:** Composite (`user_id`, `lemma`, `lang`)

**Exported types:** `KnownWord` (select), `NewKnownWord` (insert)

---

## Enum Types

### `vocab_level`

```sql
CREATE TYPE vocab_level AS ENUM ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');
```

---

## JSONB Types

### `DbVttSegment`

Stored in `video_processing.vtt_json`.

```typescript
type DbVttSegment = {
    start: number;           // Segment start time (seconds)
    end: number;             // Segment end time (seconds)
    text: string;            // Raw transcript text
    tokens: DbTokenAnalysis[];
    classification?: string; // "EASY" | "LEARNING" | "HARD"
};
```

### `DbTokenAnalysis`

Each token within a segment.

```typescript
type DbTokenAnalysis = {
    text: string;            // Surface form (e.g., "gatos")
    lemma: string;           // Dictionary form (e.g., "gato")
    pos: string;             // Part of speech (NOUN, VERB, ADJ, etc.)
    is_stop: boolean;        // Stop word flag
    whitespace?: string;     // Trailing whitespace
    translation?: string;    // Translated lemma (set during enrichment)
    isKnown?: boolean;       // Whether user knows this word (set during filtering)
};
```
