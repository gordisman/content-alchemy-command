import React, { useState, useRef, useEffect } from 'react';
import { Button as ShadButton } from "@/components/ui/button";
import { Mic, StopCircle, Play, Pause, Trash2, Upload, Loader2, Clock } from "lucide-react";
import { storage } from '../../lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { toast } from "sonner";

export default function AudioAssetEngine({
    formData,
    setFormData,
    isLocked
}) {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [isUploading, setIsUploading] = useState(false);

    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef(null);
    const timerRef = useRef(null);
    const audioPlayerRef = useRef(null);
    const fileInputRef = useRef(null);

    const audioURL = formData.post_audio_memo || '';

    const formatTime = (time) => {
        if (!time || isNaN(time)) return "0:00";
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const deleteFromStorage = async (url) => {
        if (!url || !url.includes('firebasestorage.googleapis.com')) return;
        try {
            const storageRef = ref(storage, url);
            await deleteObject(storageRef);
        } catch (err) {
            console.warn("Cleanup skipped:", err);
        }
    };

    const performUpload = async (blob, durationSec) => {
        setIsUploading(true);
        try {
            // Cleanup old if replacing
            if (audioURL) await deleteFromStorage(audioURL);

            const extension = blob.name ? blob.name.split('.').pop() : 'webm';
            const filename = `post_audio_memos/${Date.now()}_audio.${extension}`;
            const storageRef = ref(storage, filename);
            const snapshot = await uploadBytes(storageRef, blob);
            const downloadURL = await getDownloadURL(snapshot.ref);

            setFormData(prev => ({
                ...prev,
                post_audio_memo: downloadURL,
                post_audio_memo_duration: durationSec
            }));
            toast.success("Audio Memo Uploaded");
        } catch (err) {
            console.error(err);
            toast.error("Audio Upload Failed");
        } finally {
            setIsUploading(false);
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                performUpload(blob, recordingDuration);
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
            setRecordingDuration(0);
            timerRef.current = setInterval(() => setRecordingDuration(p => p + 1), 1000);
        } catch (err) {
            console.error(err);
            toast.error("Microphone Access Error");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file) performUpload(file, 0); // Duration will be detected by player
    };

    const handleDelete = async () => {
        if (audioURL) await deleteFromStorage(audioURL);
        setFormData(prev => ({
            ...prev,
            post_audio_memo: '',
            post_audio_memo_duration: 0
        }));
        setIsPlaying(false);
        setCurrentTime(0);
    };

    const togglePlayback = () => {
        if (isPlaying) audioPlayerRef.current?.pause();
        else audioPlayerRef.current?.play();
        setIsPlaying(!isPlaying);
    };

    const toggleSpeed = () => {
        const rates = [1, 1.5, 2];
        const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
        setPlaybackRate(nextRate);
        if (audioPlayerRef.current) audioPlayerRef.current.playbackRate = nextRate;
    };

    return (
        <div className="space-y-3 p-4 bg-muted/20 rounded-lg border border-border/50 relative">
            <label className="text-sm font-medium flex items-center justify-between">
                <span className="flex items-center gap-2">
                    <Mic className="w-4 h-4 text-muted-foreground" />
                    Audio Memo (Post Level)
                </span>
                {isUploading && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
            </label>

            {!audioURL && !isRecording && (
                <div className="flex gap-2">
                    <ShadButton type="button" variant="outline" className="flex-1 gap-2 h-9" onClick={startRecording} disabled={isLocked || isUploading}>
                        <Mic className="w-4 h-4" /> Start Recording
                    </ShadButton>
                    <ShadButton type="button" variant="secondary" className="gap-2 h-9 px-3" onClick={() => fileInputRef.current?.click()} disabled={isLocked || isUploading}>
                        <Upload className="w-4 h-4" />
                    </ShadButton>
                    <input type="file" ref={fileInputRef} className="hidden" accept="audio/*" onChange={handleFileUpload} />
                </div>
            )}

            {isRecording && (
                <ShadButton type="button" variant="destructive" className="w-full gap-2 animate-pulse h-9" onClick={stopRecording}>
                    <StopCircle className="w-4 h-4" /> Stop Recording ({recordingDuration}s)
                </ShadButton>
            )}

            {audioURL && (
                <div className="flex flex-col gap-2 bg-background p-3 rounded border border-border">
                    <div className="flex items-center gap-3">
                        <ShadButton type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={togglePlayback}>
                            {isPlaying ? <Pause className="w-4 h-4 fill-primary text-primary" /> : <Play className="w-4 h-4 fill-primary text-primary" />}
                        </ShadButton>

                        <div className="flex-1 flex flex-col justify-center gap-2">
                            <div className="relative w-full h-4 flex items-center group">
                                <input
                                    type="range" min="0" max={duration || 100} value={currentTime}
                                    onChange={(e) => {
                                        const t = parseFloat(e.target.value);
                                        if (audioPlayerRef.current) { audioPlayerRef.current.currentTime = t; setCurrentTime(t); }
                                    }}
                                    step="0.05"
                                    className="absolute inset-0 w-full h-1.5 bg-transparent appearance-none cursor-pointer z-10"
                                    style={{
                                        background: `linear-gradient(to right, hsl(var(--primary)) ${(currentTime / (duration || 1)) * 100}%, hsl(var(--secondary)) ${(currentTime / (duration || 1)) * 100}%)`,
                                        borderRadius: '999px'
                                    }}
                                />
                            </div>
                            <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                                <span>{formatTime(currentTime)}</span>
                                <span>{formatTime(duration || formData.post_audio_memo_duration)}</span>
                            </div>
                        </div>

                        <ShadButton type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs font-mono shrink-0 text-muted-foreground" onClick={toggleSpeed}>
                            {playbackRate}x
                        </ShadButton>

                        {!isLocked && (
                            <ShadButton type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0" onClick={handleDelete}>
                                <Trash2 className="w-4 h-4" />
                            </ShadButton>
                        )}
                    </div>

                    <audio
                        ref={audioPlayerRef} src={audioURL}
                        onTimeUpdate={() => setCurrentTime(audioPlayerRef.current?.currentTime || 0)}
                        onLoadedMetadata={() => setDuration(audioPlayerRef.current?.duration || 0)}
                        onEnded={() => setIsPlaying(false)}
                        className="hidden"
                    />
                </div>
            )}
        </div>
    );
}
