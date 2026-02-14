
import React from 'react';
import { AppView } from './types';

export const NAV_ITEMS = [
    { view: AppView.DASHBOARD, icon: 'grid_view', label: 'Dash' },
    { view: AppView.WRITING, icon: 'edit_note', label: 'Write' },
    { view: AppView.AR_HISTORY, icon: 'auto_stories', label: 'AR Log' },
    { view: AppView.PERSONA, icon: 'psychology', label: 'Persona' },
    { view: AppView.CHAT, icon: 'chat', label: 'Chat' },
    { view: AppView.VISION, icon: 'center_focus_strong', label: 'Vision' }
];

export interface AIModel {
    id: string;
    name: string;
    icon: string;
    color: string;
    bgColor: string;
    description: string;
    searchEnabled: boolean;
    type: 'chat' | 'image' | 'video';
}

export const MODELS: AIModel[] = [
    // Chat Models
    { 
        id: 'gemini', 
        name: 'Gemini 3 Pro', 
        icon: 'auto_awesome', 
        color: 'text-primary', 
        bgColor: 'bg-primary/10',
        description: 'Default high-performance Google AI.',
        searchEnabled: true,
        type: 'chat'
    },
    { 
        id: 'chatgpt', 
        name: 'GPT-4o', 
        icon: 'bolt', 
        color: 'text-emerald-400', 
        bgColor: 'bg-emerald-400/10',
        description: 'OpenAI classic logic and reasoning.',
        searchEnabled: false,
        type: 'chat'
    },
    { 
        id: 'grok', 
        name: 'Grok-2', 
        icon: 'alternate_email', 
        color: 'text-white', 
        bgColor: 'bg-white/10',
        description: 'Direct, witty, and real-time knowledge.',
        searchEnabled: true,
        type: 'chat'
    },
    // Image Models (Nano Banana etc)
    { 
        id: 'nano-banana', 
        name: 'Nano Banana', 
        icon: 'image', 
        color: 'text-yellow-400', 
        bgColor: 'bg-yellow-400/10',
        description: 'Ultra-fast Gemini Flash Image generation.',
        searchEnabled: false,
        type: 'image'
    },
    { 
        id: 'flux', 
        name: 'Flux.1', 
        icon: 'brush', 
        color: 'text-purple-400', 
        bgColor: 'bg-purple-400/10',
        description: 'High-detail professional aesthetic.',
        searchEnabled: false,
        type: 'image'
    },
    // Video Models
    { 
        id: 'veo-3', 
        name: 'Veo 3.1', 
        icon: 'movie', 
        color: 'text-blue-400', 
        bgColor: 'bg-blue-400/10',
        description: 'Cinematic temporal consistency.',
        searchEnabled: false,
        type: 'video'
    },
    { 
        id: 'kling', 
        name: 'Kling AI', 
        icon: 'animation', 
        color: 'text-rose-400', 
        bgColor: 'bg-rose-400/10',
        description: 'Hyper-realistic video motion.',
        searchEnabled: false,
        type: 'video'
    },
    { 
        id: 'ltx2', 
        name: 'LTX-2', 
        icon: 'dynamic_feed', 
        color: 'text-cyan-400', 
        bgColor: 'bg-cyan-400/10',
        description: 'High-speed generative video sequences.',
        searchEnabled: false,
        type: 'video'
    },
    { 
        id: 'heygen', 
        name: 'Heygen', 
        icon: 'face', 
        color: 'text-indigo-400', 
        bgColor: 'bg-indigo-400/10',
        description: 'Avatar-focused cinematic talking heads.',
        searchEnabled: false,
        type: 'video'
    }
];
