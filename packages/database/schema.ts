import {
  pgTable,
  text,
  timestamp,
  boolean,
  uuid,
  integer,
  pgEnum,
  primaryKey,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { type InferSelectModel, type InferInsertModel } from "drizzle-orm";

// --- AUTHENTICATION (Better Auth Standard) ---
export const user = pgTable("user", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  image: text("image"),
  nativeLang: text("native_lang").default("en"),
  targetLang: text("target_lang").default("es"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  gameIntervalMinutes: integer("game_interval_minutes").default(10), // Game & Watch specific
});

export type User = InferSelectModel<typeof user>;
export type NewUser = InferInsertModel<typeof user>;

export const session = pgTable("session", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => user.id)
    .notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
});

export const account = pgTable("account", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: uuid("user_id")
    .references(() => user.id)
    .notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  expiresAt: timestamp("expires_at"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: uuid("id").primaryKey().defaultRandom(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// --- BUSINESS DATA ---
export const video = pgTable("video", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  filePath: text("file_path").notNull(), // Shared local media path
  thumbnailPath: text("thumbnail_path"),
  duration: integer("duration"), // Seconds
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  views: integer("views").default(0).notNull(),
  published: boolean("published").default(false).notNull(),
});

export type Video = InferSelectModel<typeof video>;
export type NewVideo = InferInsertModel<typeof video>;

// --- TYPES ---
export type DbTokenAnalysis = {
  text: string;
  lemma: string;
  pos: string;
  is_stop: boolean;
  whitespace?: string;
  translation?: string;
  isKnown?: boolean;
};

export type DbVttSegment = {
  start: number;
  end: number;
  text: string;
  tokens: DbTokenAnalysis[];
  classification?: string;
  translation?: string;
};

export const videoProcessing = pgTable(
  "video_processing",
  {
    videoId: uuid("video_id")
      .references(() => video.id)
      .notNull(), // Fixed reference to singular 'video' table
    targetLang: text("target_lang").notNull(), // "es"
    status: text("status").notNull(), // "PENDING", "COMPLETED", "ERROR"
    progressStage: text("progress_stage").default("QUEUED"),
    progressPercent: integer("progress_percent").default(0).notNull(),
    vttJson: jsonb("vtt_json").$type<DbVttSegment[]>(), // The full subtitles with timestamps
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.videoId, table.targetLang] }),
    };
  },
);

export type VideoProcessing = InferSelectModel<typeof videoProcessing>;
export type NewVideoProcessing = InferInsertModel<typeof videoProcessing>;

export const watchProgress = pgTable(
  "watch_progress",
  {
    userId: uuid("user_id")
      .references(() => user.id)
      .notNull(),
    videoId: uuid("video_id")
      .references(() => video.id)
      .notNull(),
    currentTime: integer("current_time").default(0).notNull(),
    duration: integer("duration").default(0).notNull(),
    progressPercent: integer("progress_percent").default(0).notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.userId, table.videoId] }),
    };
  },
);

export type WatchProgress = InferSelectModel<typeof watchProgress>;
export type NewWatchProgress = InferInsertModel<typeof watchProgress>;

export const videoLemmas = pgTable(
  "video_lemmas",
  {
    videoId: uuid("video_id")
      .references(() => video.id)
      .notNull(),
    lemma: text("lemma").notNull(),
    count: integer("count").notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.videoId, table.lemma] }),
      lemmaIdx: index("video_lemmas_lemma_idx").on(table.lemma),
    };
  },
);

export type VideoLemma = InferSelectModel<typeof videoLemmas>;
export type NewVideoLemma = InferInsertModel<typeof videoLemmas>;

export const vocabLevels = pgEnum("vocab_level", [
  "A1",
  "A2",
  "B1",
  "B2",
  "C1",
  "C2",
]);

export const knownWords = pgTable(
  "known_words",
  {
    userId: uuid("user_id")
      .references(() => user.id)
      .notNull(),
    lemma: text("lemma").notNull(), // The dictionary form
    lang: text("lang").notNull(), // e.g., "es"
    level: vocabLevels("level"), // Source (CSV or Custom)
    isProperNoun: boolean("is_proper").default(false), // Names/Places ignored
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.userId, table.lemma, table.lang] }),
    };
  },
);

export type KnownWord = InferSelectModel<typeof knownWords>;
export type NewKnownWord = InferInsertModel<typeof knownWords>;

export const vocabReference = pgTable(
  "vocab_reference",
  {
    lemma: text("lemma").notNull(),
    lang: text("lang").notNull(),
    level: vocabLevels("level"),
    isProperNoun: boolean("is_proper").default(false),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.lemma, table.lang] }),
  }),
);

export type VocabReference = InferSelectModel<typeof vocabReference>;
export type NewVocabReference = InferInsertModel<typeof vocabReference>;
