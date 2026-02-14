
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { MODELS, AIModel } from '../constants';

interface VideoGenProps {
    onBack: () => void;
}

type AspectRatio = "16:9" | "9:16";
type Resolution = "720p" | "1080p";

export const VideoGen: React.FC<VideoGenProps> = ({ onBack }) => {
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
    const [resolution, setResolution] = useState<Resolution>("720p");
    const [selectedEngine, setSelectedEngine] = useState<AIModel>(MODELS.find(m => m.id === 'veo-3') || MODELS[5]);
    const [loadingMessage, setLoadingMessage] = useState('');

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const videoEngines = MODELS.filter(m => m.type === 'video');

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                await processVoiceCommand(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            alert("Microphone access denied or not supported.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const processVoiceCommand = async (audioBlob: Blob) => {
        setIsGenerating(true);
        setLoadingMessage('Interpreting your voice...');

        try {
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = async () => {
                const base64Audio = (reader.result as string).split(',')[1];
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                
                // Use Gemini to transcribe and enrich the prompt
                const analysisResponse = await ai.models.generateContent({
                    model: 'gemini-3-flash-preview',
                    contents: {
                        parts: [
                            { inlineData: { mimeType: 'audio/webm', data: base64Audio } },
                            { text: `Transcribe this audio and convert it into a highly detailed cinematic video prompt for a motion engine. Focus on visual style, lighting, and camera movement based on the user's tone. Output only the refined prompt text.` }
                        ]
                    }
                });

                const refinedPrompt = analysisResponse.text || prompt;
                setPrompt(refinedPrompt);
                // Automatically proceed to video generation
                await executeVideoGeneration(refinedPrompt);
            };
        } catch (error) {
            console.error("Voice Processing Error:", error);
            setIsGenerating(false);
        }
    };

    const executeVideoGeneration = async (finalPrompt: string) => {
        setIsGenerating(true);
        setLoadingMessage(`Generating via ${selectedEngine.name}...`);
        setVideoUrl(null);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            let operation = await ai.models.generateVideos({
                model: 'veo-3.1-fast-generate-preview',
                prompt: finalPrompt,
                config: {
                    numberOfVideos: 1,
                    resolution: resolution,
                    aspectRatio: aspectRatio
                }
            });

            while (!operation.done) {
                await new Promise(resolve => setTimeout(resolve, 8000));
                operation = await ai.operations.getVideosOperation({ operation: operation });
            }

            const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
            if (downloadLink) {
                const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
                const blob = await response.blob();
                setVideoUrl(URL.createObjectURL(blob));
            }
        } catch (error: any) {
            console.error("Video Generation Error:", error);
            if (error?.message?.includes("Requested entity was not found")) {
                await (window as any).aistudio.openSelectKey();
            }
        } finally {
            setIsGenerating(false);
            setLoadingMessage('');
        }
    };

    const handleGenerateClick = () => {
        if (!prompt.trim() || isGenerating) return;
        executeVideoGeneration(prompt);
    };

    return (
        <div className="flex flex-col h-full bg-background-dark overflow-hidden">
            <header className="px-6 py-6 border-b border-white/5 sticky top-0 bg-background-dark/95 backdrop-blur-2xl z-20 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="size-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 hover:bg-white/10 transition-all">
                        <span className="material-symbols-outlined text-white/70">arrow_back</span>
                    </button>
                    <div>
                        <h1 className="text-lg font-bold">Video AI</h1>
                        <p className={`text-[9px] ${selectedEngine.color} font-bold uppercase tracking-widest`}>Engine: {selectedEngine.name}</p>
                    </div>
                </div>
                <div className={`size-10 rounded-full ${selectedEngine.bgColor} flex items-center justify-center border border-white/10`}>
                    <span className={`material-symbols-outlined ${selectedEngine.color}`}>{selectedEngine.icon}</span>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar pb-24">
                {/* Video Engine Selector */}
                <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 px-1">Select Motion Engine</p>
                    <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                        {videoEngines.map(m => (
                            <button
                                key={m.id}
                                onClick={() => setSelectedEngine(m)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border whitespace-nowrap transition-all ${
                                    selectedEngine.id === m.id ? 'bg-white/10 border-white/30 text-white shadow-neon' : 'bg-white/5 border-white/5 text-white/30'
                                }`}
                            >
                                <span className={`material-symbols-outlined text-[18px] ${m.color}`}>{m.icon}</span>
                                <span className="text-[10px] font-bold uppercase tracking-widest">{m.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="aspect-video w-full rounded-3xl bg-white/5 border border-white/10 relative overflow-hidden group shadow-inner">
                    {videoUrl ? (
                        <video src={videoUrl} controls autoPlay loop className="w-full h-full object-cover animate-in fade-in duration-700" />
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white/10 px-8 text-center">
                            {isGenerating ? (
                                <div className="flex flex-col items-center gap-6">
                                    <div className="relative size-20">
                                        <div className={`absolute inset-0 border-4 ${selectedEngine.color} opacity-10 rounded-full`}></div>
                                        <div className={`absolute inset-0 border-4 ${selectedEngine.color} border-t-transparent rounded-full animate-spin`}></div>
                                        <div className={`absolute inset-4 ${selectedEngine.bgColor} rounded-full animate-pulse flex items-center justify-center`}>
                                            <span className={`material-symbols-outlined ${selectedEngine.color} text-3xl`}>{selectedEngine.icon}</span>
                                        </div>
                                    </div>
                                    <p className={`text-xs font-bold uppercase tracking-[0.3em] ${selectedEngine.color} animate-pulse`}>{loadingMessage || `${selectedEngine.name} is creating...`}</p>
                                </div>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-6xl">movie</span>
                                    <p className="text-[10px] font-black uppercase tracking-widest">Dream cinematic motion with {selectedEngine.name}</p>
                                </>
                            )}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 px-1">Aspect</p>
                        <div className="flex gap-2">
                            {(["16:9", "9:16"] as AspectRatio[]).map((ratio) => (
                                <button key={ratio} onClick={() => setAspectRatio(ratio)} className={`flex-1 py-2 rounded-xl text-[10px] font-bold border transition-all ${aspectRatio === ratio ? 'bg-white/20 border-white/30 text-white' : 'bg-white/5 border-white/5 text-white/40'}`}>{ratio}</button>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 px-1">Quality</p>
                        <div className="flex gap-2">
                            {(["720p", "1080p"] as Resolution[]).map((res) => (
                                <button key={res} onClick={() => setResolution(res)} className={`flex-1 py-2 rounded-xl text-[10px] font-bold border transition-all ${resolution === res ? 'bg-white/20 border-white/30 text-white' : 'bg-white/5 border-white/5 text-white/40'}`}>{res}</button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex justify-between items-center px-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Scenario</p>
                        <button 
                            onMouseDown={startRecording}
                            onMouseUp={stopRecording}
                            onMouseLeave={stopRecording}
                            onTouchStart={startRecording}
                            onTouchEnd={stopRecording}
                            className={`flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-bold transition-all border ${isRecording ? 'bg-red-500/20 border-red-500/50 text-red-500 animate-pulse' : 'bg-white/5 border-white/10 text-white/40'}`}
                        >
                            <span className="material-symbols-outlined text-sm">{isRecording ? 'mic' : 'mic_none'}</span>
                            {isRecording ? 'LISTENING...' : 'VOICE COMMAND'}
                        </button>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 relative group">
                        <textarea 
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            className="w-full bg-transparent border-none focus:ring-0 text-white text-[14px] p-0 min-h-[100px] resize-none"
                            placeholder={isRecording ? "Listening to your instructions..." : `Describe motion and style for ${selectedEngine.name}...`}
                        />
                    </div>
                </div>

                <button 
                    onClick={handleGenerateClick}
                    disabled={isGenerating || !prompt.trim()}
                    className={`w-full h-14 ${selectedEngine.bgColor.replace('/10', '')} text-white rounded-2xl font-bold text-lg shadow-neon flex items-center justify-center gap-3 transition-all disabled:opacity-30`}
                >
                    <span className="material-symbols-outlined">movie_edit</span>
                    {isGenerating ? 'Processing...' : `Generate ${selectedEngine.name} Stream`}
                </button>
            </div>
        </div>
    );
};
