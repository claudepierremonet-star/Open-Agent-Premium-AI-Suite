
import React, { useState } from 'react';
import { AppView } from './types';
import { Dashboard } from './components/Dashboard';
import { History } from './components/History';
import { ARHistory } from './components/ARHistory';
import { Persona } from './components/Persona';
import { Chat } from './components/Chat';
import { Vision } from './components/Vision';
import { Writing } from './components/Writing';
import { Analysis } from './components/Analysis';
import { ImageGen } from './components/ImageGen';
import { VideoGen } from './components/VideoGen';
import { AudioToPhoto } from './components/AudioToPhoto';
import { AudioToVideo } from './components/AudioToVideo';
import { Notifications } from './components/Notifications';
import { Navigation } from './components/Navigation';

const App: React.FC = () => {
    const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);

    const renderView = () => {
        switch (currentView) {
            case AppView.DASHBOARD: return <Dashboard onNavigate={setCurrentView} />;
            case AppView.HISTORY: return <History />;
            case AppView.AR_HISTORY: return <ARHistory />;
            case AppView.PERSONA: return <Persona />;
            case AppView.CHAT: return <Chat />;
            case AppView.WRITING: return <Writing />;
            case AppView.ANALYSIS: return <Analysis />;
            case AppView.IMAGE_GEN: return <ImageGen onBack={() => setCurrentView(AppView.DASHBOARD)} />;
            case AppView.VIDEO_GEN: return <VideoGen onBack={() => setCurrentView(AppView.DASHBOARD)} />;
            case AppView.AUDIO_TO_PHOTO: return <AudioToPhoto onBack={() => setCurrentView(AppView.DASHBOARD)} />;
            case AppView.AUDIO_TO_VIDEO: return <AudioToVideo onBack={() => setCurrentView(AppView.DASHBOARD)} />;
            case AppView.VISION: return <Vision onBack={() => setCurrentView(AppView.DASHBOARD)} />;
            case AppView.NOTIFICATIONS: return <Notifications onBack={() => setCurrentView(AppView.DASHBOARD)} />;
            default: return <Dashboard onNavigate={setCurrentView} />;
        }
    };

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-stellar text-graphite max-w-md mx-auto relative border-x border-intl-border shadow-2xl">
            <main className="flex-1 overflow-y-auto custom-scrollbar">
                {renderView()}
            </main>
            {currentView !== AppView.VISION && (
                <Navigation currentView={currentView} onNavigate={setCurrentView} />
            )}
        </div>
    );
};

export default App;
