
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MODELS, AIModel } from '../constants';
import { ChatMessage, ChatThread } from '../types';
import { GoogleGenAI } from "@google/genai";

export const Chat: React.FC = () => {
    const [threads, setThreads] = useState<ChatThread[]>([
        { id: 't1', title: 'React Component Opt...', lastMessage: 'Can you refactor this hook...', timestamp: '2m ago', isPinned: true, modelId: 'gemini' },
        { id: 't2', title: 'Marketing Copy - V2', lastMessage: 'Here is a revised version...', timestamp: '1h ago', isPinned: false, modelId: 'perplexity' },
        { id: 't3', title: 'Q3 Revenue Breakdown', lastMessage: 'Based on the uploaded CSV...', timestamp: 'Yesterday', isPinned: false, modelId: 'deepseek' }
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
            lastMessage: 'En attente du premier message...',
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
            case 'perplexity': instruction = "Tu es Perplexity. Ta force est la recherche web ultra-précise. Cite toujours tes sources."; break;
            case 'deepseek': instruction = "Tu es DeepSeek R1. Expert en raisonnement logique et programmation."; break;
            case 'grok': instruction = "Tu es Grok. Direct, plein d'esprit, très honête."; break;
            default: instruction = "Tu es Gemini 3 Pro, un assistant IA généraliste de pointe.";
        }

        if (activePersona?.tone === 'professional') {
            instruction += " TU ES EN MODE PROFESSIONAL EXPERT. Structure tes réponses avec une analyse, des recommandations et sois très formel.";
        } else if (activePersona?.tone === 'casual') {
            instruction += " TU ES EN MODE CASUAL / BUDDY. Parle de manière détendue, utilise le 'tu', sois chaleureux, utilise des emojis et évite le jargon complexe.";
        } else if (activePersona?.tone === 'creative') {
            instruction += " TU ES EN MODE CREATIVE EXPLORER. Ta mission est de repousser les limites de l'imagination. Utilise des métaphores audacieuses, propose des solutions disruptives et n'hésite pas à explorer des concepts abstraits ou futuristes. Sois visionnaire et poétique.";
        }

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
            
            // Adjust temperature based on creativity setting
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
                content: response.text || "Désolé, je n'ai pas pu générer de réponse.",
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
            const errorMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: "Erreur de connexion. Veuillez réessayer.",
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsThinking(false);
        }
    };

    const getAccentColor = () => {
        if (activePersona?.tone === 'professional') return 'border-primary/50';
        if (activePersona?.tone === 'casual') return 'border-amber-500/50';
        if (activePersona?.tone === 'creative') return 'border-purple-500/50';
        return 'border-white/5';
    };

    const getButtonColor = () => {
        if (activePersona?.tone === 'casual') return 'bg-amber-500';
        if (activePersona?.tone === 'creative') return 'bg-purple-600';
        return 'bg-primary';
    };

    return (
        <div className={`flex flex-col h-full bg-background-dark relative overflow-hidden border-t-2 transition-all duration-700 ${getAccentColor()}`}>
            {/* Custom Header */}
            <header className="px-6 py-4 border-b border-white/5 glass sticky top-0 z-40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setShowChatList(true)}
                        className="size-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all"
                    >
                        <span className="material-symbols-outlined text-white/70">forum</span>
                    </button>
                    <div className="flex items-center gap-2">
                        <div className={`size-8 rounded-lg ${selectedModel.bgColor} flex items-center justify-center`}>
                            <span className={`material-symbols-outlined ${selectedModel.color} text-[16px]`}>
                                {selectedModel.icon}
                            </span>
                        </div>
                        <div>
                            <h2 className="text-sm font-bold truncate max-w-[120px] leading-tight">
                                {threads.find(t => t.id === activeThreadId)?.title || selectedModel.name}
                            </h2>
                            <button 
                                onClick={() => setShowModelHub(!showModelHub)}
                                className={`text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 hover:opacity-70 transition-colors ${activePersona?.tone === 'casual' ? 'text-amber-500' : activePersona?.tone === 'creative' ? 'text-purple-400' : 'text-white/30'}`}
                            >
                                {selectedModel.name} <span className="material-symbols-outlined text-[10px]">expand_more</span>
                            </button>
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    {activePersona?.tone === 'professional' && (
                        <div className="px-2 py-1 rounded-md bg-primary/10 border border-primary/20 text-[8px] font-black text-primary uppercase animate-pulse">
                            Expert Active
                        </div>
                    )}
                    {activePersona?.tone === 'casual' && (
                        <div className="px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-[8px] font-black text-amber-500 uppercase animate-pulse">
                            Buddy Active
                        </div>
                    )}
                    {activePersona?.tone === 'creative' && (
                        <div className="px-2 py-1 rounded-md bg-purple-500/10 border border-purple-500/20 text-[8px] font-black text-purple-400 uppercase animate-pulse">
                            Vision Active
                        </div>
                    )}
                    <button 
                        onClick={(e) => togglePin(activeThreadId, e)}
                        className={`size-8 rounded-lg flex items-center justify-center transition-all ${threads.find(t => t.id === activeThreadId)?.isPinned ? `${activePersona?.tone === 'casual' ? 'bg-amber-500/20 text-amber-500 border-amber-500/20' : activePersona?.tone === 'creative' ? 'bg-purple-500/20 text-purple-400 border-purple-500/20' : 'bg-primary/20 text-primary border-primary/20'}` : 'bg-white/5 border border-white/10'}`}
                    >
                        <span className={`material-symbols-outlined text-[18px] ${threads.find(t => t.id === activeThreadId)?.isPinned ? 'fill-1' : ''}`}>push_pin</span>
                    </button>
                </div>
            </header>

            {/* Conversation List Drawer */}
            {showChatList && (
                <div className="absolute inset-0 z-[60] flex">
                    <div className="w-[85%] h-full bg-background-dark/95 backdrop-blur-3xl border-r border-white/10 flex flex-col shadow-2xl animate-in slide-in-from-left duration-300">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-bold">Conversations</h3>
                                <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest">Organize your thoughts</p>
                            </div>
                            <button onClick={() => setShowChatList(false)} className="size-8 rounded-full bg-white/5 flex items-center justify-center">
                                <span className="material-symbols-outlined text-sm text-white/40">arrow_back</span>
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                            <button 
                                onClick={handleNewChat}
                                className={`w-full p-3 mb-2 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all ${getButtonColor()}`}
                            >
                                <span className="material-symbols-outlined text-sm">add</span>
                                Nouvelle discussion
                            </button>

                            {sortedThreads.map(thread => (
                                <button 
                                    key={thread.id}
                                    onClick={() => { setActiveThreadId(thread.id); setShowChatList(false); }}
                                    className={`w-full p-3 rounded-2xl flex items-center gap-3 text-left transition-all border ${
                                        activeThreadId === thread.id 
                                            ? 'bg-white/10 border-white/10 shadow-sm' 
                                            : 'bg-transparent border-transparent hover:bg-white/5'
                                    }`}
                                >
                                    <div className="size-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center shrink-0">
                                        <span className={`material-symbols-outlined text-lg ${activePersona?.tone === 'casual' ? 'text-amber-500/60' : activePersona?.tone === 'creative' ? 'text-purple-400/60' : 'text-primary/60'}`}>chat_bubble</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-1 mb-0.5">
                                            <span className="text-xs font-bold text-white truncate">{thread.title}</span>
                                            {thread.isPinned && <span className={`material-symbols-outlined text-[12px] fill-1 ${activePersona?.tone === 'casual' ? 'text-amber-500' : activePersona?.tone === 'creative' ? 'text-purple-400' : 'text-primary'}`}>push_pin</span>}
                                        </div>
                                        <p className="text-[10px] text-white/30 truncate">{thread.lastMessage}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex-1 bg-black/20" onClick={() => setShowChatList(false)}></div>
                </div>
            )}

            {/* Model Hub Overlay */}
            {showModelHub && (
                <div className="absolute top-[65px] inset-x-0 bottom-0 z-50 bg-background-dark/98 backdrop-blur-3xl border-b border-white/10 flex flex-col animate-in slide-in-from-top-4 duration-300">
                    <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Moteur Intelligence Artificielle</h3>
                            <button onClick={() => setShowModelHub(false)} className="size-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                                <span className="material-symbols-outlined text-sm text-white/40">close</span>
                            </button>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                            {MODELS.map((m) => (
                                <button 
                                    key={m.id}
                                    onClick={() => { setSelectedModel(m); setShowModelHub(false); }}
                                    className={`flex items-start gap-4 p-4 rounded-2xl border transition-all text-left group ${
                                        selectedModel.id === m.id 
                                            ? `bg-white/10 ${activePersona?.tone === 'casual' ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]' : activePersona?.tone === 'creative' ? 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)]' : 'border-primary shadow-neon-strong'}` 
                                            : 'bg-white/5 border-white/5 hover:bg-white/10'
                                    }`}
                                >
                                    <div className={`size-12 rounded-xl shrink-0 flex items-center justify-center ${m.bgColor} border border-white/5 group-hover:border-white/20 transition-all`}>
                                        <span className={`material-symbols-outlined ${m.color} text-2xl`}>{m.icon}</span>
                                    </div>
                                    <div className="flex-1 min-w-0 text-sm font-bold text-white">{m.name}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Messages Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] flex flex-col gap-1.5 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                            {msg.role === 'assistant' && (
                                <div className="flex items-center gap-1.5 ml-1">
                                    <span className={`text-[9px] font-bold uppercase tracking-wider ${activePersona?.tone === 'casual' ? 'text-amber-500/60' : activePersona?.tone === 'creative' ? 'text-purple-400/60' : 'text-white/40'}`}>{msg.model || 'Open Agent'}</span>
                                </div>
                            )}
                            <div className={`px-4 py-3 rounded-2xl text-[14px] leading-relaxed border transition-all duration-700 ${
                                msg.role === 'user' 
                                    ? `${getButtonColor()} shadow-lg border-transparent text-white rounded-tr-none` 
                                    : `bg-surface-dark/60 border-white/5 text-white/90 rounded-tl-none shadow-sm ${activePersona?.tone === 'creative' ? 'shadow-[0_0_10px_rgba(168,85,247,0.1)]' : ''}`
                            }`}>
                                {msg.content}
                            </div>
                            <span className="text-[9px] text-white/20">{msg.timestamp}</span>
                        </div>
                    </div>
                ))}
                {isThinking && (
                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl w-fit border border-white/5 animate-pulse">
                        <div className="relative size-4">
                            <div className={`absolute inset-0 border-2 rounded-full opacity-20 ${activePersona?.tone === 'casual' ? 'border-amber-500' : activePersona?.tone === 'creative' ? 'border-purple-500' : 'border-primary'}`}></div>
                            <div className={`absolute inset-0 border-2 border-t-transparent rounded-full animate-spin ${activePersona?.tone === 'casual' ? 'border-amber-500' : activePersona?.tone === 'creative' ? 'border-purple-500' : 'border-primary'}`}></div>
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-widest italic ${activePersona?.tone === 'casual' ? 'text-amber-500/60' : activePersona?.tone === 'creative' ? 'text-purple-400/60' : 'text-white/40'}`}>{selectedModel.name} réfléchit...</span>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <footer className="p-4 bg-background-dark/95 border-t border-white/5">
                <div className="max-w-4xl mx-auto space-y-3">
                    <div className={`bg-white/5 rounded-2xl p-2 flex items-end gap-2 border transition-all shadow-inner ${activePersona?.tone === 'casual' ? 'focus-within:border-amber-500/50' : activePersona?.tone === 'creative' ? 'focus-within:border-purple-500/50' : 'focus-within:border-primary/50'} border-white/10`}>
                        <textarea 
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                            className="flex-1 bg-transparent border-none focus:ring-0 text-white text-[14px] py-2.5 resize-none max-h-32 placeholder:text-white/20 px-3" 
                            placeholder={`Message pour ${selectedModel.name}...`} 
                            rows={1}
                        />
                        <div className="flex items-center gap-1 pb-1 pr-1">
                            <button 
                                onClick={handleSend}
                                disabled={isThinking || !input.trim()}
                                className={`text-white size-11 rounded-xl flex items-center justify-center transition-all shadow-lg disabled:opacity-30 disabled:shadow-none ${getButtonColor()}`}
                            >
                                <span className="material-symbols-outlined">arrow_upward</span>
                            </button>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};
