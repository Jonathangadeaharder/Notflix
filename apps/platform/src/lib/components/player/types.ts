export interface WordData {
    text: string;
    difficulty: "easy" | "learning" | "hard";
    lemma?: string;
    translation?: string;
    breakdown?: string;
}

export type SubtitleMode = "OFF" | "FILTERED" | "DUAL" | "ORIGINAL";

export interface Subtitle {
    start: number;
    end: number;
    text: string;
    translation: string;
    words?: WordData[];
}

export interface PlayerVideo {
    id: string;
    title: string;
    filePath: string;
    thumbnailPath?: string;
    targetLang?: string;
    videoProgress?: number; // Optional initial progress
}

export interface PlayerSettings {
    gameInterval: number;
    userLevel?: string;
}
