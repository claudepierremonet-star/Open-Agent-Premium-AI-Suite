
import React from 'react';
import { AppView } from '../types';
import { NAV_ITEMS } from '../constants';

interface NavigationProps {
    currentView: AppView;
    onNavigate: (view: AppView) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentView, onNavigate }) => {
    return (
        <nav className="border-t-2 border-intl-border bg-white/95 backdrop-blur-xl px-4 py-4 flex justify-between items-center z-50 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
            {NAV_ITEMS.map((item) => {
                const isActive = currentView === item.view;
                return (
                    <button
                        key={item.view}
                        onClick={() => onNavigate(item.view)}
                        className={`flex flex-col items-center gap-1.5 px-3 py-1 rounded-2xl transition-all ${
                            isActive 
                                ? 'bg-primary/10 text-primary scale-110 shadow-inner' 
                                : 'text-graphite/30 hover:text-graphite/60 hover:bg-stellar'
                        }`}
                    >
                        <span className={`material-symbols-outlined text-[28px] font-bold ${isActive ? 'fill-1' : ''}`}>
                            {item.icon}
                        </span>
                        <span className={`text-[8px] font-black uppercase tracking-widest ${isActive ? 'opacity-100' : 'opacity-40'}`}>
                            {item.label}
                        </span>
                    </button>
                );
            })}
        </nav>
    );
};
