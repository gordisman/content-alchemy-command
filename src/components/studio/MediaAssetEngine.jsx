import React, { useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Upload, Loader2, Trash2, Link as LinkIcon, Image as ImageIcon,
    FileText, Play, ExternalLink, AlertTriangle, Sparkles, CheckCircle2,
    ArrowUpRight, Cloud, Globe, Box, Laptop, Database, X
} from "lucide-react";
import { storage } from '../../lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject, uploadBytes } from 'firebase/storage';
import { toast } from "sonner";

export default function MediaAssetEngine({
    formData,
    setFormData,
    currentIdea,
    setIsLightboxOpen,
    setLightboxMedia,
    detectMediaType
}) {
    const [isMediaUploading, setIsMediaUploading] = useState(false);
    const [isThumbnailUploading, setIsThumbnailUploading] = useState(false);
    const [isCaptionUploading, setIsCaptionUploading] = useState(false);
    const [isReplacing, setIsReplacing] = useState(false);
    const [previewError, setPreviewError] = useState(null);
    const [isDragging, setIsDragging] = useState(false);

    const mediaFileInputRef = useRef(null);
    const thumbnailInputRef = useRef(null);
    const captionInputRef = useRef(null);
    const currentUploadTaskRef = useRef(null);

    const detectedType = detectMediaType(formData.media?.url);
    const hasTypeMismatch = formData.media?.url &&
        detectedType !== 'link' &&
        (formData.media?.type || 'image') !== detectedType;

    const triggerMediaUpload = (source = 'unknown') => {
        if (formData.is_locked) return;
        setIsReplacing(true);
        // Small delay to ensure any disabled state on the input is lifted before click
        setTimeout(() => {
            if (mediaFileInputRef.current) {
                console.log(`Triggering upload from: ${source}`);
                mediaFileInputRef.current.click();
            }
        }, 10);
    };

    const handleCancelUpload = () => {
        if (currentUploadTaskRef.current) {
            currentUploadTaskRef.current.cancel();
            currentUploadTaskRef.current = null;
            setIsMediaUploading(false);
            toast.info("Upload cancelled");
        }
    };

    const handleThumbnailUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file || formData.is_locked) return;

        setIsThumbnailUploading(true);
        try {
            // Cleanup old thumbnail if replacing
            if (formData.media?.thumbnail_url) await deleteFromStorage(formData.media.thumbnail_url);

            const filename = `thumbnails/${Date.now()}_${file.name}`;
            const storageRef = ref(storage, filename);
            const snapshot = await uploadBytes(storageRef, file);
            const url = await getDownloadURL(snapshot.ref);

            setFormData(p => ({
                ...p,
                media: { ...p.media, thumbnail_url: url }
            }));
            toast.success("Thumbnail uploaded");
        } catch (err) {
            console.error(err);
            toast.error("Thumbnail upload failed");
        } finally {
            setIsThumbnailUploading(false);
            if (e.target) e.target.value = '';
        }
    };

    const handleCaptionUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file || formData.is_locked) return;

        setIsCaptionUploading(true);
        try {
            // Cleanup old caption if replacing
            if (formData.media?.caption_url) await deleteFromStorage(formData.media.caption_url);

            const filename = `captions/${Date.now()}_${file.name}`;
            const storageRef = ref(storage, filename);
            const snapshot = await uploadBytes(storageRef, file);
            const url = await getDownloadURL(snapshot.ref);

            setFormData(p => ({
                ...p,
                media: { ...p.media, caption_url: url }
            }));
            toast.success("Captions vaulted successfully");
        } catch (err) {
            console.error(err);
            toast.error("Caption upload failed");
        } finally {
            setIsCaptionUploading(false);
            if (e.target) e.target.value = '';
        }
    };

    const handleMediaFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) performUpload(file);
        // CRITICAL: Clear value so re-selecting same file works after deletion
        if (e.target) e.target.value = '';
    };

    // Cleanup helper for storage
    const deleteFromStorage = async (url) => {
        if (!url || !url.includes('firebasestorage.googleapis.com')) return;
        try {
            const storageRef = ref(storage, url);
            await deleteObject(storageRef);
            console.log("Storage asset cleaned up:", url);
        } catch (err) {
            console.warn("Storage cleanup failed (might already be gone):", err);
        }
    };

    const performUpload = async (file) => {
        if (formData.is_locked) return;
        setIsMediaUploading(true);

        // Cleanup old media if replacing
        if (formData.media?.url) await deleteFromStorage(formData.media.url);

        const filename = `vault/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, filename);
        const uploadTask = uploadBytesResumable(storageRef, file);
        currentUploadTaskRef.current = uploadTask;

        uploadTask.on('state_changed',
            null,
            (error) => {
                console.error(error);
                setIsMediaUploading(false);
                toast.error("Upload failed");
            },
            async () => {
                const url = await getDownloadURL(uploadTask.snapshot.ref);
                const type = detectMediaType(file.name);
                setFormData(p => ({
                    ...p,
                    media: {
                        ...p.media,
                        url,
                        source: 'firebase',
                        type: type === 'link' ? 'image' : type,
                        thumbnail_url: type === 'video' ? (p.media.thumbnail_url || '') : '',
                        caption_url: type === 'video' ? (p.media.caption_url || '') : ''
                    }
                }));
                setIsMediaUploading(false);
                setPreviewError(null);
                toast.success("File uploaded to Vault");
            }
        );
    };

    const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = () => setIsDragging(false);
    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) performUpload(file);
    };

    const handleMediaUrlChange = (url) => {
        setPreviewError(null);
        setFormData(p => ({
            ...p,
            media: { ...p.media, url, source: url.includes('google.com') ? 'gdrive' : 'external' }
        }));
    };

    const handlePromoteResource = (resource) => {
        setPreviewError(null);
        setFormData(p => ({
            ...p,
            media: {
                ...p.media,
                url: resource.uri,
                source: resource.type === 'gdrive' ? 'gdrive' : 'external',
                type: detectMediaType(resource.uri) === 'link' ? 'image' : detectMediaType(resource.uri)
            }
        }));
        toast.success(`Promoted: ${resource.label}`);
    };

    const handleLockedClick = (e) => {
        if (formData.is_locked) {
            e.preventDefault();
            e.stopPropagation();
            toast.info("Creative is Locked. Unlock to edit assets.", { duration: 2000 });
        }
    };

    return (
        <div className="space-y-4 pt-6 border-t mt-6 relative" onClick={handleLockedClick}>
            {formData.is_locked && <div className="absolute inset-0 z-50 cursor-pointer" />}
            <div className="flex items-center justify-between">
                <Label className="text-base font-semibold text-foreground flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-indigo-500" />
                    Media / Assets (Final Output)
                </Label>
                <div className="flex items-center gap-2">
                    {(() => {
                        const rawPostRes = formData.resources;
                        const postResources = Array.isArray(rawPostRes) ? rawPostRes : (rawPostRes?.links || []);
                        const ideaResources = currentIdea?.resources || [];
                        const allResources = [...postResources, ...ideaResources].filter((item, index, self) =>
                            index === self.findIndex((t) => (t.uri === item.uri && t.label === item.label))
                        );

                        if (allResources.length === 0 || formData.is_locked) return null;

                        return (
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 border border-indigo-500/20">
                                        <Sparkles className="w-3 h-3" />
                                        Promote Resource
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent align="end" className="w-72 p-2 bg-[#1a1a1a] border-border text-foreground">
                                    <div className="space-y-1">
                                        <h4 className="text-xs font-semibold text-muted-foreground px-2 py-1 uppercase tracking-wider">Available Resources</h4>
                                        {allResources.map((res, idx) => (
                                            <div key={idx} className="relative group">
                                                <Button
                                                    variant="ghost"
                                                    className="w-full justify-start h-auto py-2 px-2 text-left text-sm font-normal truncate hover:bg-indigo-500/10 hover:text-indigo-300"
                                                    onClick={(e) => {
                                                        handlePromoteResource(res);
                                                        const esp = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
                                                        e.currentTarget.dispatchEvent(esp);
                                                    }}
                                                >
                                                    <div className="flex items-center gap-2 truncate w-full">
                                                        {res.type === 'gdrive' || res.type === 'link' ? <LinkIcon className="w-3.5 h-3.5 shrink-0 opacity-70" /> : <ImageIcon className="w-3.5 h-3.5 shrink-0 opacity-70" />}
                                                        <span className="truncate">{res.label || "Untitled Resource"}</span>
                                                    </div>
                                                </Button>
                                                {res.uri && (
                                                    <div
                                                        role="button"
                                                        className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-white/10 text-muted-foreground hover:text-indigo-400 opacity-60 hover:opacity-100 transition-all cursor-pointer z-10"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            window.open(res.uri, '_blank');
                                                        }}
                                                        title="Open in new tab"
                                                    >
                                                        <ArrowUpRight className="w-3.5 h-3.5" />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </PopoverContent>
                            </Popover>
                        );
                    })()}
                </div>
            </div>

            <input
                type="file"
                ref={mediaFileInputRef}
                id="media-input-main"
                className="hidden"
                style={{ display: 'none' }}
                onChange={(e) => {
                    setIsReplacing(false);
                    handleMediaFileChange(e);
                }}
                accept="image/*,video/*,application/pdf,.doc,.docx,.txt"
                disabled={formData.is_locked || (!!formData.media?.url && !isReplacing)}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    <div
                        className={`relative border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all duration-200 min-h-[180px] overflow-hidden group
                        ${isDragging ? 'border-indigo-500 bg-indigo-500/10 scale-[1.02]' : 'border-border/60 bg-muted/20 hover:border-indigo-500/40 hover:bg-indigo-500/5'}
                        ${formData.media?.url ? 'border-none p-0' : 'p-6'}
                        ${formData.is_locked ? "opacity-50 pointer-events-none cursor-not-allowed" : ""}
                    `}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={(e) => {
                            if (!formData.media?.url && !formData.is_locked) {
                                e.stopPropagation();
                                triggerMediaUpload("Main Dropzone Container");
                            }
                        }}
                    >
                        {isMediaUploading ? (
                            <div className="flex flex-col items-center gap-3 animate-in fade-in zoom-in p-4">
                                <div className="flex flex-col items-center gap-2">
                                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                                    <p className="text-xs font-medium text-indigo-400">Processing Media...</p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleCancelUpload();
                                    }}
                                    className="h-7 text-[10px] text-destructive hover:bg-destructive/10 hover:text-destructive border border-destructive/20"
                                >
                                    <X className="w-3 h-3 mr-1" />
                                    Cancel Upload
                                </Button>
                            </div>
                        ) : formData.media?.url ? (
                            <div
                                className="relative w-full h-full min-h-[180px] animate-in fade-in duration-500 bg-black/5 flex items-center justify-center rounded-xl cursor-zoom-in group pointer-events-auto"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (formData.media?.url) {
                                        setLightboxMedia({ url: formData.media.url, type: formData.media.type });
                                        setIsLightboxOpen(true);
                                    }
                                }}
                            >
                                {formData.media.source === 'local' ? (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-amber-500/10 gap-3 border border-amber-500/30 rounded-xl p-4">
                                        <FileText className="w-12 h-12 text-amber-500" />
                                        <div className="text-center">
                                            <span className="text-xs font-bold text-amber-600 uppercase tracking-wider block mb-1">Local File Reference</span>
                                            <span className="text-[10px] font-mono truncate max-w-full px-4 text-muted-foreground block">{formData.media.url}</span>
                                        </div>
                                    </div>
                                ) : (formData.media.type === 'video' && formData.media.source !== 'gdrive' && formData.media.source !== 'external') ? (
                                    formData.media.is_purged ? (
                                        <div
                                            className="relative w-full h-full min-h-[180px] flex flex-col items-center justify-center p-6 bg-[#0f1115] border border-white/5 rounded-xl text-center group-hover:border-indigo-500/20 transition-colors cursor-default"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <div className="p-3 mb-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 shadow-[0_0_15px_-3px_rgba(99,102,241,0.2)]">
                                                <Database className="w-8 h-8 text-indigo-400" />
                                            </div>
                                            <h3 className="text-sm font-bold text-white mb-1">Video Purged</h3>
                                            <p className="text-[10px] text-muted-foreground leading-relaxed max-w-[200px] mb-4">
                                                File removed to conserve storage space.
                                            </p>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-7 text-[10px] uppercase font-bold tracking-wider border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    triggerMediaUpload();
                                                }}
                                            >
                                                <Upload className="w-3 h-3 mr-1.5" />
                                                Upload Again
                                            </Button>
                                        </div>
                                    ) : !previewError && (
                                        <video
                                            src={formData.media.url}
                                            className="w-full h-full object-contain rounded-xl"
                                            controls
                                            onClick={(e) => e.stopPropagation()}
                                            onError={() => setPreviewError(true)}
                                        />
                                    )
                                ) : formData.media.type === 'document' && formData.media.source === 'firebase' ? (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900 gap-3 border rounded-xl p-4 group">
                                        <FileText className="w-12 h-12 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                                        <div className="text-center space-y-2">
                                            <span className="text-[10px] font-mono truncate max-w-full px-4 text-center block text-foreground/80">{formData.media.url.split('/').pop()}</span>
                                            <div
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-500/10 rounded-full opacity-60 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-indigo-500/20"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    triggerMediaUpload();
                                                }}
                                            >
                                                <Upload className="w-3 h-3 text-indigo-500" />
                                                <span className="text-[9px] font-bold text-indigo-500 uppercase">Change File</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (formData.media.type === 'link' || formData.media.source === 'gdrive' || formData.media.source === 'external') ? (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-blue-500/10 gap-3 border border-blue-500/30 rounded-xl p-4 transition-colors group">
                                        {formData.media.type === 'video' ? (
                                            <Play className="w-12 h-12 text-blue-500 group-hover:scale-110 transition-transform" />
                                        ) : formData.media.type === 'image' ? (
                                            <ImageIcon className="w-12 h-12 text-blue-500 group-hover:scale-110 transition-transform" />
                                        ) : formData.media.type === 'document' ? (
                                            <FileText className="w-12 h-12 text-blue-500 group-hover:scale-110 transition-transform" />
                                        ) : (
                                            <ExternalLink className="w-12 h-12 text-blue-500 group-hover:scale-110 transition-transform" />
                                        )}
                                        <div className="text-center">
                                            <span className="text-xs font-bold text-blue-500 uppercase tracking-wider block mb-1">
                                                {formData.media.source === 'gdrive' ? 'Google Drive Link' : 'External Link'}
                                            </span>
                                            <div className="text-[10px] font-mono truncate max-w-[200px] mx-auto px-4 text-blue-400/80 block">
                                                {formData.media.url}
                                            </div>
                                            <div
                                                className="mt-4 flex items-center gap-2 px-3 py-1 bg-blue-500/5 rounded border border-blue-500/20 group-hover:border-blue-500/40 transition-colors cursor-pointer hover:bg-blue-500/10"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    triggerMediaUpload();
                                                }}
                                            >
                                                <Upload className="w-3 h-3 text-blue-400" />
                                                <span className="text-[9px] text-blue-400 uppercase font-bold tracking-tight">Click to Upload Real File</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    !previewError && (
                                        <img
                                            src={formData.media.url}
                                            className="w-full h-full object-contain rounded-xl cursor-zoom-in"
                                            alt="Preview"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                setLightboxMedia({ url: formData.media.url, type: 'image' });
                                                setIsLightboxOpen(true);
                                            }}
                                            onError={() => setPreviewError(true)}
                                        />
                                    )
                                )}

                                {previewError && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/20 backdrop-blur-sm rounded-xl pointer-events-none group-error">
                                        {!hasTypeMismatch && (
                                            <>
                                                <AlertTriangle className="w-8 h-8 mb-2 text-muted-foreground" />
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Preview Unavailable</span>
                                                <span className="text-[9px] text-muted-foreground/60 mt-1 mb-3 text-center px-4">Resource may be private or restricted</span>
                                            </>
                                        )}
                                        <div className="flex flex-col items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
                                            {hasTypeMismatch && (
                                                <Button
                                                    variant="default" size="sm"
                                                    className="h-7 text-[10px] font-bold uppercase tracking-wider bg-amber-500 hover:bg-amber-600 text-white shadow-lg pointer-events-auto"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setPreviewError(null);
                                                        setFormData(p => ({ ...p, media: { ...p.media, type: detectedType, alt_text: '' } }));
                                                    }}
                                                >
                                                    Switch to {detectedType} View
                                                </Button>
                                            )}
                                            <div
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-background/80 shadow-sm border rounded-full pointer-events-auto cursor-pointer hover:bg-background transition-colors"
                                                onClick={(e) => { e.stopPropagation(); triggerMediaUpload(); }}
                                            >
                                                <Upload className="w-3 h-3 text-indigo-500" />
                                                <span className="text-[9px] font-bold text-indigo-500 uppercase">Click to Replace</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {!formData.is_locked && (
                                    <div className="absolute top-2 right-2 flex gap-2">
                                        <Button
                                            variant="destructive" size="sm"
                                            className="h-8 gap-2 bg-red-600 hover:bg-red-700 shadow-lg px-2 rounded-md"
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                const currentUrl = formData.media?.url;
                                                const currentSource = formData.media?.source;
                                                if (currentSource === 'firebase' && currentUrl) {
                                                    try {
                                                        const decodeUrl = decodeURIComponent(currentUrl);
                                                        const pathPart = decodeUrl.split('/o/')[1]?.split('?')[0];
                                                        if (pathPart) { await deleteObject(ref(storage, pathPart)); }
                                                    } catch (err) { console.error(err); }
                                                }
                                                setFormData(p => ({
                                                    ...p,
                                                    media: { ...p.media, url: '', source: 'external', type: 'image', alt_text: '', thumbnail_url: '' }
                                                }));
                                                setPreviewError(null);
                                                toast.success("Media cleared");
                                            }}
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            <span className="text-[10px] font-bold">CLEAR</span>
                                        </Button>
                                    </div>
                                )}
                                <div className="absolute bottom-2 right-2">
                                    <Badge variant="secondary" className="bg-black/60 text-white/90 text-[9px] uppercase font-mono border-white/10 backdrop-blur-md">
                                        {formData.media.source}
                                    </Badge>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center group-hover:scale-105 transition-transform duration-300">
                                <div className="p-3 rounded-full bg-indigo-500/10 inline-block mb-3 group-hover:bg-indigo-500/20 transition-colors">
                                    <Upload className="w-6 h-6 text-indigo-500" />
                                </div>
                                <p className="text-sm font-medium text-foreground">Launch-Ready Assets</p>
                                <p className="text-[11px] text-muted-foreground mt-1 px-4">Upload final physical file here</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-5 bg-white/5 p-4 rounded-xl border border-white/5 h-fit">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-2">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Asset Settings</h4>
                    </div>
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground/80 tracking-widest">Media Type</Label>
                            {hasTypeMismatch && (
                                <Badge variant="outline" className="h-4 px-1 text-[8px] border-amber-500/50 text-amber-500 bg-amber-500/5 animate-pulse">
                                    <AlertTriangle className="w-2.5 h-2.5 mr-1" /> Mismatch
                                </Badge>
                            )}
                        </div>
                        <Select
                            value={formData.media?.type || 'image'}
                            onValueChange={v => {
                                setPreviewError(null);
                                setFormData(p => ({
                                    ...p,
                                    media: { ...p.media, type: v, alt_text: '', thumbnail_url: '', url: '' }
                                }));
                            }}
                            disabled={formData.is_locked}
                        >
                            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="image"><div className="flex items-center gap-2"><ImageIcon className="w-3.5 h-3.5 text-emerald-500" /><span>Image</span></div></SelectItem>
                                <SelectItem value="video"><div className="flex items-center gap-2"><Play className="w-3.5 h-3.5 text-indigo-500" /><span>Video</span></div></SelectItem>
                                <SelectItem value="document"><div className="flex items-center gap-2"><FileText className="w-3.5 h-3.5 text-amber-500" /><span>Document</span></div></SelectItem>
                                <SelectItem value="link"><div className="flex items-center gap-2"><LinkIcon className="w-3.5 h-3.5 text-muted-foreground" /><span>Link</span></div></SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {formData.media?.type === 'video' && (
                        <div className="space-y-1.5 animate-in fade-in">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground/80 tracking-widest flex items-center justify-between">
                                <span>Custom Thumbnail</span>
                            </Label>
                            <div
                                className={`relative h-24 border-2 border-dashed rounded-lg flex items-center justify-center overflow-hidden transition-all
                                    ${formData.media.thumbnail_url ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border/60 bg-muted/20 hover:border-indigo-500/40 hover:bg-indigo-500/5'}
                                `}
                                onClick={() => { if (!formData.is_locked && !formData.media.thumbnail_url) thumbnailInputRef.current?.click(); }}
                            >
                                <input
                                    type="file" ref={thumbnailInputRef} id="thumbnail-input-custom" className="hidden"
                                    style={{ display: 'none' }} accept="image/*" onChange={handleThumbnailUpload} disabled={formData.is_locked}
                                />
                                {isThumbnailUploading ? (
                                    <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                                ) : formData.media.thumbnail_url ? (
                                    <div className="relative w-full h-full group cursor-pointer">
                                        <img
                                            src={formData.media.thumbnail_url} className="w-full h-full object-cover" alt="Thumbnail"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setLightboxMedia({ url: formData.media.thumbnail_url, type: 'image' });
                                                setIsLightboxOpen(true);
                                            }}
                                        />
                                        {!formData.is_locked && (
                                            <Button
                                                variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100"
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    if (formData.media.thumbnail_url) await deleteFromStorage(formData.media.thumbnail_url);
                                                    setFormData(p => ({ ...p, media: { ...p.media, thumbnail_url: '' } }));
                                                }}
                                            ><Trash2 className="w-3 h-3" /></Button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-1 text-muted-foreground/50"><ImageIcon className="w-5 h-5" /><span className="text-[9px] font-bold uppercase">Upload Cover</span></div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground/80 tracking-widest">Storage Source</Label>
                        <Select
                            value={formData.media?.source || 'external'}
                            onValueChange={v => setFormData(p => ({ ...p, media: { ...p.media, source: v } }))}
                            disabled={formData.is_locked}
                        >
                            <SelectTrigger className="h-9 text-xs w-full"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="firebase">Firebase</SelectItem>
                                <SelectItem value="external">External</SelectItem>
                                <SelectItem value="gdrive">GDrive</SelectItem>
                                <SelectItem value="dropbox">Dropbox</SelectItem>
                                <SelectItem value="local">Local</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground/80 tracking-widest">URL</Label>
                        <Input
                            className="h-9 text-xs" value={formData.media?.url || ''}
                            onChange={(e) => handleMediaUrlChange(e.target.value)} disabled={formData.is_locked}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground/80 tracking-widest">Alt Text</Label>
                        <Input
                            className="h-9 text-xs" value={formData.media?.alt_text || ''}
                            onChange={(e) => setFormData({ ...formData, media: { ...formData.media, alt_text: e.target.value } })}
                        />
                    </div>

                    {formData.media?.type === 'video' && (
                        <div className="space-y-1.5 pt-2 border-t border-white/5 animate-in fade-in slide-in-from-top-1">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground/80 tracking-widest flex items-center justify-between">
                                <span className="flex items-center gap-1">
                                    <FileText className="w-3 h-3" />
                                    Caption Vault
                                </span>
                                {formData.media.caption_url && <Badge variant="outline" className="h-4 px-1 text-[8px] border-emerald-500/50 text-emerald-500 bg-emerald-500/5">Vaulted</Badge>}
                            </Label>
                            <div
                                className={`relative h-12 border border-dashed rounded-lg flex items-center justify-center overflow-hidden transition-all
                                    ${formData.media.caption_url ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border/60 bg-muted/20 hover:border-indigo-500/40 hover:bg-indigo-500/5'}
                                `}
                                onClick={() => { if (!formData.is_locked) captionInputRef.current?.click(); }}
                            >
                                <input
                                    type="file" ref={captionInputRef} className="hidden"
                                    accept=".srt,.vtt" onChange={handleCaptionUpload} disabled={formData.is_locked}
                                />
                                {isCaptionUploading ? (
                                    <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                                ) : formData.media.caption_url ? (
                                    <div className="flex items-center gap-2 w-full px-3 group">
                                        <FileText className="w-4 h-4 text-emerald-500 shrink-0" />
                                        <span className="text-[10px] font-mono text-muted-foreground truncate flex-1">
                                            {decodeURIComponent(formData.media.caption_url.split('%2F').pop().split('?')[0]).split('_').slice(1).join('_')}
                                        </span>
                                        {!formData.is_locked && (
                                            <Button
                                                variant="ghost" size="icon" className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={(e) => { e.stopPropagation(); setFormData(p => ({ ...p, media: { ...p.media, caption_url: '' } })); }}
                                            ><Trash2 className="w-3 h-3" /></Button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-muted-foreground/50 transition-colors group-hover:text-indigo-400">
                                        <Upload className="w-3.5 h-3.5" />
                                        <span className="text-[9px] font-bold uppercase tracking-tight">Vault (.srt/.vtt)</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
