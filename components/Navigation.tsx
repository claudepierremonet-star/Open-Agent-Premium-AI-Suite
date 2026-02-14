
import React from 'react';
import { AppView } from '../types';
import { NAV_ITEMS } from '../constants';

interface NavigationProps {
    currentView: AppView;
    onNavigate: (view: AppView) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentView, onNavigate }) => {
    return (
        <nav className="border-t border-white/5 bg-background-dark/80 backdrop-blur-lg px-6 pb-8 pt-4 flex justify-between items-center z-50">
            {NAV_ITEMS.map((item) => {
                const isActive = currentView === item.view;
                return (
                    <button
                        key={item.view}
                        onClick={() => onNavigate(item.view)}
                        className={`flex flex-col items-center gap-1 transition-colors ${
                            isActive ? 'text-primary' : 'text-white/40 hover:text-white'
                        }`}
                    >
                        <span className={`material-symbols-outlined text-[24px] ${isActive ? 'fill-current' : ''}`}>
                            {item.icon}
                        </span>
                        <span className="text-[10px] font-medium tracking-tight">{item.label}</span>
                    </button>
                );
            })}
        </nav>
    );
};
