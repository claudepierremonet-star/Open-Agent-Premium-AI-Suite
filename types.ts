
export enum AppView {
    DASHBOARD = 'DASHBOARD',
    HISTORY = 'HISTORY',
    AR_HISTORY = 'AR_HISTORY',
    PERSONA = 'PERSONA',
    CHAT = 'CHAT',
    VISION = 'VISION',
    WRITING = 'WRITING',
    ANALYSIS = 'ANALYSIS',
    IMAGE_GEN = 'IMAGE_GEN',
    VIDEO_GEN = 'VIDEO_GEN',
    AUDIO_TO_PHOTO = 'AUDIO_TO_PHOTO',
    AUDIO_TO_VIDEO = 'AUDIO_TO_VIDEO',
    NOTIFICATIONS = 'NOTIFICATIONS',
    CANVA = 'CANVA'
}

export interface NewsItem {
    category: 'Economy' | 'Crypto' | 'Stocks' | 'AI' | 'Global' | 'Tech';
    title: string;
    summary: string;
    trend: 'up' | 'down' | 'neutral' | 'urgent';
    timestamp: string;
    url?: string;
}

export interface ChatThread {
    id: string;
    title: string;
    lastMessage: string;
    timestamp: string;
    isPinned: boolean;
    modelId: string;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    model?: string;
    attachments?: string[];
}

export interface TranslationItem {
    id: string;
    from: string;
    to: string;
    fromText: string;
    toText: string;
    timestamp: string;
    starred: boolean;
    image?: string;
}

export interface ARHistoryItem {
    id: string;
    original: string;
    translated: string;
    lang: string;
    timestamp: string;
    image?: string; // Vignette du contexte visuel
    location?: {
        lat: number;
        lng: number;
        address?: string;
    };
}

export interface ObjectIDItem {
    id: string;
    name: string;
    description: string;
    facts: string[];
    timestamp: string;
    image?: string;
}

export interface PersonaState {
    tone: 'professional' | 'casual' | 'creative';
    responseLength: number;
    creativity: number;
    activeLearning: boolean;
}
