import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Copy, Download, X, Play, Pause, FileText, Link as LinkIcon, Globe, Image as ImageIcon } from "lucide-react";

export default function IdeaManifestoModal({ idea, open, onClose, pillars = [] }) {
    if (!idea) return null;

    // --- Pillar Logic ---
    const pillarData = pillars.find(p => p.id === idea.pillar);
    const pillarColor = pillarData?.color || '#94a3b8'; // Default slate-400

    // --- Audio Logic ---
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [playerDuration, setPlayerDuration] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1);
    const audioRef = useRef(null);

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            const dur = audioRef.current.duration;
            if (isFinite(dur)) {
                setPlayerDuration(dur);
            }
        }
    };

    const handleSeek = (e) => {
        const time = parseFloat(e.target.value);
        if (audioRef.current && isFinite(time)) {
            audioRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    const toggleSpeed = () => {
        const rates = [1, 1.5, 2, 0.5];
        const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
        setPlaybackRate(nextRate);
        if (audioRef.current) {
            audioRef.current.playbackRate = nextRate;
        }
    };

    const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
    };

    const formatTime = (time) => {
        if (!time || !isFinite(time)) return "00:00";
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    useEffect(() => {
        // Reset when idea changes
        setIsPlaying(false);
        setCurrentTime(0);
        setPlayerDuration(0);

        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                setIsPlaying(false);
            }
        };
    }, [idea, open]);

    // --- Helpers ---
    const copyToClipboard = (text) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard!");
    };

    const handleCopyManifesto = () => {
        const content = `
# ${idea.master_title}

## Narrative Hook
${idea.concept || 'No content.'}

## Universal Hashtags
${idea.universal_hashtags || '#NoHashtags'}

## Resources
${(idea.resources || []).map(r => `- ${r.label}: ${r.uri}`).join('\n')}
        `;
        copyToClipboard(content);
        toast.success("Manifesto copied to clipboard");
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl h-[85vh] flex flex-col p-0 gap-0 bg-[#0F1117] text-slate-200 border-slate-800">

                {/* Header */}
                <div className="flex flex-col p-6 pb-5 border-b border-border/40 shrink-0 gap-2.5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <h2 className="text-xl font-bold text-white tracking-tight">Idea Manifesto</h2>
                            <Badge variant="outline" className="text-xs font-mono border-indigo-500/40 text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                                #IDEA-{idea.idea_number || idea.id?.slice(-3) || '000'}
                            </Badge>
                        </div>
                        <Button
                            onClick={handleCopyManifesto}
                            className="bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-500/20 transition-all active:scale-95"
                        >
                            <Copy className="w-4 h-4 mr-2" />
                            Copy Manifesto
                        </Button>
                    </div>

                    {/* Pillar Badge (Now on its own line) */}
                    {pillarData && (
                        <div className="flex items-center gap-2 w-fit px-2 py-1 rounded bg-slate-900/50 border border-slate-800">
                            <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: pillarColor }}
                            />
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                                {pillarData.name}
                            </span>
                        </div>
                    )}
                </div>

                {/* Body */}
                <ScrollArea className="flex-1">
                    <div className="p-8 space-y-10">

                        {/* Huge Title */}
                        <div>
                            <h1 className="text-3xl font-bold text-white leading-tight">
                                {idea.master_title}
                            </h1>
                        </div>

                        {/* Narrative Hook */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Narrative Hook</h3>
                            </div>
                            <div className="text-base text-slate-300 leading-relaxed whitespace-pre-wrap">
                                {idea.concept || "No narrative hook defined."}
                            </div>
                        </div>

                        {/* Universal Hashtags */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Universal Hashtags</h3>
                            <div className="text-base text-indigo-400 font-medium font-mono leading-relaxed">
                                {idea.universal_hashtags || "Hashtags are auto-generated in here if the button is pushed."}
                            </div>
                        </div>

                        {/* Audio Memo - REPLICATED FROM EDIT IDEA */}
                        {idea.idea_audio_memo && (
                            <div className="space-y-3">
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Audio Memo</h3>
                                <div className="flex flex-col gap-2 bg-[#161922] p-3 rounded border border-slate-800">
                                    <div className="flex items-center gap-3">
                                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={togglePlay}>
                                            {isPlaying ? <Pause className="w-4 h-4 fill-primary text-primary" /> : <Play className="w-4 h-4 fill-primary text-primary" />}
                                        </Button>

                                        {/* Reference Player Slider */}
                                        <div className="flex-1 flex flex-col justify-center gap-2">
                                            <div className="relative w-full h-4 flex items-center group">
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max={isFinite(playerDuration) && playerDuration > 0 ? playerDuration : 100}
                                                    value={isFinite(currentTime) ? currentTime : 0}
                                                    onChange={handleSeek}
                                                    step="0.05"
                                                    className="absolute inset-0 w-full h-1.5 bg-transparent appearance-none cursor-pointer focus:outline-none z-10 
                                                        [&::-webkit-slider-thumb]:appearance-none 
                                                        [&::-webkit-slider-thumb]:w-3 
                                                        [&::-webkit-slider-thumb]:h-3 
                                                        [&::-webkit-slider-thumb]:rounded-full 
                                                        [&::-webkit-slider-thumb]:bg-primary 
                                                        [&::-webkit-slider-thumb]:shadow-[0_0_0_2px_hsl(var(--background))]
                                                        [&::-webkit-slider-thumb]:transition-transform
                                                        [&::-webkit-slider-thumb]:hover:scale-125
                                                        [&::-moz-range-thumb]:w-3
                                                        [&::-moz-range-thumb]:h-3
                                                        [&::-moz-range-thumb]:border-none
                                                        [&::-moz-range-thumb]:bg-primary
                                                        "
                                                    style={{
                                                        background: `linear-gradient(to right, hsl(var(--primary)) ${(currentTime / (playerDuration || 1)) * 100}%, #334155 ${(currentTime / (playerDuration || 1)) * 100}%)`,
                                                        borderRadius: '999px'
                                                    }}
                                                />
                                            </div>
                                            <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                                                <span>{formatTime(currentTime)}</span>
                                                <span>{formatTime(playerDuration || idea.idea_audio_memo_duration)}</span>
                                            </div>
                                        </div>

                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 px-2 text-xs font-mono shrink-0 text-muted-foreground hover:text-foreground"
                                            onClick={toggleSpeed}
                                        >
                                            {playbackRate}x
                                        </Button>
                                    </div>
                                    <audio
                                        ref={audioRef}
                                        src={idea.idea_audio_memo}
                                        onTimeUpdate={handleTimeUpdate}
                                        onLoadedMetadata={handleLoadedMetadata}
                                        onEnded={handleEnded}
                                        className="hidden"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Resource Links - REPLICATED FROM EDIT IDEA + USER REQUEST */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Resource Links</h3>

                            <div className="space-y-1 pt-2">
                                {idea.resources && idea.resources.length > 0 ? (
                                    idea.resources.map((res, i) => (
                                        <div key={i} className="flex items-center justify-between text-xs p-2 bg-[#161922] rounded border border-slate-800 group hover:border-slate-700 transition-colors">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="p-2 bg-slate-800/50 rounded-full shrink-0">
                                                    {res.type === 'gdrive' ? <ImageIcon className="w-4 h-4 text-blue-500" /> : <LinkIcon className="w-4 h-4 text-slate-400" />}
                                                </div>
                                                <div className="flex flex-col overflow-hidden">
                                                    <span className="font-medium truncate text-slate-200">{res.label || res.uri}</span>
                                                    <a href={res.uri} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-indigo-400 hover:underline truncate block text-[10px]">
                                                        {res.uri}
                                                    </a>
                                                </div>
                                            </div>
                                            {/* Open Button (User requested matching the screenshot found in doc links) */}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="shrink-0 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/20 font-medium"
                                                onClick={() => window.open(res.uri, '_blank')}
                                            >
                                                Open
                                            </Button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-sm text-slate-600 italic">No resources linked.</div>
                                )}
                            </div>
                        </div>

                    </div>
                </ScrollArea>

                {/* Footer */}
                <div className="p-6 border-t border-border/40 shrink-0 flex justify-end gap-3 bg-[#0F1117]">
                    <DialogClose asChild>
                        <Button className="bg-[#5d5dff] hover:bg-[#4b4bff] text-white min-w-[100px]">
                            Close
                        </Button>
                    </DialogClose>
                </div>

            </DialogContent>
        </Dialog>
    );
}
