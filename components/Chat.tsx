
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MODELS, AIModel } from '../constants';
import { ChatMessage, ChatThread } from '../types';
import { GoogleGenAI } from "@google/genai";

export const Chat: React.FC = () => {
    const [threads, setThreads] = useState<ChatThread[]>([
        { id: 't1', title: 'Analyse Stratégique', lastMessage: 'Voici les points clés...', timestamp: '2m ago', isPinned: true, modelId: 'gemini' },
        { id: 't2', title: 'Développement App', lastMessage: 'Le code est prêt...', timestamp: '1h ago', isPinned: false, modelId: 'perplexity' }
    ]);

    const [activeThreadId, setActiveThreadId] = useState('t1');
    const [messages, setMessages] = useState<ChatMessage[]>([
        { id: '1', role: 'assistant', content: "Bienvenue dans votre centre de commande neural. ✨\n\nJe suis configuré pour vous assister avec une précision maximale. 🚀\n\nQuelle est votre priorité actuelle ?", timestamp: '09:41 AM' }
    ]);
    const [input, setInput] = useState('');
    const [selectedModel, setSelectedModel] = useState<AIModel>(MODELS[0]);
    const [pendingModel, setPendingModel] = useState<AIModel | null>(null);
    const [isThinking, setIsThinking] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [showChatList, setShowChatList] = useState(false);
    const [showModelMenu, setShowModelMenu] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    
    const scrollRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages, isThinking]);

    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'fr-FR';
            recognitionRef.current.onresult = (event: any) => {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
                }
                if (finalTranscript) setInput(prev => prev + (prev ? ' ' : '') + finalTranscript);
            };
            recognitionRef.current.onend = () => setIsListening(false);
            recognitionRef.current.onerror = () => setIsListening(false);
        }
    }, []);

    const toggleListening = () => {
        if (!recognitionRef.current) return;
        if (isListening) recognitionRef.current.stop();
        else { setIsListening(true); recognitionRef.current.start(); }
    };

    const handleNewChat = () => {
        const newId = 't' + Date.now();
        setThreads(prev => [{ id: newId, title: 'Nouvelle discussion', lastMessage: '...', timestamp: 'Maintenant', isPinned: false, modelId: selectedModel.id }, ...prev]);
        setActiveThreadId(newId);
        setMessages([{ id: Date.now().toString(), role: 'assistant', content: "Nouvelle session prête. 👋\n\nPrêt à explorer de nouveaux concepts avec vous. Dites-moi tout ! 💡", timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
        setShowChatList(false);
    };

    const requestModelSwitch = (model: AIModel) => {
        if (model.id === selectedModel.id) {
            setShowModelMenu(false);
            return;
        }

        if (messages.length > 1) {
            setPendingModel(model);
            setShowConfirmModal(true);
            setShowModelMenu(false);
        } else {
            setSelectedModel(model);
            setShowModelMenu(false);
        }
    };

    const confirmModelSwitch = () => {
        if (pendingModel) {
            setSelectedModel(pendingModel);
            setPendingModel(null);
            setShowConfirmModal(false);
        }
    };

    const handleSend = async () => {
        if (!input.trim() || isThinking) return;
        const userText = input.trim();
        setInput('');

        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: userText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, userMsg]);
        setIsThinking(true);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: userText,
                config: {
                    tools: selectedModel.searchEnabled ? [{ googleSearch: {} }] : undefined,
                    systemInstruction: `Tu es un assistant IA premium (${selectedModel.name}). 
                    RÈGLES DE STYLE :
                    1. Utilise BEAUCOUP d'emojis pertinents pour rendre tes réponses vivantes.
                    2. Sépare tes paragraphes par des doubles sauts de ligne pour une lisibilité parfaite.
                    3. Utilise le gras pour souligner les points clés.
                    4. Ton ton doit être élégant, inspirant et donner envie de lire chaque mot.
                    5. Réponds en français.`,
                }
            });

            const aiMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response.text || "Désolé, une erreur est survenue. 😕",
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                model: selectedModel.name
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch (error) {
            console.error("Chat Error:", error);
        } finally {
            setIsThinking(false);
        }
    };

    const chatModels = MODELS.filter(m => m.type === 'chat');

    return (
        <div className="flex flex-col h-full bg-stellar relative overflow-hidden transition-all duration-700">
            {/* Header */}
            <header className="px-6 py-5 border-b-2 border-intl-border bg-white sticky top-0 z-40 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => setShowChatList(true)} className="size-11 rounded-xl bg-white border-2 border-intl-border flex items-center justify-center hover:bg-stellar transition-all shadow-sm active:scale-95">
                        <span className="material-symbols-outlined text-graphite font-bold">menu</span>
                    </button>
                    <div className="flex flex-col">
                        <h2 className="text-sm font-black text-graphite truncate max-w-[160px] leading-tight uppercase tracking-tight">
                            {threads.find(t => t.id === activeThreadId)?.title}
                        </h2>
                        <button 
                            onClick={() => setShowModelMenu(!showModelMenu)}
                            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary hover:opacity-80 transition-all text-left"
                        >
                            <span className="material-symbols-outlined text-[14px]">{selectedModel.icon}</span>
                            {selectedModel.name}
                            <span className="material-symbols-outlined text-[14px]">expand_more</span>
                        </button>
                    </div>
                </div>
                <button onClick={handleNewChat} className="size-11 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg active:scale-95 transition-all">
                    <span className="material-symbols-outlined font-black">add</span>
                </button>
            </header>

            {/* Model Selector Overlay - EXPANDED MODEL HUB */}
            {showModelMenu && (
                <div className="absolute inset-x-0 top-[72px] bottom-0 z-[60] bg-black/40 backdrop-blur-sm animate-in fade-in duration-300 overflow-hidden" onClick={() => setShowModelMenu(false)}>
                    <div 
                        className="absolute top-0 inset-x-0 bg-white border-b-4 border-primary rounded-b-[2.5rem] shadow-2xl p-6 pb-10 space-y-6 animate-in slide-in-from-top-10 duration-500 overflow-y-auto max-h-[85vh] no-scrollbar"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-2">
                            <div>
                                <h3 className="text-sm font-black text-graphite uppercase tracking-widest">Model Hub</h3>
                                <p className="text-[10px] font-bold text-graphite/40 uppercase tracking-widest">Moteurs d'Intelligence Avancés</p>
                            </div>
                            <button onClick={() => setShowModelMenu(false)} className="size-10 rounded-full bg-stellar text-graphite/30 hover:text-graphite transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="grid gap-3">
                            {chatModels.map(model => {
                                const isActive = selectedModel.id === model.id;
                                return (
                                    <button 
                                        key={model.id}
                                        onClick={() => requestModelSwitch(model)}
                                        className={`flex items-start gap-4 p-5 rounded-[2rem] border-2 transition-all group text-left ${
                                            isActive 
                                                ? 'bg-primary/5 border-primary shadow-lg scale-[1.02]' 
                                                : 'bg-stellar border-intl-border hover:border-primary/20 hover:bg-white'
                                        }`}
                                    >
                                        <div className={`size-12 rounded-2xl flex items-center justify-center shadow-md transition-transform group-hover:scale-110 ${isActive ? 'bg-primary text-white' : 'bg-white text-graphite/40'}`}>
                                            <span className="material-symbols-outlined text-2xl font-bold">{model.icon}</span>
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center justify-between">
                                                <p className={`text-[12px] font-black uppercase tracking-widest ${isActive ? 'text-primary' : 'text-graphite'}`}>
                                                    {model.name}
                                                </p>
                                                {model.searchEnabled && (
                                                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 text-[8px] font-black uppercase tracking-widest">
                                                        Web
                                                    </span>
                                                )}
                                            </div>
                                            <p className={`text-[10px] font-bold leading-relaxed transition-opacity ${isActive ? 'text-primary/70' : 'text-graphite/40'}`}>
                                                {model.description}
                                            </p>
                                        </div>
                                        {isActive && (
                                            <div className="size-6 bg-primary rounded-full flex items-center justify-center self-center shadow-sm">
                                                <span className="material-symbols-outlined text-white text-[14px] font-black">check</span>
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Switch Confirmation Modal */}
            {showConfirmModal && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-graphite/40 backdrop-blur-md" onClick={() => setShowConfirmModal(false)}></div>
                    <div className="relative bg-white border-2 border-intl-border rounded-[3rem] p-10 shadow-2xl max-w-sm w-full text-center space-y-8 animate-in zoom-in-95 duration-300">
                        <div className="size-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                            <span className="material-symbols-outlined text-primary text-5xl font-black">warning</span>
                        </div>
                        <div className="space-y-3">
                            <h3 className="text-xl font-black text-graphite uppercase tracking-tighter">Perte de Contexte</h3>
                            <p className="text-[13px] font-bold text-graphite/60 leading-relaxed">
                                Changer de moteur IA en cours de route peut entraîner une perte de la mémoire conversationnelle. Confirmer le basculement vers <span className="text-primary">{pendingModel?.name}</span> ?
                            </p>
                        </div>
                        <div className="flex flex-col gap-3">
                            <button 
                                onClick={confirmModelSwitch}
                                className="w-full py-4 bg-primary text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl active:scale-95 transition-all"
                            >
                                Confirmer le switch
                            </button>
                            <button 
                                onClick={() => { setShowConfirmModal(false); setPendingModel(null); }}
                                className="w-full py-4 bg-white border-2 border-intl-border text-graphite/40 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:text-graphite transition-all active:scale-95"
                            >
                                Annuler
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-12 custom-scrollbar bg-stellar/50">
                {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
                        <div className={`max-w-[90%] flex flex-col gap-3 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                            <div className={`flex items-center gap-3 px-1 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                <div className={`size-7 rounded-xl flex items-center justify-center shadow-sm ${msg.role === 'user' ? 'bg-graphite' : 'bg-primary'}`}>
                                    <span className="material-symbols-outlined text-[16px] text-white font-black">
                                        {msg.role === 'user' ? 'person' : 'smart_toy'}
                                    </span>
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-graphite/40">
                                    {msg.role === 'user' ? 'VOUS' : 'NEURAL CORE'} • {msg.timestamp}
                                </span>
                            </div>
                            <div className={`relative px-7 py-6 rounded-[2.2rem] text-[16px] leading-relaxed border-2 shadow-sm transition-all ${
                                msg.role === 'user' 
                                    ? 'bg-graphite border-graphite text-white rounded-tr-sm shadow-xl' 
                                    : 'bg-white border-intl-border text-graphite rounded-tl-sm border-l-[8px] border-l-primary'
                            }`}>
                                <div className="space-y-5">
                                    {msg.content.split('\n\n').map((para, i) => (
                                        <p key={i} className="font-medium tracking-tight whitespace-pre-wrap">{para}</p>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
                {isThinking && (
                    <div className="flex items-center gap-5 p-6 bg-white border-2 border-intl-border rounded-[2.5rem] w-fit shadow-xl animate-pulse">
                        <div className="size-5 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin"></div>
                        <span className="text-[12px] font-black uppercase tracking-[0.4em] text-primary italic">Décryptage neural...</span>
                    </div>
                )}
            </div>

            <footer className="p-6 bg-white border-t-2 border-intl-border pb-12 shadow-[0_-15px_50px_rgba(0,0,0,0.04)]">
                <div className="max-w-xl mx-auto flex items-end gap-3 bg-stellar border-2 border-intl-border rounded-[2.8rem] p-3 focus-within:border-primary/40 focus-within:bg-white focus-within:shadow-2xl transition-all group">
                    <textarea 
                        value={input} 
                        onChange={(e) => setInput(e.target.value)} 
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())} 
                        className="flex-1 bg-transparent border-none focus:ring-0 text-graphite text-[17px] font-semibold py-4 px-6 resize-none max-h-48 placeholder:text-graphite/20" 
                        placeholder="Quelles sont vos instructions ?" 
                        rows={1} 
                    />
                    <div className="flex gap-2 pb-2 pr-2">
                        <button onClick={toggleListening} className={`size-14 rounded-[1.4rem] flex items-center justify-center transition-all border-2 ${isListening ? 'bg-red-500 border-red-600 text-white animate-pulse' : 'bg-white border-intl-border text-graphite/40 hover:text-graphite'}`}>
                            <span className="material-symbols-outlined font-black text-2xl">{isListening ? 'mic_off' : 'mic'}</span>
                        </button>
                        <button onClick={handleSend} disabled={isThinking || !input.trim()} className="size-14 rounded-[1.4rem] bg-primary text-white flex items-center justify-center shadow-xl disabled:opacity-20 active:scale-95 transition-all border-b-8 border-orange-700 hover:brightness-110">
                            <span className="material-symbols-outlined font-black text-2xl">send</span>
                        </button>
                    </div>
                </div>
            </footer>
        </div>
    );
};
