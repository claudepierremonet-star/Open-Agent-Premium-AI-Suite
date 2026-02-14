
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MODELS, AIModel } from '../constants';
import { ChatMessage, ChatThread } from '../types';
import { GoogleGenAI } from "@google/genai";

export const Chat: React.FC = () => {
    const [threads, setThreads] = useState<ChatThread[]>([
        { id: 't1', title: 'Optimisation React', lastMessage: 'Refactorisation du hook...', timestamp: '2m ago', isPinned: true, modelId: 'gemini' },
        { id: 't2', title: 'Copywriting Marketing', lastMessage: 'Voici la version révisée...', timestamp: '1h ago', isPinned: false, modelId: 'perplexity' },
        { id: 't3', title: 'Analyse Revenus Q3', lastMessage: 'Selon le CSV importé...', timestamp: 'Yesterday', isPinned: false, modelId: 'deepseek' }
    ]);

    const [activeThreadId, setActiveThreadId] = useState('t1');
    const [messages, setMessages] = useState<ChatMessage[]>([
        { id: '1', role: 'assistant', content: "Système multi-modèle initialisé. Je suis prêt à simuler l'intelligence de votre choix. Choisissez un moteur dans le hub ci-dessus.", timestamp: '09:41 AM' }
    ]);
    const [input, setInput] = useState('');
    const [selectedModel, setSelectedModel] = useState<AIModel>(MODELS[0]);
    const [isThinking, setIsThinking] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [showModelHub, setShowModelHub] = useState(false);
    const [showChatList, setShowChatList] = useState(false);
    const [activePersona, setActivePersona] = useState<any>(null);
    
    const scrollRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        const loadPersona = () => {
            const saved = localStorage.getItem('openagent_persona');
            if (saved) setActivePersona(JSON.parse(saved));
        };
        loadPersona();
        window.addEventListener('storage', loadPersona);
        return () => window.removeEventListener('storage', loadPersona);
    }, []);

    const sortedThreads = useMemo(() => {
        return [...threads].sort((a, b) => {
            if (a.isPinned === b.isPinned) return 0;
            return a.isPinned ? -1 : 1;
        });
    }, [threads]);

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

    const togglePin = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setThreads(prev => prev.map(t => t.id === id ? { ...t, isPinned: !t.isPinned } : t));
    };

    const handleNewChat = () => {
        const newId = 't' + Date.now();
        const newThread: ChatThread = {
            id: newId,
            title: 'Nouvelle discussion',
            lastMessage: 'En attente...',
            timestamp: 'Maintenant',
            isPinned: false,
            modelId: selectedModel.id
        };
        
        setThreads(prev => [newThread, ...prev]);
        setActiveThreadId(newId);
        setMessages([{ 
            id: Date.now().toString(), 
            role: 'assistant', 
            content: `Nouvelle session démarrée avec ${selectedModel.name}. Comment puis-je vous aider ?`, 
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
        }]);
        setShowChatList(false);
    };

    const getSystemInstruction = (modelId: string) => {
        let instruction = "";
        switch(modelId) {
            case 'perplexity': instruction = "Tu es Perplexity. Recherche web précise. Cite sources."; break;
            case 'deepseek': instruction = "Tu es DeepSeek R1. Expert logique."; break;
            case 'grok': instruction = "Tu es Grok. Direct et honnête."; break;
            default: instruction = "Tu es Gemini 3 Pro.";
        }
        if (activePersona?.tone === 'professional') instruction += " MODE EXPERT. Formel et structuré.";
        else if (activePersona?.tone === 'casual') instruction += " MODE RELAX. Chaleureux et emojis.";
        else if (activePersona?.tone === 'creative') instruction += " MODE VISIONNAIRE. Disruptif et poétique.";
        return instruction;
    };

    const handleSend = async () => {
        if (!input.trim() || isThinking) return;
        const userText = input.trim();
        setInput('');
        if (isListening) recognitionRef.current?.stop();

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
            const baseTemp = activePersona?.tone === 'creative' ? 0.9 : 0.7;
            const finalTemp = activePersona ? (activePersona.creativity / 100) * baseTemp + 0.1 : 0.7;

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: userText,
                config: {
                    tools: selectedModel.searchEnabled ? [{ googleSearch: {} }] : undefined,
                    systemInstruction: getSystemInstruction(selectedModel.id),
                    temperature: finalTemp
                }
            });

            const aiMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response.text || "Erreur de génération.",
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                model: selectedModel.name
            };
            setMessages(prev => [...prev, aiMsg]);

            setThreads(prev => prev.map(t => t.id === activeThreadId ? { 
                ...t, 
                lastMessage: userText, 
                timestamp: 'Maintenant',
                title: t.title === 'Nouvelle discussion' ? (userText.length > 20 ? userText.substring(0, 20) + '...' : userText) : t.title
            } : t));

        } catch (error) {
            console.error("Chat Error:", error);
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: "Erreur de connexion. Veuillez réessayer.",
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]);
        } finally {
            setIsThinking(false);
        }
    };

    const getToneColor = () => {
        if (activePersona?.tone === 'casual') return 'bg-amber-500';
        if (activePersona?.tone === 'creative') return 'bg-purple-600';
        return 'bg-primary';
    };

    const getToneText = () => {
        if (activePersona?.tone === 'casual') return 'text-amber-600';
        if (activePersona?.tone === 'creative') return 'text-purple-600';
        return 'text-primary';
    };

    const getToneBorder = () => {
        if (activePersona?.tone === 'casual') return 'border-amber-500/30';
        if (activePersona?.tone === 'creative') return 'border-purple-600/30';
        return 'border-primary/30';
    };

    return (
        <div className={`flex flex-col h-full bg-stellar relative overflow-hidden transition-all duration-700`}>
            {/* Header Haute Visibilité */}
            <header className="px-6 py-4 border-b-2 border-intl-border bg-white sticky top-0 z-40 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setShowChatList(true)}
                        className="size-11 rounded-xl bg-white border-2 border-intl-border flex items-center justify-center hover:bg-stellar hover:border-graphite/20 transition-all shadow-sm"
                    >
                        <span className="material-symbols-outlined text-graphite font-bold">forum</span>
                    </button>
                    <div className="flex items-center gap-2">
                        <div className={`size-9 rounded-xl ${selectedModel.bgColor} flex items-center justify-center border border-white/20`}>
                            <span className={`material-symbols-outlined ${selectedModel.color} text-[20px] font-bold`}>
                                {selectedModel.icon}
                            </span>
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-graphite truncate max-w-[140px] leading-tight uppercase tracking-tight">
                                {threads.find(t => t.id === activeThreadId)?.title || selectedModel.name}
                            </h2>
                            <button 
                                onClick={() => setShowModelHub(!showModelHub)}
                                className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1 hover:opacity-70 transition-colors ${getToneText()}`}
                            >
                                {selectedModel.name} <span className="material-symbols-outlined text-[14px] font-bold">expand_more</span>
                            </button>
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    {activePersona?.tone && (
                        <div className={`px-3 py-1.5 rounded-full border-2 bg-white ${getToneBorder()} ${getToneText()} text-[9px] font-black uppercase tracking-widest hidden sm:block shadow-sm`}>
                            {activePersona.tone} MODE
                        </div>
                    )}
                    <button 
                        onClick={(e) => togglePin(activeThreadId, e)}
                        className={`size-11 rounded-xl border-2 flex items-center justify-center transition-all shadow-sm ${threads.find(t => t.id === activeThreadId)?.isPinned ? `${getToneColor()} text-white border-transparent` : 'bg-white border-intl-border text-graphite/40'}`}
                    >
                        <span className={`material-symbols-outlined text-[20px] font-bold ${threads.find(t => t.id === activeThreadId)?.isPinned ? 'fill-1' : ''}`}>push_pin</span>
                    </button>
                </div>
            </header>

            {/* Conversation List Drawer (Light Theme) */}
            {showChatList && (
                <div className="absolute inset-0 z-[60] flex">
                    <div className="w-[85%] h-full bg-white flex flex-col shadow-2xl animate-in slide-in-from-left duration-300 border-r-2 border-intl-border">
                        <div className="p-6 border-b-2 border-intl-border flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-black text-graphite tracking-tighter">DISCUSSIONS</h3>
                                <p className="text-[10px] text-graphite/40 font-black uppercase tracking-widest">Premium Session History</p>
                            </div>
                            <button onClick={() => setShowChatList(false)} className="size-10 rounded-full bg-stellar border border-intl-border flex items-center justify-center">
                                <span className="material-symbols-outlined text-graphite/40 font-bold">arrow_back</span>
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-stellar/30">
                            <button 
                                onClick={handleNewChat}
                                className={`w-full p-4 mb-2 rounded-2xl text-white font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all ${getToneColor()}`}
                            >
                                <span className="material-symbols-outlined text-lg">add</span>
                                Nouveau Chat
                            </button>

                            {sortedThreads.map(thread => (
                                <button 
                                    key={thread.id}
                                    onClick={() => { setActiveThreadId(thread.id); setShowChatList(false); }}
                                    className={`w-full p-4 rounded-3xl flex items-center gap-4 text-left transition-all border-2 ${
                                        activeThreadId === thread.id 
                                            ? `bg-white ${getToneBorder()} shadow-lg` 
                                            : 'bg-transparent border-transparent hover:bg-white hover:border-intl-border'
                                    }`}
                                >
                                    <div className="size-12 rounded-2xl bg-white border-2 border-intl-border flex items-center justify-center shrink-0 shadow-sm">
                                        <span className={`material-symbols-outlined text-2xl ${getToneText()}`}>chat_bubble</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-1 mb-1">
                                            <span className="text-sm font-black text-graphite truncate">{thread.title}</span>
                                            {thread.isPinned && <span className={`material-symbols-outlined text-[14px] fill-1 ${getToneText()}`}>push_pin</span>}
                                        </div>
                                        <p className="text-[11px] text-graphite/50 font-bold truncate tracking-tight">{thread.lastMessage}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex-1 bg-graphite/20 backdrop-blur-sm" onClick={() => setShowChatList(false)}></div>
                </div>
            )}

            {/* Model Hub Overlay (Light Theme) */}
            {showModelHub && (
                <div className="absolute top-[75px] inset-x-0 bottom-0 z-50 bg-stellar/95 backdrop-blur-xl border-b-2 border-intl-border flex flex-col animate-in slide-in-from-top-4 duration-300">
                    <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-graphite/40">Sélecteur de Moteur Neural</h3>
                            <button onClick={() => setShowModelHub(false)} className="size-10 rounded-full bg-white border border-intl-border flex items-center justify-center hover:bg-stellar transition-colors">
                                <span className="material-symbols-outlined text-graphite/60">close</span>
                            </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {MODELS.map((m) => (
                                <button 
                                    key={m.id}
                                    onClick={() => { setSelectedModel(m); setShowModelHub(false); }}
                                    className={`flex items-center gap-5 p-5 rounded-[2rem] border-2 transition-all text-left group bg-white ${
                                        selectedModel.id === m.id 
                                            ? `${getToneBorder()} shadow-2xl scale-[1.02]` 
                                            : 'border-intl-border hover:border-graphite/20 hover:shadow-lg'
                                    }`}
                                >
                                    <div className={`size-14 rounded-2xl shrink-0 flex items-center justify-center ${m.bgColor} border border-white/40 shadow-sm group-hover:scale-110 transition-transform`}>
                                        <span className={`material-symbols-outlined ${m.color} text-3xl font-bold`}>{m.icon}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-black text-graphite uppercase tracking-widest">{m.name}</div>
                                        <p className="text-[10px] text-graphite/40 font-bold leading-tight mt-1">{m.description}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Messages Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[88%] flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                            {msg.role === 'assistant' && (
                                <div className="flex items-center gap-2 ml-2">
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${getToneText()}`}>{msg.model || 'Premium Suite'}</span>
                                    <div className="size-1.5 rounded-full bg-intl-border"></div>
                                    <span className="text-[10px] text-graphite/20 font-black">{msg.timestamp}</span>
                                </div>
                            )}
                            <div className={`px-6 py-4 rounded-[1.8rem] text-[15px] font-bold leading-relaxed border-2 transition-all duration-700 shadow-sm ${
                                msg.role === 'user' 
                                    ? `${getToneColor()} border-transparent text-white rounded-tr-none shadow-xl` 
                                    : `bg-white border-intl-border text-graphite rounded-tl-none`
                            }`}>
                                {msg.content}
                            </div>
                            {msg.role === 'user' && (
                                <span className="text-[10px] text-graphite/20 font-black mr-2">{msg.timestamp}</span>
                            )}
                        </div>
                    </div>
                ))}
                {isThinking && (
                    <div className="flex items-center gap-4 p-4 bg-white rounded-2xl w-fit border-2 border-intl-border shadow-sm animate-pulse ml-2">
                        <div className="relative size-6">
                            <div className={`absolute inset-0 border-3 rounded-full opacity-20 ${getToneColor()}`}></div>
                            <div className={`absolute inset-0 border-3 border-t-transparent rounded-full animate-spin ${getToneColor()}`}></div>
                        </div>
                        <span className={`text-[11px] font-black uppercase tracking-[0.2em] italic ${getToneText()}`}>{selectedModel.name} ANALYSE...</span>
                    </div>
                )}
            </div>

            {/* Input Area Haute Visibilité */}
            <footer className="p-6 bg-white border-t-2 border-intl-border pb-10">
                <div className="max-w-4xl mx-auto">
                    <div className={`bg-stellar rounded-[2rem] p-3 flex items-end gap-3 border-2 transition-all shadow-inner group focus-within:bg-white focus-within:shadow-2xl ${getToneBorder()} bg-white`}>
                        <textarea 
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                            className="flex-1 bg-transparent border-none focus:ring-0 text-graphite text-[15px] font-bold py-3 resize-none max-h-40 placeholder:text-graphite/20 px-5" 
                            placeholder={`Expliquez votre concept à ${selectedModel.name}...`} 
                            rows={1}
                        />
                        <div className="flex items-center gap-2 pb-2 pr-2">
                            <button 
                                onClick={toggleListening}
                                className={`size-12 rounded-2xl flex items-center justify-center transition-all border-2 ${isListening ? 'bg-red-500 border-red-600 text-white animate-pulse' : 'bg-white border-intl-border text-graphite/40 hover:text-graphite'}`}
                            >
                                <span className="material-symbols-outlined font-bold">{isListening ? 'mic_off' : 'mic'}</span>
                            </button>
                            <button 
                                onClick={handleSend}
                                disabled={isThinking || !input.trim()}
                                className={`text-white size-12 rounded-2xl flex items-center justify-center transition-all shadow-xl disabled:opacity-20 disabled:shadow-none hover:scale-110 active:scale-95 ${getToneColor()}`}
                            >
                                <span className="material-symbols-outlined font-bold">arrow_upward</span>
                            </button>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};
