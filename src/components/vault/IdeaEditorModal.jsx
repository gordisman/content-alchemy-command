import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
// Safe icons only
import { Loader2, X, Plus, Trash2, Link as LinkIcon, FileText, Mic, StopCircle, Play, Pause, ChevronDown, Check, Globe, Upload, Image as ImageIcon } from 'lucide-react';
import { useSettings } from '../../hooks/useSettings';
import { toast } from "sonner";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { storage, auth } from '../../lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

export default function IdeaEditorModal({ open, onClose, idea, onSave, onDelete }) {
    const { settings } = useSettings();
    const rawPillars = settings?.content_pillars || [];
    const pillars = rawPillars.filter(p => p.active !== false); // Hide inactive pillars

    // Default to first pillar if available (which should be the Anchor)
    const defaultPillarId = pillars.length > 0 ? pillars[0].id : '';

    // Form State
    const [formData, setFormData] = useState({
        master_title: '',
        concept: '',
        pillar: defaultPillarId,
        status: 'incubating',
        resources: [],
        idea_audio_memo: '',
        idea_audio_memo_duration: 0
    });

    // UI State
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Audio Recorder State
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState(null);
    const [audioURL, setAudioURL] = useState(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerRef = useRef(null);
    const [recordingDuration, setRecordingDuration] = useState(0);

    // Audio Player State - SEEK BAR ENABLED, SPEED CONTROL ENABLED
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [playerDuration, setPlayerDuration] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1);
    const audioPlayerRef = useRef(null);
    const fileInputRef = useRef(null);

    // Resource Input State
    const [newResType, setNewResType] = useState('image');
    const [newResLabel, setNewResLabel] = useState('');
    const [newResUri, setNewResUri] = useState('');



    useEffect(() => {
        if (idea) {
            setFormData({
                master_title: idea.master_title || '',
                concept: idea.concept || '',
                pillar: idea.pillar || defaultPillarId,
                status: idea.status || 'incubating',
                resources: Array.isArray(idea.resources) ? idea.resources.map(r => {
                    if (typeof r === 'string') return { type: 'web_link', label: '', uri: r };
                    return r;
                }) : [],
                idea_audio_memo: idea.idea_audio_memo || '',
                idea_audio_memo_duration: idea.idea_audio_memo_duration || 0
            });
            if (idea.idea_audio_memo) {
                setAudioURL(idea.idea_audio_memo);
            } else {
                setAudioURL(null);
            }
            setAudioBlob(null);
        } else {
            setFormData({
                master_title: '',
                concept: '',
                pillar: defaultPillarId,
                status: 'incubating',
                resources: [],
                idea_audio_memo: '',
                idea_audio_memo_duration: 0
            });
            setAudioURL(null);
            setAudioBlob(null);
        }
        // Reset Resource Inputs
        setNewResLabel('');
        setNewResUri('');
        setNewResType('image');

        // Reset Audio State
        setRecordingDuration(0);
        setIsRecording(false);
        setIsPlaying(false);
        setCurrentTime(0);
        setPlayerDuration(0);
        if (timerRef.current) clearInterval(timerRef.current);

        return () => {
            // Stop recording if active
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                try {
                    mediaRecorderRef.current.stop();
                    mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
                } catch (e) {
                    console.log("Audio cleanup error:", e);
                }
            }
            if (timerRef.current) clearInterval(timerRef.current);
            setIsRecording(false);
            setRecordingDuration(0);

            // Stop playback
            if (audioPlayerRef.current) {
                audioPlayerRef.current.pause();
                setIsPlaying(false);
            }
        };
    }, [idea, open, defaultPillarId]);

    if (!open) return null;

    // --- Audio Logic ---
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                const url = URL.createObjectURL(blob);
                setAudioURL(url);
                setFormData(prev => ({ ...prev, idea_audio_memo_duration: recordingDuration }));
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
            setRecordingDuration(0);

            timerRef.current = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);

        } catch (err) {
            console.error("Error accessing microphone:", err);
            toast.error("Microphone Access Error", {
                description: "Could not access microphone. Please check permissions."
            });
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
        }
    };

    const handleAudioUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setAudioBlob(file);
            setAudioURL(url);
            setFormData(prev => ({ ...prev, idea_audio_memo: '', idea_audio_memo_duration: 0 })); // Reset so duration is recalculated
            setIsPlaying(false);
            setCurrentTime(0);
            setPlayerDuration(0);
        }
    };

    const deleteAudio = async () => {
        const oldUrl = formData.idea_audio_memo;
        if (oldUrl && oldUrl.includes('firebasestorage.googleapis.com')) {
            try {
                const storageRef = ref(storage, oldUrl);
                await deleteObject(storageRef);
                toast.info("Previous audio memo cleaned from storage");
            } catch (err) {
                console.error("Cleanup failed:", err);
            }
        }
        setAudioBlob(null);
        setAudioURL(null);
        setFormData(prev => ({ ...prev, idea_audio_memo: '', idea_audio_memo_duration: 0 }));
        setIsPlaying(false);
        setCurrentTime(0);
        setPlayerDuration(0);
    };

    // --- Player Logic ---
    const togglePlayback = () => {
        if (!audioPlayerRef.current) return;

        if (isPlaying) {
            audioPlayerRef.current.pause();
            setIsPlaying(false);
        } else {
            audioPlayerRef.current.play();
            setIsPlaying(true);
        }
    };

    const handleTimeUpdate = () => {
        if (audioPlayerRef.current) {
            setCurrentTime(audioPlayerRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (audioPlayerRef.current) {
            const dur = audioPlayerRef.current.duration;
            if (isFinite(dur)) {
                setPlayerDuration(dur);
            }
        }
    };

    const handleSeek = (e) => {
        const time = parseFloat(e.target.value);
        if (audioPlayerRef.current && isFinite(time)) {
            audioPlayerRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    const toggleSpeed = () => {
        const rates = [1, 1.5, 2, 0.5];
        const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
        setPlaybackRate(nextRate);
        if (audioPlayerRef.current) {
            audioPlayerRef.current.playbackRate = nextRate;
        }
    };

    const detectMediaType = (fileOrUrl) => {
        // 1. OBJECT CHECK
        if (typeof fileOrUrl === 'object') {
            const type = fileOrUrl?.type || '';
            const mimeType = fileOrUrl?.mimeType || '';

            // Strictly high-level selection matches
            if (['video', 'image', 'document'].includes(type)) return type;
            if (mimeType.startsWith('video/')) return 'video';
            if (mimeType.startsWith('application/pdf')) return 'document';
            if (type === 'link' || type === 'web_link' || type === 'gdrive') return 'link';
        }

        // 2. URL ANALYSIS (Hard evidence only)
        const urlStr = typeof fileOrUrl === 'string' ? fileOrUrl : fileOrUrl?.uri || fileOrUrl?.name || '';
        if (!urlStr) return 'image';

        const name = urlStr.split(/[#?]/)[0];
        const ext = name.split('.').pop().toLowerCase();

        const videoExts = ['mp4', 'mov', 'webm', 'm4v', 'avi', 'mkv'];
        const docExts = ['pdf', 'doc', 'docx', 'txt', 'ppt', 'pptx', 'xls', 'xlsx'];
        const imgExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif'];

        if (videoExts.includes(ext)) return 'video';
        if (docExts.includes(ext)) return 'document';
        if (imgExts.includes(ext)) return 'image';

        // 3. NO GUESSTIMATING: Default to generic link if no evidence
        return 'link';
    };

    const formatTime = (time) => {
        if (!time || !isFinite(time)) return "00:00";
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    // --- Resources Logic ---
    const addResource = () => {
        if (!newResUri.trim()) return;
        let uri = newResUri.trim();

        const resourceToAdd = {
            type: newResType,
            label: newResLabel.trim() || 'Resource',
            uri
        };

        // If type is generic 'link' or similar default, try to detect more specific type from extension
        if (resourceToAdd.type === 'link' || resourceToAdd.type === 'web_link' || !resourceToAdd.type) {
            const detected = detectMediaType(uri);
            if (detected !== 'link') {
                resourceToAdd.type = detected;
            }
        }

        setFormData(prev => ({
            ...prev,
            resources: [...prev.resources, resourceToAdd]
        }));

        toast.success("Resource added to idea");
        setNewResUri('');
        setNewResLabel('');
        setNewResType('link'); // Default to link for fresh input
    };

    const removeResource = (index) => {
        setFormData(prev => ({
            ...prev,
            resources: prev.resources.filter((_, i) => i !== index)
        }));
    };

    const getResourceIcon = (type) => {
        // CONTENT-AWARE ICONS (The Great Alignment)
        if (type === 'video') return <Play className="w-3 h-3 text-indigo-500" />;
        if (type === 'document') return <FileText className="w-3 h-3 text-amber-500" />;
        if (type === 'image') return <ImageIcon className="w-3 h-3 text-emerald-500" />;
        // Backward compatibility for legacy types
        if (type === 'gdrive' || type === 'local_file') return <FileText className="w-3 h-3 text-blue-500" />;

        return <LinkIcon className="w-3 h-3 text-muted-foreground" />;
    };

    // --- Submit Logic ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            let finalResources = [...formData.resources];

            // Auto-add pending resource if user forgot to click plus
            if (newResUri.trim()) {
                let uri = newResUri.trim();
                let type = newResType;
                let label = newResLabel.trim() || 'Resource';

                if (!/^https?:\/\//i.test(uri) && !uri.startsWith('gs://')) {
                    uri = 'https://' + uri;
                }

                const resourceToAdd = { type, label, uri };
                // Double-check type if it was generic
                if (type === 'link' || type === 'web_link') {
                    const detected = detectMediaType(uri);
                    if (detected !== 'link') resourceToAdd.type = detected;
                }

                finalResources.push(resourceToAdd);
                console.log("Auto-committing pending resource on save:", label);
            }

            let finalAudioUrl = formData.idea_audio_memo;

            // Explicit Auth Check for debugging
            if (!auth.currentUser) {
                console.error("User is not authenticated. Upload will fail.");
                toast.error("Authentication Error", {
                    description: "You are not logged in. Please refresh or sign in again."
                });
                setIsSubmitting(false);
                return;
            }

            // Upload Audio
            if (audioBlob) {
                // CLEANUP OLD ASSET: If we have a new blob, delete the old cloud file first
                if (formData.idea_audio_memo && formData.idea_audio_memo.includes('firebasestorage.googleapis.com')) {
                    try {
                        const oldRef = ref(storage, formData.idea_audio_memo);
                        await deleteObject(oldRef);
                        console.log("Cleanup: Old audio memo purged during replacement.");
                    } catch (e) {
                        console.warn("Cleanup failed during audio replacement:", e);
                    }
                }

                console.log("Starting upload for user:", auth.currentUser.uid);
                const extension = audioBlob.name ? audioBlob.name.split('.').pop() : 'webm';
                const filename = `audio_memos/${Date.now()}_audio.${extension}`;
                const storageRef = ref(storage, filename);
                const snapshot = await uploadBytes(storageRef, audioBlob);
                finalAudioUrl = await getDownloadURL(snapshot.ref);
            }

            // Determine duration: recordingDuration if recorded, playerDuration if uploaded
            const finalDuration = recordingDuration > 0 ? recordingDuration : (playerDuration > 0 ? playerDuration : formData.idea_audio_memo_duration);

            const dataToSave = {
                ...formData,
                resources: finalResources,
                idea_audio_memo: finalAudioUrl,
                idea_audio_memo_duration: finalDuration
            };

            await onSave(dataToSave);

            // Sync visual list and clear inputs immediately for feedback
            setFormData(dataToSave);
            setNewResLabel('');
            setNewResUri('');
            setNewResType('link');

            // Only close if creating new idea. If editing, keep open but maybe show success state/toast (defaulting to keep open as requested)
            if (!idea) {
                onClose();
            }
        } catch (error) {
            console.error("Failed to save idea:", error);
            toast.error("Save Error", {
                description: "Failed to save idea: " + error.message
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const selectedPillar = pillars.find(p => p.id === formData.pillar) || pillars.find(p => p.id === defaultPillarId);

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 bg-card border-border">
                <DialogHeader className="flex flex-row items-center justify-between p-6 border-b border-border bg-card shrink-0 space-y-0">
                    <div className="flex flex-col gap-1 text-left">
                        <DialogTitle>{idea ? 'Edit Idea' : 'Capture New Idea'}</DialogTitle>
                        <p className="text-sm text-muted-foreground">
                            {idea ? `#IDEA-${idea.idea_number}` : 'Quickly capture your next breakthrough'}
                        </p>
                    </div>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Top Row: Dropdown & Status */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Content Pillar</label>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="w-full justify-between">
                                        <div className="flex items-center gap-2 truncate">
                                            {selectedPillar ? (
                                                <>
                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedPillar.color }} />
                                                    <span className="truncate">{selectedPillar.name}</span>
                                                </>
                                            ) : (
                                                <span>Select Pillar...</span>
                                            )}
                                        </div>
                                        <ChevronDown className="w-4 h-4 opacity-50" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-[300px] max-h-80 overflow-y-auto" align="start">
                                    {pillars.filter(p => !p.disabled).map(p => (
                                        <DropdownMenuItem
                                            key={p.id}
                                            onClick={() => setFormData(prev => ({ ...prev, pillar: p.id }))}
                                            className="gap-2"
                                        >
                                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                                            <span className="truncate flex-1">{p.name}</span>
                                            {formData.pillar === p.id && <Check className="w-4 h-4 ml-auto" />}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Status</label>
                            <div className="flex bg-muted/50 p-1 rounded-lg">
                                {['incubating', 'ready', 'completed'].map(status => (
                                    <button
                                        key={status}
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, status }))}
                                        className={`
                                            flex-1 text-xs font-medium py-1.5 px-2 rounded-md capitalize transition-all
                                            ${formData.status === status
                                                ? 'bg-background shadow-sm text-foreground ring-1 ring-border'
                                                : 'text-muted-foreground hover:bg-muted/80'}
                                        `}
                                    >
                                        {status}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Title */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Master Title / Hook</label>
                        <Input
                            value={formData.master_title}
                            onChange={e => setFormData(prev => ({ ...prev, master_title: e.target.value }))}
                            placeholder="e.g. The Future of AI Content..."
                            className="text-lg font-medium"
                            required
                        />
                    </div>

                    {/* Concept */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Concept & Notes</label>
                        <textarea
                            className="flex min-h-[300px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y font-mono"
                            placeholder="Describe the core idea, key takeaways, or rough outline..."
                            value={formData.concept}
                            onChange={e => setFormData(prev => ({ ...prev, concept: e.target.value }))}
                        />
                    </div>

                    {/* Audio Recorder */}
                    <div className="space-y-2 p-4 bg-muted/20 rounded-lg border border-border/50">
                        <label className="text-sm font-medium flex items-center justify-between">
                            <span className="flex items-center gap-2"><Mic className="w-4 h-4 text-muted-foreground" /> Audio Memo</span>
                        </label>

                        {!audioURL && !isRecording && (
                            <div className="flex gap-2">
                                <Button type="button" variant="outline" className="flex-1 gap-2" onClick={startRecording}>
                                    <Mic className="w-4 h-4" /> Start Recording
                                </Button>
                                <Button type="button" variant="secondary" className="gap-2" onClick={() => fileInputRef.current?.click()}>
                                    <Upload className="w-4 h-4" /> Upload
                                </Button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept=".mp3, .wav, .m4a, .aac, .aiff, audio/*"
                                    onChange={handleAudioUpload}
                                />
                            </div>
                        )}

                        {isRecording && (
                            <Button type="button" variant="destructive" className="w-full gap-2 animate-pulse" onClick={stopRecording}>
                                <StopCircle className="w-4 h-4" /> Stop Recording ({recordingDuration}s)
                            </Button>
                        )}

                        {audioURL && (
                            <div className="flex flex-col gap-2 bg-background p-3 rounded border border-border">
                                <div className="flex items-center gap-3">
                                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={togglePlayback}>
                                        {isPlaying ? <Pause className="w-4 h-4 fill-primary text-primary" /> : <Play className="w-4 h-4 fill-primary text-primary" />}
                                    </Button>

                                    {/* Progress Bar (Restored) */}
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
                                                    background: `linear-gradient(to right, hsl(var(--primary)) ${(currentTime / (playerDuration || 1)) * 100}%, hsl(var(--secondary)) ${(currentTime / (playerDuration || 1)) * 100}%)`,
                                                    borderRadius: '999px'
                                                }}
                                            />
                                        </div>
                                        <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                                            <span>{formatTime(currentTime)}</span>
                                            <span>{formatTime(playerDuration || (audioBlob ? recordingDuration : formData.idea_audio_memo_duration))}</span>
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

                                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0" onClick={deleteAudio}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>

                                <audio
                                    ref={audioPlayerRef}
                                    src={audioURL}
                                    onTimeUpdate={handleTimeUpdate}
                                    onLoadedMetadata={handleLoadedMetadata}
                                    onEnded={() => setIsPlaying(false)}
                                    className="hidden"
                                />
                            </div>
                        )}
                    </div>

                    {/* Resources */}
                    <div className="space-y-3 p-4 bg-muted/20 rounded-lg border border-border/50">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <LinkIcon className="w-4 h-4 text-muted-foreground" />
                            Resources
                        </label>

                        <div className="space-y-2">
                            <div className="grid grid-cols-[auto,1fr] gap-2 items-start">
                                {/* Type Selector */}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm" className="w-[110px] justify-between h-9">
                                            <span className="flex items-center gap-2 truncate text-xs">
                                                {getResourceIcon(newResType)}
                                                <span className="capitalize">{newResType}</span>
                                            </span>
                                            <ChevronDown className="w-3 h-3 opacity-50" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start">
                                        <DropdownMenuItem onClick={() => setNewResType('image')} className="gap-2 text-xs">
                                            <ImageIcon className="w-3 h-3 text-emerald-500" /> Image
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setNewResType('video')} className="gap-2 text-xs">
                                            <Play className="w-3 h-3 text-indigo-500" /> Video
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setNewResType('document')} className="gap-2 text-xs">
                                            <FileText className="w-3 h-3 text-amber-500" /> Document
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setNewResType('link')} className="gap-2 text-xs">
                                            <LinkIcon className="w-3 h-3 text-muted-foreground" /> Reference Link
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                {/* Inputs */}
                                <div className="grid gap-2">
                                    <Input
                                        placeholder="Label (e.g. Research PDF)"
                                        value={newResLabel}
                                        onChange={e => setNewResLabel(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addResource())}
                                        className="h-9 text-xs"
                                    />
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder={newResType === 'local_file' ? "File path..." : "https://..."}
                                            value={newResUri}
                                            onChange={e => setNewResUri(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addResource())}
                                            className="h-9 text-xs flex-1"
                                        />
                                        <Button type="button" size="sm" variant="secondary" onClick={addResource} className="h-9 w-9 p-0">
                                            <Plus className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {formData.resources.length > 0 && (
                            <div className="space-y-1 pt-2">
                                {formData.resources.map((res, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-xs p-2 bg-background rounded border border-border group hover:border-primary/50 transition-colors">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            {(() => {
                                                // Predictable Detection: Respect user choice or hard evidence
                                                const type = detectMediaType(res);

                                                const styles = {
                                                    video: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
                                                    document: "bg-amber-500/10 text-amber-400 border-amber-500/20",
                                                    image: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                                                    link: "bg-muted text-muted-foreground border-border"
                                                };

                                                const style = styles[type] || styles.link;

                                                return (
                                                    <div className={`p-2 rounded-full shrink-0 border shadow-sm ${style}`}>
                                                        {type === 'video' && <Play className="w-4 h-4" />}
                                                        {type === 'document' && <FileText className="w-4 h-4" />}
                                                        {type === 'image' && <ImageIcon className="w-4 h-4" />}
                                                        {type === 'link' && <LinkIcon className="w-4 h-4" />}
                                                    </div>
                                                );
                                            })()}
                                            <div className="flex flex-col overflow-hidden">
                                                <span className="font-medium truncate">{res.label || res.uri}</span>
                                                <a href={res.uri} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:underline truncate block text-[10px]">
                                                    {res.uri}
                                                </a>
                                            </div>
                                        </div>
                                        <button type="button" onClick={() => removeResource(idx)} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity p-1">
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-between items-center p-4 pb-12 md:pb-6 border-t border-border shrink-0 bg-card">
                        <div className="flex gap-2">
                            {idea && onDelete && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => onDelete(idea)}
                                    className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                                >
                                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                                </Button>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                {idea ? 'Save Changes' : 'Create Idea'}
                            </Button>
                        </div>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
