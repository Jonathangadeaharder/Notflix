# Design Document: Immersion Language Platform

## Overview

The Immersion Language Platform is a sophisticated language learning system that combines video entertainment with targeted vocabulary acquisition. The system uses a microservices architecture with a SvelteKit frontend orchestrator and Python-based AI services for natural language processing.

The core innovation is the "Smart Filter" algorithm that analyzes video content to identify vocabulary gaps specific to each user, providing translations only for unknown words while maintaining immersion in the target language.

## Architecture

### High-Level Architecture

The system follows a local-first, polyglot architecture with clear separation of concerns:

```
                    ┌─────────────────────────────────────────┐
                    │            SvelteKit Frontend           │
                    │            Orchestrator                 │
                    └─────────────┬───────────────────────────┘
                                  │
                    ┌─────────────▼───────────────────────────┐
                    │           Better Auth                   │
                    │      Authentication Layer               │
                    └─────────────┬───────────────────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Python AI     │    │   PostgreSQL    │    │   Video Player  │
│   Services      │◄──►│   Database      │◄──►│   + Game UI     │
│   (Brain)       │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   NLP Pipeline  │    │  Authentication │    │   Game Overlay  │
│   • Whisper     │    │  • Users        │    │   • Vocabulary  │
│   • Spacy       │    │  • Sessions     │    │   • Progress    │
│   • Translation │    │  • Accounts     │    │   • Learning    │
└─────────────────┘    │  • Vocabulary   │    └─────────────────┘
                       │  • Videos       │
                       │  • Processing   │
                       └─────────────────┘

Data Flow:
1. User authenticates via Better Auth → Session stored in PostgreSQL
2. SvelteKit validates session → Loads user profile & vocabulary
3. Video processing → Python AI services → Results cached in PostgreSQL
4. Game interactions → Vocabulary updates → PostgreSQL via authenticated session
5. All user-specific data tied to authenticated user ID
```

### Component Responsibilities

- **SvelteKit Orchestrator**: 
  - User interface and routing
  - Video playback coordination
  - Game session management
  - API orchestration between services
  - Session validation and user context

- **Better Auth Authentication Layer**:
  - User registration and login
  - Session management and validation
  - Password reset and email verification
  - Account linking and profile management
  - Security token handling

- **Python AI Services (Brain)**:
  - Speech recognition (Whisper)
  - Natural language processing (Spacy)
  - Lemmatization and POS tagging
  - Translation services
  - Content analysis and filtering

- **PostgreSQL Database**:
  - **Authentication Tables**: Users, sessions, accounts, verification
  - **Learning Data**: User vocabulary knowledge, CEFR levels
  - **Content Data**: Videos, processing cache, transcriptions
  - **Relationships**: All user data linked via authenticated user IDs

## Components and Interfaces

### Frontend Components (SvelteKit)

#### Authentication Components
- **Login/Register Forms**: Email-based authentication with validation
- **Profile Management**: User settings for languages and game preferences
- **Session Handling**: Automatic session refresh and logout functionality
- **Protected Routes**: Route guards for authenticated-only content

#### Video Player Component
- Handles video playback with subtitle overlay
- Integrates with game overlay for spaced repetition
- Manages playback state and user interactions
- Displays selective translations based on user knowledge
- Requires authenticated user session for personalized content

#### Game Overlay Component
- Presents vocabulary cards during configured intervals
- Handles swipe gestures for known/unknown word classification
- Updates user vocabulary knowledge in real-time
- Manages game session flow and video resumption
- Associates progress with authenticated user profile

#### Chunking Engine (`src/lib/server/game/chunker.ts`)
- Generates vocabulary decks for specific time ranges
- Prioritizes words by CEFR level (A1 → C2)
- Filters segments based on user knowledge gaps
- Limits deck size to 15 words for optimal learning
- Requires user authentication to access personalized vocabulary data

### Backend Services

#### Authentication Service (Better Auth)
The system uses Better Auth for comprehensive authentication management:

- **User Registration/Login**: Email-based authentication with verification
- **Session Management**: Secure session handling with token-based authentication
- **Account Linking**: Support for multiple authentication providers
- **Profile Management**: User preferences and language settings

#### Brain Service (Python)
Located in `services/brain/`, this service provides:

- **Transcription Service**: Uses Whisper for speech-to-text conversion
- **Filter Service**: Uses Spacy for lemmatization and POS tagging
- **Translation Service**: Provides just-in-time translation for unknown vocabulary

#### API Contracts
The system uses gRPC/Protobuf for service communication:

```protobuf
service FilterService {
  rpc Analyze(AnalyzeRequest) returns (AnalyzeResponse);
}

message AnalyzeRequest {
  string text = 1;
  string target_lang = 2;
}

message AnalyzeResponse {
  repeated WordAnalysis words = 1;
}

message WordAnalysis {
  string original = 1;
  string lemma = 2;
  string pos_tag = 3;
  bool is_content_word = 4;
}
```

## Data Models

### Authentication Schema (Better Auth)
```typescript
export const user = pgTable("user", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull(),
    image: text("image"),
    nativeLang: text("native_lang").default("en"),
    targetLang: text("target_lang").default("es"),
    gameIntervalMinutes: integer("game_interval_minutes").default(10),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
});

export const session = pgTable("session", {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => user.id).notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
});

export const account = pgTable("account", {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id").references(() => user.id).notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    expiresAt: timestamp("expires_at"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
});
```

### Vocabulary Knowledge
```typescript
export const knownWords = pgTable("known_words", {
    userId: text("user_id").references(() => user.id).notNull(),
    lemma: text("lemma").notNull(),
    lang: text("lang").notNull(),
    level: vocabLevels("level"), // A1-C2
    isProperNoun: boolean("is_proper").default(false),
});
```

### Video Processing Cache
```typescript
export const videoProcessing = pgTable("video_processing", {
    videoId: uuid("video_id").references(() => video.id),
    targetLang: text("target_lang").notNull(),
    status: text("status").notNull(), // "PENDING", "COMPLETED", "ERROR"
    vttJson: jsonb("vtt_json"), // Processed subtitles with analysis
});
```

### Smart Filter Algorithm

The core algorithm operates in three phases:

#### Phase 1: Content Ingestion
1. Check if video processing exists for target language
2. If not, transcribe audio using Whisper to generate VTT subtitles
3. Cache results in `videoProcessing` table

#### Phase 2: Gap Analysis
1. Send subtitle segments to Filter Service for linguistic analysis
2. Extract content words (NOUN, VERB, ADJ) and their lemmas
3. Query user's `knownWords` to identify vocabulary gaps
4. Classify segments:
   - **Consumed**: Contains only known words (skip translation)
   - **Learning Material**: Contains ≥1 unknown word (provide translations)

#### Phase 3: Just-in-Time Translation
1. Collect unknown lemmas from learning material segments
2. Request translations from Translation Service
3. Present in game overlay with surrounding context

### Game & Watch Integration

The spaced repetition system integrates seamlessly with video playback:

1. **Trigger**: Video reaches configured interval (default: 10 minutes)
2. **Pause**: Video playback pauses automatically
3. **Game**: Fullscreen overlay presents vocabulary deck
4. **Interaction**: User swipes cards (right=known, left=unknown)
5. **Update**: System updates vocabulary knowledge immediately
6. **Resume**: Video continues automatically after game completion

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, several properties can be consolidated to eliminate redundancy:

- Properties 1.1, 1.2, 1.3, and 1.4 all relate to the core vocabulary analysis and can be combined into comprehensive properties about unknown word identification and translation
- Properties 2.1, 2.2, and 2.3 all relate to vocabulary knowledge updates and can be consolidated
- Properties 4.2, 4.3, and 4.4 all relate to NLP processing and can be combined into properties about linguistic analysis accuracy

### Core Properties

**Property 1: Unknown word identification accuracy**
*For any* video content and user vocabulary profile, the system should correctly identify which words in the content are unknown to the user based on their current knowledge base
**Validates: Requirements 1.1, 1.4, 2.3**

**Property 2: Selective translation consistency**
*For any* subtitle segment, only words marked as unknown should receive translations while known words remain in the target language
**Validates: Requirements 1.2**

**Property 3: Learning material classification**
*For any* video segment, if it contains only known words it should be classified as consumed (no translations), and if it contains any unknown words it should be classified as learning material (with translations)
**Validates: Requirements 1.3, 1.4**

**Property 4: Lemma-level consistency**
*For any* word and its inflected forms, all forms should map to the same lemma for consistent knowledge tracking
**Validates: Requirements 1.5, 4.4**

**Property 5: Vocabulary knowledge persistence**
*For any* user vocabulary update (marking words as known or unknown), the change should be immediately reflected in the database and subsequent analysis
**Validates: Requirements 2.1, 2.2, 2.3**

**Property 6: CEFR level association**
*For any* vocabulary item stored in the system, it should be correctly associated with its appropriate CEFR level (A1-C2)
**Validates: Requirements 2.4**

**Property 7: Proper noun exclusion**
*For any* text containing proper nouns, those proper nouns should be excluded from vocabulary learning materials
**Validates: Requirements 2.5**

**Property 8: Game timing accuracy**
*For any* configured game interval, the vocabulary game should trigger at the correct time points during video playback
**Validates: Requirements 3.1**

**Property 9: Deck generation constraints**
*For any* time segment, the generated vocabulary deck should contain at most 15 words prioritized by CEFR level (A1 → C2)
**Validates: Requirements 3.2**

**Property 10: Game completion flow**
*For any* completed vocabulary game session, video playback should automatically resume from the correct position
**Validates: Requirements 3.3**

**Property 11: Swipe gesture handling**
*For any* vocabulary card interaction, right swipes should mark words as known and left swipes should mark words as unknown
**Validates: Requirements 3.4**

**Property 12: Empty segment skip logic**
*For any* time segment with no unknown words, the game session should be skipped and playback should continue uninterrupted
**Validates: Requirements 3.5**

**Property 13: NLP analysis completeness**
*For any* transcribed text, all words should receive part-of-speech tags and content words (nouns, verbs, adjectives) should be correctly identified and extracted
**Validates: Requirements 4.2, 4.3**

**Property 14: Language model selection**
*For any* target language, the system should load and use the appropriate linguistic models for that language
**Validates: Requirements 4.5**

**Property 15: User preference persistence**
*For any* user configuration changes (languages, game intervals), the settings should be stored and applied consistently across sessions
**Validates: Requirements 5.1, 5.2, 5.4**

**Property 16: Data integrity maintenance**
*For any* user vocabulary data, the system should maintain consistency and prevent corruption during all operations
**Validates: Requirements 5.3, 5.5**

**Property 17: Asynchronous processing**
*For any* video upload, transcription and analysis should occur in the background without blocking user interactions
**Validates: Requirements 6.1**

**Property 18: Processing cache efficiency**
*For any* completed video processing, the results should be cached and reused across multiple users accessing the same content
**Validates: Requirements 6.2, 6.3**

**Property 19: Error handling robustness**
*For any* processing failure, the system should provide clear error messages and appropriate retry mechanisms
**Validates: Requirements 6.4**

**Property 20: Authentication session integrity**
*For any* authenticated user session, all vocabulary data and learning progress should be correctly associated with that user's profile
**Validates: Requirements 2.1, 2.2, 5.3**

**Property 21: Access control enforcement**
*For any* unauthenticated request to protected resources, the system should deny access and redirect to authentication
**Validates: Requirements 5.4**

## Error Handling

### Authentication Errors
- **Invalid Credentials**: Clear error messages with password reset options
- **Session Expiry**: Automatic redirect to login with return URL preservation
- **Email Verification**: Resend verification emails with rate limiting
- **Account Conflicts**: Handle duplicate email registrations gracefully

### Video Processing Errors
- **Transcription Failures**: Retry with different audio preprocessing, fallback to manual subtitle upload
- **NLP Analysis Errors**: Log detailed error information, attempt with simplified text processing
- **Translation Service Unavailable**: Cache previous translations, provide graceful degradation

### User Interaction Errors
- **Database Connection Issues**: Queue vocabulary updates locally, sync when connection restored
- **Game State Corruption**: Reset to last known good state, preserve user progress
- **Video Playback Failures**: Provide alternative video sources, maintain learning progress
- **Unauthorized Access**: Redirect to login while preserving intended destination

### Data Integrity Safeguards
- **Vocabulary Conflicts**: Use timestamp-based conflict resolution for concurrent updates
- **Profile Corruption**: Maintain backup snapshots, provide profile recovery mechanisms
- **Cache Invalidation**: Implement cache versioning to handle schema changes
- **Session Security**: Implement proper CSRF protection and secure cookie handling

## Testing Strategy

### Dual Testing Approach

The system requires both unit testing and property-based testing to ensure comprehensive coverage:

- **Unit tests** verify specific examples, edge cases, and integration points
- **Property tests** verify universal properties across all valid inputs
- Together they provide complete coverage: unit tests catch concrete bugs, property tests verify general correctness

### Property-Based Testing Framework

We will use **fast-check** for JavaScript/TypeScript property-based testing, configured to run a minimum of 100 iterations per property test.

Each property-based test must be tagged with a comment explicitly referencing the correctness property using this format: `**Feature: immersion-language-platform, Property {number}: {property_text}**`

### Unit Testing Strategy

Unit tests will focus on:
- Specific examples demonstrating correct behavior for each component
- Edge cases like empty inputs, boundary values, and error conditions
- Integration points between the SvelteKit orchestrator and Python services
- User interface interactions and state management

### Test Coverage Areas

1. **Smart Filter Algorithm**: Property tests for vocabulary gap analysis across diverse content
2. **Chunking Engine**: Unit tests for deck generation logic and CEFR prioritization
3. **Game Integration**: Property tests for timing accuracy and state transitions
4. **NLP Pipeline**: Property tests for lemmatization and POS tagging consistency
5. **Data Persistence**: Property tests for vocabulary knowledge updates and retrieval
6. **Error Recovery**: Unit tests for failure scenarios and graceful degradation

### Testing Infrastructure

- **Test Data Generation**: Smart generators that create realistic video content, user profiles, and vocabulary sets
- **Mock Services**: Lightweight mocks for Python AI services during unit testing
- **Integration Testing**: End-to-end tests using real AI services in controlled environments
- **Performance Testing**: Load testing for concurrent users and large video processing queues