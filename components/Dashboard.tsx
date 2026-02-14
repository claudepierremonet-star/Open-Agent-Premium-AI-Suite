
import React from 'react';
import { AppView } from '../types';

interface DashboardProps {
    onNavigate: (view: AppView) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
    return (
        <div className="p-6 space-y-8 pb-10">
            {/* Header */}
            <header className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-primary/20 border border-primary/30 overflow-hidden">
                        <img className="w-full h-full object-cover" src="https://picsum.photos/100/100?random=1" alt="Profile" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold leading-none">Hi, Open Agent</h1>
                        <p className="text-[10px] text-primary/70 font-semibold uppercase mt-1">Pro Plan Active</p>
                    </div>
                </div>
                <button 
                    onClick={() => onNavigate(AppView.NOTIFICATIONS)}
                    className="size-10 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 relative group hover:bg-white/10 transition-all"
                >
                    <span className="material-symbols-outlined text-white/70">notifications</span>
                    {/* Pulsating Notification Badge */}
                    <span className="absolute top-2 right-2 size-2.5 bg-red-500 rounded-full border-2 border-background-dark animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
                </button>
            </header>

            {/* CTA */}
            <button 
                onClick={() => onNavigate(AppView.CHAT)}
                className="w-full h-14 bg-primary text-white rounded-xl font-bold text-lg shadow-neon flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
            >
                <span className="material-symbols-outlined">add_circle</span>
                New Chat
            </button>

            {/* Pinned Contexts */}
            <section>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white/40 text-[11px] font-bold uppercase tracking-[0.2em]">Quick Actions</h3>
                    <span className="material-symbols-outlined text-white/20 text-sm">more_horiz</span>
                </div>
                <div className="flex gap-4 overflow-x-auto custom-scrollbar pb-2">
                    {[
                        { label: 'Audio2Video', icon: 'video_stable', view: AppView.AUDIO_TO_VIDEO },
                        { label: 'Audio2Photo', icon: 'graphic_eq', view: AppView.AUDIO_TO_PHOTO },
                        { label: 'Video AI', icon: 'movie_filter', view: AppView.VIDEO_GEN },
                        { label: 'Photo AI', icon: 'photo_library', view: AppView.IMAGE_GEN },
                        { label: 'Code', icon: 'code', view: AppView.CHAT }
                    ].map((ctx) => (
                        <div key={ctx.label} className="flex flex-col items-center gap-2 shrink-0">
                            <div 
                                onClick={() => onNavigate(ctx.view)}
                                className="size-14 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center group hover:border-primary/50 transition-colors cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-[28px] text-primary/80 group-hover:text-primary">
                                    {ctx.icon}
                                </span>
                            </div>
                            <span className="text-[10px] text-white/60 font-medium">{ctx.label}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* Recent Chats (including Pinned ones) */}
            <section>
                <h3 className="text-white/40 text-[11px] font-bold uppercase tracking-[0.2em] mb-4">Chat History</h3>
                <div className="space-y-3">
                    {[
                        { title: 'React Component Opt...', desc: 'Can you refactor this hook...', time: '2m ago', icon: 'terminal', color: 'text-primary', isPinned: true },
                        { title: 'Marketing Copy - V2', desc: 'Here is a revised version...', time: '1h ago', icon: 'description', color: 'text-emerald-400', isPinned: false },
                        { title: 'Q3 Revenue Breakdown', desc: 'Based on the uploaded CSV...', time: 'Yesterday', icon: 'query_stats', color: 'text-amber-400', isPinned: false }
                    ].map((chat, idx) => (
                        <div 
                            key={idx}
                            onClick={() => onNavigate(AppView.CHAT)}
                            className={`p-4 rounded-xl border flex gap-4 cursor-pointer transition-all ${chat.isPinned ? 'bg-primary/5 border-primary/20 shadow-sm' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                        >
                            <div className={`size-10 rounded-full flex items-center justify-center shrink-0 bg-white/5 ${chat.color} relative`}>
                                <span className="material-symbols-outlined">{chat.icon}</span>
                                {chat.isPinned && (
                                    <div className="absolute -top-1 -right-1 size-4 bg-primary rounded-full flex items-center justify-center border-2 border-background-dark">
                                        <span className="material-symbols-outlined text-[8px] text-white fill-1">push_pin</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-1">
                                    <h4 className="text-sm font-semibold truncate flex items-center gap-1.5">
                                        {chat.title}
                                    </h4>
                                    <span className="text-[10px] text-white/30">{chat.time}</span>
                                </div>
                                <p className="text-xs text-white/40 truncate">{chat.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
};
