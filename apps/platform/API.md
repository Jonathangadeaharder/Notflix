# Notflix API Documentation

This document describes the REST API endpoints available in the Notflix platform.

## Authentication

All authenticated endpoints require a valid session. Session is managed via `better-auth`.

### Headers

- `Cookie`: Session cookie set by `/api/auth/*` endpoints

---

## Endpoints

### Health Check

#### `GET /api/health`

Check API and database health status.

**Authentication:** None required

**Response:**

```json
{
  "status": "ok",
  "services": {
    "database": "connected"
  }
}
```

**Status Codes:**

- `200`: Healthy
- `503`: Service unavailable (database unreachable)

---

### Videos

#### `GET /api/videos`

List all videos (with processing status).

**Authentication:** Required

**Response:**

```json
{
  "videos": [
    {
      "id": "uuid",
      "title": "Video Title",
      "filePath": "/path/to/video.mp4",
      "thumbnailPath": "/path/to/thumb.jpg",
      "status": "COMPLETED" | "PENDING" | "ERROR" | null
    }
  ]
}
```

---

#### `POST /api/videos`

Upload a new video.

**Authentication:** Required

**Request:** `multipart/form-data`

- `file`: Video file (mp4, webm, mkv, mp3, wav, m4a, aac, flac, ogg)
- `title`: Video title (optional, defaults to filename)

**Response:**

```json
{
  "id": "uuid",
  "title": "Video Title"
}
```

---

#### `DELETE /api/videos/[id]`

Delete a video.

**Authentication:** Required

**Status Codes:**

- `200`: Success
- `404`: Video not found

---

### Video Processing

#### `POST /api/videos/[id]/process`

Start AI processing for a video.

**Authentication:** Required

**Request:**

```json
{
  "targetLang": "es",
  "nativeLang": "en"
}
```

**Response:**

```json
{
  "status": "processing"
}
```

**Rate Limit:** 5 requests/minute (AI_PROCESSING)

---

### Subtitles

#### `GET /api/videos/[id]/subtitles/[lang].vtt`

Get WebVTT subtitles for a video.

**Authentication:** None (public)

**Path Parameters:**

- `id`: Video UUID
- `lang`: Language code (e.g., "native", "translated", "bilingual")

**Response:** WebVTT file content

---

### Known Words

#### `POST /api/words/known`

Mark a word as known for the current user.

**Authentication:** Required

**Request:**

```json
{
  "lemma": "gato",
  "lang": "es"
}
```

**Response:**

```json
{
  "success": true
}
```

---

### Game

#### `GET /api/game/generate`

Generate flashcard deck for vocabulary practice.

**Authentication:** Required

**Query Parameters:**

- `videoId`: Video UUID
- `start`: Start time (seconds)
- `end`: End time (seconds)
- `targetLang`: Target language code

**Response:**

```json
{
  "cards": [
    {
      "lemma": "gato",
      "lang": "es",
      "original": "gato",
      "contextSentence": "El gato está en la mesa.",
      "cefr": "A1",
      "translation": "cat",
      "isKnown": false
    }
  ],
  "nextChunkStart": 120
}
```

---

### Media

#### `GET /media/[...file]`

Serve uploaded media files.

**Authentication:** None (public)

**Response:** Media file (video/audio)

---

## Rate Limits

Different endpoints have different rate limits:

| Category      | Window | Max Requests |
| ------------- | ------ | ------------ |
| AUTH          | 15 min | 10           |
| API           | 1 min  | 60           |
| AI_PROCESSING | 1 min  | 5            |
| UPLOAD        | 1 hour | 10           |

Rate limit headers:

- `X-RateLimit-Remaining`: Requests remaining in window
- `X-RateLimit-Reset`: Unix timestamp when window resets
- `Retry-After`: Seconds until retry allowed (on 429)

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message"
}
```

### Common Status Codes

- `400`: Bad Request (invalid input)
- `401`: Unauthorized (not logged in)
- `403`: Forbidden (no permission)
- `404`: Not Found
- `422`: Unprocessable Entity (validation failed)
- `429`: Too Many Requests (rate limited)
- `500`: Internal Server Error
