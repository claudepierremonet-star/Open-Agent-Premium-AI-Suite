
import React, { useState, useEffect } from 'react';
import { AppView } from '../types';

interface DashboardProps {
    onNavigate: (view: AppView, data?: any) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
    const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const modules = [
        { 
            label: 'Vision AR', 
            icon: 'center_focus_strong', 
            view: AppView.VISION, 
            color: 'text-primary', 
            bg: 'bg-primary/5', 
            border: 'border-primary/20'
        },
        { 
            label: 'Canva Studio', 
            icon: 'brush', 
            view: AppView.CANVA, 
            color: 'text-cyan-500', 
            bg: 'bg-cyan-50', 
            border: 'border-cyan-200'
        },
        { 
            label: 'Generative', 
            icon: 'auto_awesome_motion', 
            view: AppView.IMAGE_GEN, 
            color: 'text-purple-500', 
            bg: 'bg-purple-50', 
            border: 'border-purple-200'
        },
        { 
            label: 'Intelligence', 
            icon: 'analytics', 
            view: AppView.ANALYSIS, 
            color: 'text-emerald-600', 
            bg: 'bg-emerald-50', 
            border: 'border-emerald-200'
        }
    ];

    return (
        <div className="min-h-full bg-stellar flex flex-col animate-in fade-in duration-700">
            {/* System Status Bar */}
            <div className="px-6 pt-4 pb-2 flex justify-between items-center border-b border-intl-border/50 bg-white/50 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                    <div className="size-2 bg-primary rounded-full animate-pulse shadow-[0_0_8px_#FF4F00]"></div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-graphite/60">System Ready</span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-[10px] font-black text-graphite/80">{currentTime}</span>
                    <div className="flex gap-1">
                        <div className="w-3 h-1 bg-primary/20 rounded-full"></div>
                        <div className="w-6 h-1 bg-primary rounded-full shadow-[0_0_5px_#FF4F00]"></div>
                    </div>
                </div>
            </div>

            <div className="p-6 space-y-8 flex-1 overflow-y-auto custom-scrollbar">
                {/* Brand Header */}
                <header className="flex justify-between items-start py-2">
                    <div className="space-y-1">
                        <h1 className="text-5xl font-black text-graphite tracking-tighter leading-[0.85]">
                            OPEN<br/>AGENT<span className="text-primary">.</span>
                        </h1>
                        <p className="text-[11px] font-black text-primary uppercase tracking-[0.4em] mt-2">Premium AI Suite</p>
                    </div>
                    <button 
                        onClick={() => onNavigate(AppView.NOTIFICATIONS)}
                        className="size-14 rounded-2xl bg-white border-2 border-intl-border shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all text-primary"
                    >
                        <span className="material-symbols-outlined text-3xl font-bold">notifications_active</span>
                    </button>
                </header>

                {/* Primary Action - Ultra Visible */}
                <button 
                    onClick={() => onNavigate(AppView.CHAT)}
                    className="group relative w-full h-28 bg-graphite text-white rounded-[2rem] overflow-hidden shadow-2xl transition-all hover:translate-y-[-4px] active:scale-[0.98] border-b-8 border-primary/30"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/40 via-transparent to-primary/10 opacity-40 group-hover:opacity-60 transition-opacity"></div>
                    <div className="relative h-full px-10 flex items-center justify-between">
                        <div className="text-left">
                            <span className="block text-[11px] font-black uppercase tracking-[0.4em] text-primary mb-1">Neural Core v4.1</span>
                            <span className="text-2xl font-black tracking-tighter uppercase">Démarrer Session</span>
                        </div>
                        <div className="size-14 bg-white/10 rounded-2xl flex items-center justify-center group-hover:bg-primary transition-colors shadow-inner">
                            <span className="material-symbols-outlined text-4xl text-white">bolt</span>
                        </div>
                    </div>
                </button>

                {/* Modules Grid */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-graphite/40">Modules de Commande</h3>
                        <div className="h-[2px] flex-1 bg-intl-border mx-4"></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {modules.map((mod) => (
                            <button 
                                key={mod.label}
                                onClick={() => onNavigate(mod.view)}
                                className={`flex flex-col items-start p-6 ${mod.bg} border-2 ${mod.border} rounded-[2.5rem] shadow-lg transition-all active:scale-95 group relative overflow-hidden`}
                            >
                                <div className={`size-12 rounded-2xl bg-white shadow-md flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                                    <span className={`material-symbols-outlined ${mod.color} text-3xl font-bold`}>{mod.icon}</span>
                                </div>
                                <span className={`text-[12px] font-black uppercase tracking-widest ${mod.color}`}>{mod.label}</span>
                            </button>
                        ))}
                    </div>
                </section>

                {/* Secondary Actions */}
                <div className="grid grid-cols-2 gap-4">
                    <button 
                        onClick={() => onNavigate(AppView.WRITING)}
                        className="p-5 bg-indigo-50 border-2 border-indigo-200 rounded-3xl flex flex-col items-center gap-2 hover:bg-indigo-600 hover:text-white transition-all shadow-md group"
                    >
                        <span className="material-symbols-outlined text-indigo-600 text-3xl font-bold group-hover:text-white">edit_note</span>
                        <span className="text-[10px] font-black uppercase tracking-widest">Write Flow</span>
                    </button>
                    <button 
                        onClick={() => onNavigate(AppView.VIDEO_GEN)}
                        className="p-5 bg-amber-50 border-2 border-amber-200 rounded-3xl flex flex-col items-center gap-2 hover:bg-amber-500 hover:text-white transition-all shadow-md group"
                    >
                        <span className="material-symbols-outlined text-amber-500 text-3xl font-bold group-hover:text-white">movie</span>
                        <span className="text-[10px] font-black uppercase tracking-widest">Cinema Studio</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
