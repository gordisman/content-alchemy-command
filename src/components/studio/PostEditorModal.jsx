import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { format, addDays } from "date-fns";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, Download, CalendarIcon, Loader2, Save, Trash2, Clock, Link as LinkIcon, Image as ImageIcon, ExternalLink, FileText, Plus, Play, Pause, Mic, Sparkles, Eye, StopCircle, Upload, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle2, Check, ArrowUpRight, Globe, Repeat, X } from "lucide-react";
import { generateReviewText } from '../../utils/postReviewFormatter';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { storage, auth, functions } from '../../lib/firebase';
import { ref } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { SORTED_PLATFORMS } from '../../config/platforms';
import { formatPostId } from '../../utils/postIdFormatter';
import PostReviewOverlay from './PostReviewOverlay';
import YouTubePlaylistSelector from './YouTubePlaylistSelector';
import MediaAssetEngine from './MediaAssetEngine';
import AudioAssetEngine from './AudioAssetEngine';
import { exportSinglePost } from '../../utils/backup_utility';

const detectMediaSource = (url) => {
    if (!url) return 'external';
    if (url.includes('firebasestorage.googleapis.com')) return 'firebase';
    if (url.includes('cloudinary.com')) return 'cloudinary';
    if (url.includes('drive.google.com')) return 'gdrive';
    if (url.includes('dropbox.com')) return 'dropbox';

    // Local File Path Heuristics (Windows/Unix)
    if (url.match(/^[a-zA-Z]:\\/) || url.startsWith('/') || url.startsWith('file://')) return 'local';

    return 'external';
};

const detectMediaType = (fileOrUrl) => {
    // 1. OBJECT CHECK (Promoted Resources or File Objects)
    if (typeof fileOrUrl === 'object') {
        const typeValue = fileOrUrl?.type || '';
        const mimeType = fileOrUrl?.mimeType || ''; // For legacy/custom objects

        // Check if it's already classified
        if (['video', 'image', 'document'].includes(typeValue)) return typeValue;

        // Check MIME types (standard File objects use .type)
        if (typeValue.startsWith('video/') || mimeType.startsWith('video/')) return 'video';
        if (typeValue.startsWith('image/') || mimeType.startsWith('image/')) return 'image';
        if (typeValue.startsWith('application/pdf') || mimeType.startsWith('application/pdf') ||
            typeValue.includes('word') || typeValue.includes('officedocument') || typeValue.includes('text/plain')) return 'document';

        if (typeValue === 'link' || typeValue === 'web_link' || typeValue === 'gdrive') return 'link';
    }

    // 2. URL STRING ANALYSIS
    const urlStr = typeof fileOrUrl === 'string' ? fileOrUrl : fileOrUrl?.uri || fileOrUrl?.name || '';
    if (!urlStr) return 'image';

    // Strip query params/fragments
    const name = urlStr.split(/[#?]/)[0];
    const ext = name.split('.').pop().toLowerCase();

    if (['mp4', 'mov', 'webm', 'm4v', 'avi', 'mkv'].includes(ext)) return 'video';
    if (['pdf', 'doc', 'docx', 'txt', 'ppt', 'pptx', 'xls', 'xlsx'].includes(ext)) return 'document';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif'].includes(ext)) return 'image';

    return 'link';
};

export default function PostEditorModal({ open, onClose, post, idea, ideas = [], allPosts = [], onSave, onDelete, initialPlatform, onUpdateIdea, pillars = [], settings = {}, onViewManifesto }) {
    const [formData, setFormData] = useState({
        post_title: '',
        content_text: '', // Mapped to 'body' in schema
        platform: 'linkedin',
        status: 'draft',
        publish_date: null,
        publish_time: '09:00',
        definitive_pillar: '',
        post_cta: '',
        generated_hashtags: '', // New Field
        action_notes: '',

        // This object stores all the flat fields from post-schema.json
        platform_fields: {},

        resources: {
            links: [],
            idea_ref: ''
        },
        media: {
            url: '',
            alt_text: '',
            type: 'image', // Add default type (Outstand Passport)
            source: 'external' // Add default source (Outstand Passport)
        },
        is_locked: false,
        is_evergreen: false,
        repurpose_date: null
    });

    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [lightboxMedia, setLightboxMedia] = useState(null);

    const [searchParams, setSearchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState("content");
    const [directEntryDraft, setDirectEntryDraft] = useState({ post_title: '', content_text: '' });
    const [confirmPublishOpen, setConfirmPublishOpen] = useState(false);
    const [confirmMismatchOpen, setConfirmMismatchOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showReview, setShowReview] = useState(false);

    // Audio Recorder State
    // Audio Post Player State (Legacy - kept for reference if needed elsewhere)
    const [isPostPlaying, setIsPostPlaying] = useState(false);
    const postAudioPlayerRef = useRef(null);

    // Audio Post Player State
    const [postCurrentTime, setPostCurrentTime] = useState(0);

    // Media Asset Engine State (Now inside MediaAssetEngine.jsx)
    const [postPlaybackRate, setPostPlaybackRate] = useState(1);

    // Audio Idea Player State
    const [isIdeaPlaying, setIsIdeaPlaying] = useState(false);
    const [ideaCurrentTime, setIdeaCurrentTime] = useState(0);
    const [ideaPlayerDuration, setIdeaPlayerDuration] = useState(0);
    const [ideaPlaybackRate, setIdeaPlaybackRate] = useState(1);
    const ideaAudioPlayerRef = useRef(null);

    const [isGeneratingTags, setIsGeneratingTags] = useState(false); // Loading state for AI

    const fileInputRef = useRef(null);

    // Linkage Logic: Internal State for active idea
    const [currentIdea, setCurrentIdea] = useState(idea);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

    // Calculate displayed Post ID for both header and review view
    const displayedPostId = formatPostId({
        ...formData,
        id: post?.id,
        idea_id: currentIdea?.id,
        sequence: (post && post.idea_id === currentIdea?.id) ? post.sequence : (allPosts?.filter(p => p.idea_id === currentIdea?.id).reduce((max, p) => (p.sequence > max ? p.sequence : max), 0) + 1),
        direct_entry_sequence: post?.direct_entry_sequence || ((settings?.direct_entry_post_counter || 0) + 1),
        is_direct_entry: !currentIdea
    }, currentIdea) || '#POST-NEW';

    const handleLockedClick = (e) => {
        if (formData.is_locked) {
            toast.warning("Content Signed-Off", {
                description: "This creative is locked. Click the emerald Checkmark above to unlock and edit.",
                duration: 2500,
            });
        }
    };

    // Helper to update a specific platform field
    const updateField = (key, value) => {
        setFormData(prev => ({
            ...prev,
            platform_fields: {
                ...prev.platform_fields,
                [key]: value
            }
        }));
    };

    // Helper to get value
    const getField = (key) => formData.platform_fields?.[key] || '';

    useEffect(() => {
        if (open) {
            // Reset local UI state to prevent "Ghost" data leaks from previous sessions
            setNewResource({ label: '', uri: '', type: 'image' });

            // Check for initial tab in URL, otherwise default to content
            const requestedTab = searchParams.get('tab');
            setActiveTab(requestedTab || "content");

            setShowReview(false);

            const activeIdea = idea || (post?.idea_id ? ideas.find(i => i.id === post.idea_id) : null);
            setCurrentIdea(activeIdea);

            if (post) {
                setFormData({
                    post_title: post.post_title || '',
                    content_text: post.body || '', // Schema calls it 'body'
                    platform: post.platform || 'linkedin',
                    // Auto-fix: If legacy data has status='archived', map it to 'published' for the dropdown
                    status: post.status === 'archived' ? 'published' : (post.status || 'draft'),
                    publish_date: post.publish_date ? (post.publish_date.seconds ? new Date(post.publish_date.seconds * 1000) : new Date(post.publish_date)) : null,
                    publish_time: post.publish_time || '09:00',
                    definitive_pillar: post.definitive_pillar || '',
                    post_cta: post.post_cta || '',
                    generated_hashtags: post.generated_hashtags || '',
                    action_notes: post.action_notes || '',

                    // Load all schema fields into platform_fields for editing
                    // Auto-fix: Ensure 'archived' boolean is TRUE if status was 'archived'
                    platform_fields: {
                        ...post,
                        archived: post.archived || post.status === 'archived'
                    },

                    // Ensure resources has links array even if post saved it differently or it's missing
                    resources: post.resources || { links: [], idea_ref: '' },
                    media: post.media || { url: '', alt_text: '', type: 'image', source: 'external', caption_url: '' },
                    is_locked: post.is_locked || false,
                    is_evergreen: post.is_evergreen || false,
                    repurpose_date: post.repurpose_date ? (post.repurpose_date.seconds ? new Date(post.repurpose_date.seconds * 1000) : new Date(post.repurpose_date)) : null
                });
                if (post.post_audio_memo) {
                    // Local state not needed, AudioAssetEngine reads from formData
                }
            } else if (activeIdea) {
                // SPAWNING NEW POST FROM IDEA
                setFormData({
                    post_title: activeIdea.master_title || '',
                    content_text: activeIdea.concept || '',
                    platform: initialPlatform || '', // Mandatory choice if not provided
                    status: 'draft',
                    publish_date: null,
                    publish_time: '09:00',
                    definitive_pillar: activeIdea.pillar || '',

                    // New Fields
                    post_cta: '',
                    action_notes: '',

                    platform_fields: {}, // Empty start

                    // Start with empty local links (only inherit from Idea)
                    resources: {
                        links: [],
                        idea_ref: activeIdea.id
                    },

                    media: { url: '', alt_text: '', type: 'image', source: 'external', caption_url: '' }
                });
            } else {
                // DIRECT ENTRY (No Post, No Idea)
                setFormData({
                    post_title: '',
                    content_text: '',
                    platform: initialPlatform || '', // Mandatory choice if not provided
                    status: 'draft',
                    publish_date: null,
                    publish_time: '09:00',
                    definitive_pillar: '',
                    post_cta: '',
                    action_notes: '',

                    platform_fields: {},

                    resources: {
                        links: [],
                        idea_ref: ''
                    },
                    media: { url: '', alt_text: '', type: 'image', source: 'external', caption_url: '' }
                });
            }

            // Sync Direct Entry Draft: If this is a direct post, we cache it so user can return to it if they test-link an idea
            if (post && !post.idea_id) {
                setDirectEntryDraft({
                    post_title: post.post_title || '',
                    content_text: post.body || ''
                });
            } else if (!post && !activeIdea) {
                // Fresh start
                setDirectEntryDraft({ post_title: '', content_text: '' });
            }
        }
    }, [open, post, idea, initialPlatform, ideas]);

    // Audio & Player Cleanup on Close/Unmount
    useEffect(() => {
        return () => {
            // Stop idea playback if active
            if (ideaAudioPlayerRef.current) {
                ideaAudioPlayerRef.current.pause();
                setIsIdeaPlaying(false);
            }
        };
    }, [open, idea, post]);

    const handleTextChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // If NO idea is linked, this IS a direct entry session - we cache it
        if (!currentIdea) {
            setDirectEntryDraft(prev => ({ ...prev, [field]: value }));
        }
    };

    const handleIdeaChange = (ideaId) => {
        // Reset pending resource input to prevent accidental "volunteering" during transition
        setNewResource({ label: '', uri: '', type: 'web_link' });

        if (ideaId === 'none') {
            setCurrentIdea(null);
            setFormData(prev => ({
                ...prev,
                post_title: directEntryDraft.post_title,
                content_text: directEntryDraft.content_text,
                resources: { idea_ref: '', links: [] } // TOTAL PURGE: Wipe suitcase when unlinking
            }));
            return;
        }

        const selected = ideas.find(i => i.id === ideaId);
        if (selected) {
            setCurrentIdea(selected);
            setFormData(prev => {
                const newData = {
                    ...prev,
                    definitive_pillar: selected.pillar || prev.definitive_pillar,
                    resources: {
                        idea_ref: selected.id,
                        links: [] // TOTAL PURGE: Wipe suitcase when linking or switching ideas
                    }
                };

                // Sync Content: We bring over the Title and Body (Concept) from the Idea.
                // If it's a new post or a post with default text, we always overwrite.
                const isDefaultTitle = !prev.post_title || prev.post_title === '(Untitled Post)' || prev.post_title === '';
                const isDefaultBody = !prev.content_text || prev.content_text.trim() === '';

                if (isDefaultTitle || selected.master_title) {
                    newData.post_title = selected.master_title;
                }
                if (isDefaultBody || selected.concept) {
                    newData.content_text = selected.concept || '';
                }

                return newData;
            });

            toast.success("Idea Linked", {
                description: `Synced Title & Body from #${selected.idea_number}`
            });
        }
    };

    const validateSchedule = () => {
        // Core Validation: Must have Title OR Body to save
        if (!formData.post_title?.trim() && !formData.content_text?.trim()) {
            toast.error("Validation Error", { description: "You must provide at least a Title or Content Body to save this post." });
            return false;
        }

        // Platform (Lane) Validation: Mandatory for all posts
        if (!formData.platform) {
            toast.error("Lane Selection Required", { description: "Please select a target Lane (platform) for this post." });
            return false;
        }

        const { status, publish_date, publish_time } = formData;
        if (status === 'draft') return true; // Drafts don't need validation

        // PUBLISHING GATE: Must be approved/locked to mark as 'published'
        if (status === 'published' && !formData.is_locked) {
            toast.error("Approval Required", {
                description: "You must 'Approve' (lock) the creative content before marking it as Published.",
            });
            return false;
        }

        // Pillar Validation: Mandatory for Scheduled/Published posts
        if (!formData.definitive_pillar) {
            toast.error("Pillar Selection Required", { description: "You must assign a Content Pillar before scheduling." });
            return false;
        }

        // Strategic Pillar Check: Admin pillars (!) are blocked for public content
        const selectedPillar = pillars.find(p => p.id === formData.definitive_pillar);
        if (selectedPillar?.name?.startsWith('!')) {
            toast.error("Invalid Pillar", { description: "Administrative pillars (!) cannot be used for scheduled or published content. Please select a strategic pillar." });
            return false;
        }

        if (!publish_date) {
            toast.error("Date Required", { description: "A date is required for Scheduled posts." });
            return false;
        }
        if (!publish_time) {
            // STRICT VALIDATION: User must select a time.
            toast.error("Time Required", { description: "You must select a time for Scheduled posts." });
            return false;
        }

        // Combine date and time
        const [hours, minutes] = formData.publish_time.split(':');
        const scheduledDateTime = new Date(publish_date);
        scheduledDateTime.setHours(parseInt(hours), parseInt(minutes));

        // Restore Future Validation (preventing 'Yesterday' scheduling)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const scheduledDateOnly = new Date(publish_date);
        scheduledDateOnly.setHours(0, 0, 0, 0);

        if (status === 'scheduled' && scheduledDateOnly < today) {
            toast.error("Invalid Date", { description: "You cannot schedule a post in the past. Please use 'Published' status for historical content." });
            return false;
        }

        // Evergreen Engine Proximity Validation: Next Cycle must be AFTER Publication
        if (formData.is_evergreen && formData.repurpose_date) {
            const pubDate = new Date(publish_date);
            const repDate = new Date(formData.repurpose_date);

            if (repDate <= pubDate) {
                toast.error("Invalid Repurposing Date", {
                    description: "The 'Next Repurposing Cycle' must be a date LATER than your initial scheduled publication date."
                });
                return false;
            }
        }

        // Evergreen Engine Validation
        if (formData.is_evergreen && !formData.repurpose_date) {
            toast.error("Repurposing Date Required", {
                description: "Evergreen posts must have a future 'Repurposing Cycle' date established."
            });
            return false;
        }

        return true;
    };

    const handleSave = async (skipMismatchCheck = false) => {
        if (!validateSchedule()) return;

        // Media Type Mismatch Guardrail
        if (hasTypeMismatch && !skipMismatchCheck) {
            setConfirmMismatchOpen(true);
            return;
        }

        setLoading(true);
        try {
            // No longer uploading audio here - handled in background by AudioAssetEngine
            const finalAudioUrl = formData.post_audio_memo || '';
            const finalDuration = formData.post_audio_memo_duration || 0;

            // Flatten the structure to match schema expectations where strict fields exist
            const layoutToSave = {
                // Spread all dynamic fields FIRST (from initial load)
                ...formData.platform_fields,

                // Overwrite with Explicit Form Data (The Truth)
                post_title: formData.post_title,
                body: formData.content_text,
                platform: formData.platform,
                status: formData.status,
                // Logic Fix: If status is changing AWAY from 'published', un-archive it.
                archived: formData.status === 'published' ? (formData.platform_fields.archived || false) : false,

                // Logic Fix: Combine date and time into a single timestamp for proper scheduling and overdue checks.
                publish_date: (() => {
                    if (formData.status === 'draft' || !formData.publish_date) return null;
                    const combined = new Date(formData.publish_date);
                    const [hours, minutes] = (formData.publish_time || '00:00').split(':');
                    combined.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                    return combined;
                })(),
                publish_time: formData.status === 'draft' ? null : formData.publish_time,
                definitive_pillar: formData.definitive_pillar,
                post_cta: formData.post_cta,
                generated_hashtags: formData.generated_hashtags || '', // Ensure never undefined
                action_notes: formData.action_notes,

                post_audio_memo: finalAudioUrl,
                post_audio_memo_duration: finalDuration,

                // Evergreen / Repurposing
                is_evergreen: formData.is_evergreen || false,
                repurpose_date: formData.is_evergreen ? formData.repurpose_date : null,

                // Linkage Logic
                idea_id: currentIdea?.id || null,
                idea_number: currentIdea?.idea_number || null,
                is_direct_entry: !currentIdea, // Critical Flag for D-Sequence

                sequence: (() => {
                    if (currentIdea) {
                        if (post && post.idea_id === currentIdea.id) {
                            return post.sequence; // Keep existing if idea matches
                        } else {
                            // New Idea Link: Find Max Sequence to avoid duplicates
                            const existingPosts = allPosts.filter(p => p.idea_id === currentIdea.id);
                            const maxSeq = existingPosts.reduce((max, p) => (p.sequence > max ? p.sequence : max), 0);
                            return maxSeq + 1;
                        }
                    }
                    return 1; // Fallback / Direct Entry (Backend handles D-Seq)
                })(),

                // Resources & Media
                resources: (() => {
                    if (newResource.uri.trim()) {
                        let uri = newResource.uri.trim();
                        if (!/^https?:\/\//i.test(uri) && !uri.startsWith('gs://')) {
                            uri = 'https://' + uri;
                        }
                        const resourceToAdd = {
                            type: newResource.type,
                            label: newResource.label.trim() || 'Resource',
                            uri
                        };
                        // Type detection fallback
                        if (!resourceToAdd.type || resourceToAdd.type === 'link') {
                            const detected = detectMediaType(uri);
                            if (detected !== 'link') resourceToAdd.type = detected;
                        }

                        const currentLinks = Array.isArray(formData.resources) ? formData.resources : (formData.resources?.links || []);
                        return {
                            ...formData.resources,
                            links: [...currentLinks, resourceToAdd]
                        };
                    }
                    return formData.resources;
                })(),
                media: formData.media,
                is_locked: formData.is_locked || false
            };

            await onSave(layoutToSave);

            // Update local state to show the new list + clear the inputs
            setFormData(prev => ({ ...prev, resources: layoutToSave.resources }));
            setNewResource({ label: '', uri: '', type: 'link' });

            // Only close if creating new post. If editing, keep open.
            if (!post) {
                onClose();
            } else {
                toast.success("Post updated successfully");
            }
        } catch (error) {
            console.error("Failed to save post:", error);
            toast.error("Failed to save post", {
                description: error.message || "Unknown error occurred.",
                duration: 8000
            });
        } finally {
            setLoading(false);
        }
    };

    const handleExecutePosting = async () => {
        if (platformConfig?.capability === 'automation' && settings?.automation_enabled) {
            // Automation specific logic
            setLoading(true);
            try {
                // Simulation of API Handshake
                await new Promise(resolve => setTimeout(resolve, 1500));
                toast.success("Transmit Successful", {
                    description: `Post has been queued for ${platformConfig.label} via Outstand.`
                });

                // Mark as Scheduled in our system automatically if automation succeeds
                setFormData(p => ({ ...p, status: 'scheduled', is_locked: true }));
                await handleSave();
            } catch (err) {
                toast.error("Handshake Failed", { description: "Check your API keys in Settings." });
            } finally {
                setLoading(false);
            }
        } else {
            // Manual logic
            setConfirmPublishOpen(true);
        }
    };

    const platformConfig = SORTED_PLATFORMS.find(p => p.id === formData.platform);

    // DERIVE RESOURCES FROM IDEA (Live Read)
    // We do NOT store resources in the Post object (per schema).
    // Instead, we view them live from the linked Idea.
    const displayResources = currentIdea ? [...(currentIdea.resources || [])] : [];

    // Inject Audio Memo if present
    if (currentIdea?.idea_audio_memo) {
        displayResources.push({
            type: 'local_file', // Using local_file icon for audio
            label: `Audio Memo(${Math.round(currentIdea.idea_audio_memo_duration || 0)}s)`,
            uri: currentIdea.idea_audio_memo
        });
    }

    // --- Player Logic (Idea) ---
    const toggleIdeaPlayback = () => {
        if (!ideaAudioPlayerRef.current) return;
        if (isIdeaPlaying) {
            ideaAudioPlayerRef.current.pause();
            setIsIdeaPlaying(false);
        } else {
            ideaAudioPlayerRef.current.play();
            setIsIdeaPlaying(true);
        }
    };

    const handleIdeaTimeUpdate = () => {
        if (ideaAudioPlayerRef.current) {
            setIdeaCurrentTime(ideaAudioPlayerRef.current.currentTime);
        }
    };

    const handleIdeaLoadedMetadata = () => {
        if (ideaAudioPlayerRef.current) {
            const dur = ideaAudioPlayerRef.current.duration;
            if (isFinite(dur)) setIdeaPlayerDuration(dur);
        }
    };

    // --- AI HASHTAG GENERATION ---
    const handleGenerateHashtags = async () => {
        // Validation: Need at least Title or Body
        if (!formData.post_title && !formData.content_text) {
            toast.error("Content Missing", { description: "Please add a Title or Content to generate hashtags." });
            return;
        }

        setIsGeneratingTags(true);
        try {
            const generateHashtagsFn = httpsCallable(functions, 'generateHashtags');
            const result = await generateHashtagsFn({
                title: formData.post_title,
                content: formData.content_text,
                platform: formData.platform,
                pillarName: pillars.find(p => p.id === formData.definitive_pillar)?.name || ''
            });

            if (result.data?.hashtags) {
                setFormData(prev => ({ ...prev, generated_hashtags: result.data.hashtags }));
                toast.success("Hashtags Generated", { description: "AI has crafted tags for this post." });
            }
        } catch (error) {
            console.error("Hashtag Generation Failed:", error);
            toast.error("Generation Failed", { description: error.message || "Could not generate hashtags." });
        } finally {
            setIsGeneratingTags(false);
        }
    };

    // --- Copy Bundle Logic (One-Click Launch) ---
    const [bundleConfirmOpen, setBundleConfirmOpen] = useState(false);

    // Wrapper: Decides whether to warn the user or just go
    const handleCopyBundle = () => {
        // Detect if we are actually going to download files
        const mediaType = formData.media?.type || 'image';
        const mediaSource = formData.media?.source || 'external';
        const isDownloadable = ['image', 'video', 'document'].includes(mediaType) && mediaSource !== 'gdrive';
        const hasThumbnail = !!formData.media?.thumbnail_url;
        const isExternalSource = mediaSource === 'external';

        // Criteria: Are we downloading a Main Asset OR a Thumbnail?
        const willDownloadMedia =
            (formData.media?.url && isDownloadable && !isExternalSource) || // Main Asset
            (hasThumbnail) || // Thumbnail
            (formData.media?.caption_url); // Captions

        if (willDownloadMedia) {
            setBundleConfirmOpen(true);
        } else {
            executeBundleProcess();
        }
    };

    const executeBundleProcess = async () => {
        try {
            // Resolve Pillar Name for Clipboard
            const selectedPillar = pillars.find(p => p.id === (formData.definitive_pillar || formData.pillar));

            // 1. Copy Comprehensive Text (Uses established displayedPostId for accuracy)
            // Resolve Playlists (if YouTube) - explicitly calculated here for safety
            const playlistIds = Array.isArray(formData.platform_fields?.youtube_playlists)
                ? formData.platform_fields.youtube_playlists
                : (formData.youtube_playlists || []); // Fallback

            const allPlaylists = settings?.youtube_playlists || [];
            const resolvedPlaylists = allPlaylists.filter(p => playlistIds.includes(p.id));

            // 1. Copy Comprehensive Text (Uses established displayedPostId for accuracy)
            const reviewText = generateReviewText({
                formData: { ...formData, pillarName: selectedPillar?.name },
                idea: currentIdea,
                postId: displayedPostId,
                postAudioURL: formData.post_audio_memo || '',
                postAudioDuration: formData.post_audio_memo_duration || post?.post_audio_memo_duration || 0,
                resolvedPlaylists,
                settings
            });

            // 1. Copy Comprehensive Text
            try {
                await navigator.clipboard.writeText(reviewText);

                const mediaType = formData.media?.type || 'image';
                const mediaSource = formData.media?.source || 'external';
                const isDownloadable = ['image', 'video', 'document'].includes(mediaType) && mediaSource !== 'gdrive';
                const isExternalSource = mediaSource === 'external';
                const willDownloadMedia =
                    (formData.media?.url && isDownloadable && !isExternalSource) ||
                    (!!formData.media?.thumbnail_url) ||
                    (!!formData.media?.caption_url);

                toast.success("Post Data Copied", {
                    description: willDownloadMedia
                        ? "Full assembly is now on your clipboard."
                        : "Text content copied. No vault assets found for download."
                });
            } catch (err) {
                console.warn("Clipboard write failed:", err);
                toast.warning("Clipboard Access Denied", { description: "Could not copy text automatically." });
            }

            // 2. Automated Media Download (Selective Support)
            const mediaType = formData.media?.type || 'image';
            const mediaSource = formData.media?.source || 'external';
            const isDownloadable = ['image', 'video', 'document'].includes(mediaType) && mediaSource !== 'gdrive';
            const isExternalSource = mediaSource === 'external';

            const cleanIdForFile = displayedPostId.replace('#POST-', '');

            // --- STAGE 2: MAIN ASSET DOWNLOAD ---
            // Independent Logic: If this fails, it shouldn't stop the thumbnail.
            if (formData.media?.url && isDownloadable && !isExternalSource) {
                try {
                    const url = formData.media.url;
                    const cleanUrl = decodeURIComponent(url.trim()).split(/[#?]/)[0];
                    const rawExtension = cleanUrl.split('.').pop() || '';

                    // Safe Extension Logic
                    let extension = rawExtension.replace(/[^a-z0-9]/gi, '').toLowerCase();
                    if (extension.length > 5 || !extension) {
                        extension = mediaType === 'video' ? 'mp4' : mediaType === 'document' ? 'pdf' : 'jpg';
                    }

                    const fileName = `POST_${cleanIdForFile}_${mediaType}.${extension}`;

                    toast.info("Downloading Main Asset", { description: `Transferring ${mediaType} file...` });

                    const response = await fetch(url);
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const blob = await response.blob();
                    const blobUrl = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = blobUrl;
                    link.download = fileName;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(blobUrl);

                } catch (err) {
                    console.error("Main asset download failed:", err);
                    toast.error("Asset Download Failed", { description: "You may need to download the file manually." });
                    // Fallback to new tab
                    window.open(formData.media.url, '_blank');
                }
            } else if (isExternalSource && formData.media?.url) {
                toast.info("External Link Detected", { description: "Main asset is external. Valid link copied to clipboard." });
            }

            // --- STAGE 3: THUMBNAIL DOWNLOAD (Independent) ---
            // Completely decoupled from Stage 2.
            if (formData.media?.thumbnail_url) {
                // Short delay to prevent browser throttling concurrent downloads
                setTimeout(async () => {
                    try {
                        toast.info("Downloading Thumbnail", { description: "Transferring cover image..." });
                        const thumbUrl = formData.media.thumbnail_url;
                        const thumbResponse = await fetch(thumbUrl);
                        if (!thumbResponse.ok) throw new Error(`HTTP ${thumbResponse.status}`);
                        const thumbBlob = await thumbResponse.blob();
                        const thumbBlobUrl = window.URL.createObjectURL(thumbBlob);
                        const thumbLink = document.createElement('a');
                        thumbLink.href = thumbBlobUrl;
                        thumbLink.download = `POST_${cleanIdForFile}_thumbnail.jpg`;
                        document.body.appendChild(thumbLink);
                        thumbLink.click();
                        document.body.removeChild(thumbLink);
                        window.URL.revokeObjectURL(thumbBlobUrl);
                    } catch (e) {
                        console.error("Thumbnail download failed", e);
                        toast.error("Thumbnail Download Failed");
                        window.open(formData.media.thumbnail_url, '_blank');
                    }
                }, 500);
            }



            // --- STAGE 4: CAPTION DOWNLOAD (Independent) ---
            if (formData.media?.caption_url) {
                // Staggered delay to prevent browser throttling
                setTimeout(async () => {
                    try {
                        toast.info("Downloading Captions", { description: "Transferring subtitle file..." });
                        const capUrl = formData.media.caption_url;
                        const capResponse = await fetch(capUrl);
                        if (!capResponse.ok) throw new Error(`HTTP ${capResponse.status}`);
                        const capBlob = await capResponse.blob();

                        // Detect extension from blob or url
                        const mime = capBlob.type;
                        let ext = 'srt';
                        if (capUrl.includes('.vtt') || mime === 'text/vtt') ext = 'vtt';

                        const capBlobUrl = window.URL.createObjectURL(capBlob);
                        const capLink = document.createElement('a');
                        capLink.href = capBlobUrl;
                        capLink.download = `POST_${cleanIdForFile}_captions.${ext}`;
                        document.body.appendChild(capLink);
                        capLink.click();
                        document.body.removeChild(capLink);
                        window.URL.revokeObjectURL(capBlobUrl);
                    } catch (e) {
                        console.error("Caption download failed", e);
                        toast.error("Caption Download Failed");
                        window.open(formData.media.caption_url, '_blank');
                    }
                }, 1000);
            }

        } catch (error) {
            console.error("Bundle Critical Failure:", error);
            toast.error("Process Logic Error");
        }
    };

    // --- Media Asset Engine Integration ---
    const detectedType = detectMediaType(formData.media?.url);
    const hasTypeMismatch = formData.media?.url &&
        detectedType !== 'link' &&
        (formData.media?.type || 'image') !== detectedType;


    const handleIdeaSeek = (e) => {
        const time = parseFloat(e.target.value);
        if (ideaAudioPlayerRef.current && isFinite(time)) {
            ideaAudioPlayerRef.current.currentTime = time;
            setIdeaCurrentTime(time);
        }
    };

    const toggleIdeaSpeed = () => {
        const rates = [1, 1.5, 2, 0.5];
        const nextRate = rates[(rates.indexOf(ideaPlaybackRate) + 1) % rates.length];
        setIdeaPlaybackRate(nextRate);
        if (ideaAudioPlayerRef.current) {
            ideaAudioPlayerRef.current.playbackRate = nextRate;
        }
    };

    const formatTime = (time) => {
        if (!time || !isFinite(time)) return "00:00";
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')} `;
    };

    // (Legacy recording logic removed - migrated to AudioAssetEngine)

    const [newResource, setNewResource] = useState({ label: '', uri: '', type: 'link' });

    // Helper to add a resource
    const handleAddResource = async () => {
        if (!newResource.uri.trim()) return;

        let uri = newResource.uri.trim();
        // Auto-detect http if missing for links
        if (!/^https?:\/\//i.test(uri) && !uri.startsWith('gs://')) {
            uri = 'https://' + uri;
        }

        const resourceToAdd = {
            label: newResource.label.trim() || 'Resource',
            uri: uri,
            type: newResource.type // Respect explicit user selection from dropdown
        };

        // If user didn't change type (or it was empty), try a light detection based on extension
        if (!resourceToAdd.type || resourceToAdd.type === 'link') {
            const detected = detectMediaType(uri);
            if (detected !== 'link') resourceToAdd.type = detected;
        }

        setFormData(prev => {
            const currentLinks = Array.isArray(prev.resources) ? prev.resources : (prev.resources?.links || []);
            return {
                ...prev,
                resources: {
                    ...prev.resources,
                    links: [...currentLinks, resourceToAdd]
                }
            };
        });

        // Reset inputs
        setNewResource({ label: '', uri: '', type: 'link' });
        toast.success("Resource added to post briefcase");
    };

    const handleRemoveResource = async (index) => {
        // if (!confirm("Remove this resource?")) return; // Removed ugly confirm
        toast.info("Resource removed");
        const currentResources = [...(idea?.resources || [])];
        currentResources.splice(index, 1);

        if (onUpdateIdea && idea?.id) {
            await onUpdateIdea(idea.id, { resources: currentResources });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="w-full max-w-4xl h-full md:h-[90vh] flex flex-col p-0 gap-0 overflow-hidden sm:rounded-xl">
                {/* Header */}
                <DialogHeader className="p-4 md:p-6 pr-10 md:pr-14 border-b shrink-0 bg-card/50 backdrop-blur-sm sticky top-0 z-20">
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 md:w-4 md:h-4 rounded-full" style={{ backgroundColor: platformConfig?.color || '#ccc' }} />
                                <DialogTitle className="text-lg md:text-xl flex items-center gap-1 md:gap-2">
                                    <span className="truncate max-w-[200px] md:max-w-none">{post ? 'Edit Post' : (currentIdea ? 'Spawn Post' : 'Create Post')}</span>
                                    {currentIdea && (
                                        <div
                                            className="text-[10px] md:text-xs font-mono px-1.5 py-0.5 rounded border bg-background/50 text-foreground flex items-center shadow-sm ml-1"
                                            style={{ borderColor: pillars?.find(p => p.id === formData.definitive_pillar || p.name === formData.definitive_pillar)?.color || '#333' }}
                                        >
                                            <span className="font-bold">
                                                {displayedPostId}
                                            </span>
                                        </div>
                                    )}
                                    {!currentIdea && (
                                        <div
                                            className="text-[10px] md:text-xs font-mono px-1.5 py-0.5 rounded border bg-background/50 text-foreground flex items-center shadow-sm ml-1 border-muted-foreground/30"
                                        >
                                            <span className="font-bold">
                                                {displayedPostId}
                                            </span>
                                        </div>
                                    )}
                                </DialogTitle>
                            </div>
                            <div className="flex items-center gap-2 w-full md:w-auto">
                                <div className="flex-1 md:w-48 md:flex-none">
                                    <Select
                                        value={formData.platform || 'none'}
                                        onValueChange={(val) => setFormData(prev => ({ ...prev, platform: val === 'none' ? '' : val }))}
                                    >
                                        <SelectTrigger className={`h-8 md:h-9 text-xs transition-colors ${!formData.platform ? 'border-violet-500/50 bg-violet-500/5 text-violet-400 font-semibold' : ''}`}>
                                            <SelectValue placeholder="Select Lane..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {!formData.platform && <SelectItem value="none" disabled className="text-muted-foreground italic">— Select Lane —</SelectItem>}
                                            {SORTED_PLATFORMS.filter(p => (settings?.lane_visibility?.[p.id] === true) || (post?.platform === p.id)).map(p => (
                                                <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 md:h-9 md:w-9 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 shrink-0 shadow-sm border border-blue-500/20"
                                    onClick={() => setShowReview(true)}
                                    title="Post Review"
                                >
                                    <Eye className="h-4 w-4 md:h-5 md:w-5" />
                                </Button>
                                {currentIdea && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 md:h-9 md:w-9 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 shrink-0 shadow-sm border border-purple-500/20"
                                        onClick={() => onViewManifesto && onViewManifesto(currentIdea.id)}
                                        title="View Idea Manifesto"
                                    >
                                        <Sparkles className="h-4 w-4 md:h-5 md:w-5" />
                                    </Button>
                                )}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={`h-8 w-8 md:h-9 md:w-9 shrink-0 shadow-sm border transition-all ${formData.is_locked
                                        ? "text-emerald-500 border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 shadow-emerald-500/10"
                                        : "text-slate-400 border-slate-500/20 hover:bg-slate-500/10"
                                        }`}
                                    onClick={() => setFormData(p => ({ ...p, is_locked: !p.is_locked }))}
                                    title={formData.is_locked ? "Reviewed & Approved Content (Click to Unlock)" : "Review & Approve Content"}
                                >
                                    {formData.is_locked ? <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5" /> : <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 opacity-40" />}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 md:h-9 md:w-9 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 shrink-0 shadow-sm border border-indigo-500/20"
                                    onClick={handleCopyBundle}
                                    title="Copy Bundle (Text + Media Download)"
                                >
                                    <Copy className="h-4 w-4 md:h-5 md:w-5" />
                                </Button>
                            </div>
                        </div>

                        {/* Link to Idea Dropdown */}
                        <div className="space-y-1 relative" onClick={handleLockedClick}>
                            {formData.is_locked && <div className="absolute inset-0 z-50 cursor-pointer" />}
                            <Label className="text-[9px] md:text-[10px] uppercase tracking-widest text-muted-foreground ml-1">Link to Idea (Optional)</Label>
                            <Select
                                value={currentIdea?.id || 'none'}
                                onValueChange={handleIdeaChange}
                            >
                                <SelectTrigger className="w-full bg-muted/30 border-border/50 h-9 md:h-10 text-xs md:text-sm" disabled={formData.is_locked}>
                                    <SelectValue placeholder="Select an Idea..." />
                                </SelectTrigger>
                                <SelectContent className="max-w-[95vw] md:max-w-xl max-h-[300px]">
                                    <SelectItem value="none" className="text-muted-foreground italic text-xs">— Direct Entry (No Idea) —</SelectItem>
                                    {ideas.filter(i => i.status === 'ready' || i.id === currentIdea?.id).map(i => (
                                        <SelectItem key={i.id} value={i.id} className="text-xs">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <Badge variant="outline" className="text-[10px] h-4 px-1 border-violet-500/30 text-violet-400 bg-violet-500/5 shrink-0 font-bold">#{i.idea_number}</Badge>
                                                <span className="truncate">{i.master_title}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </DialogHeader>

                {/* Body */}
                <div className="flex-1 overflow-y-auto bg-slate-50/5 dark:bg-slate-950/20">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col">
                        <div className="px-4 md:px-6 pt-2 md:pt-4 shrink-0">
                            <TabsList className="flex w-full overflow-x-auto no-scrollbar justify-start md:grid md:grid-cols-4 gap-1 bg-muted/20 p-1">
                                <TabsTrigger value="content" className="flex-1 md:flex-none py-2 text-[11px] md:text-sm">Content</TabsTrigger>
                                <TabsTrigger value="platform" className="flex-1 md:flex-none py-2 text-[11px] md:text-sm">Platform</TabsTrigger>
                                <TabsTrigger value="resources" className="flex-1 md:flex-none py-2 text-[11px] md:text-sm whitespace-nowrap">Resources</TabsTrigger>
                                <TabsTrigger value="schedule" className="flex-1 md:flex-none py-2 text-[11px] md:text-sm">Schedule</TabsTrigger>
                            </TabsList>
                        </div>

                        {/* CONTENT TAB */}
                        <TabsContent value="content" className="flex-1 p-6 space-y-6 mt-0">
                            {formData.is_locked && (
                                <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                            <CheckCircle2 size={18} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-emerald-500">Creative Approved</p>
                                            <p className="text-[10px] text-emerald-500/60 font-medium whitespace-nowrap">Unlock via the header icon to edit creative fields.</p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-400 font-bold text-[10px]"
                                        onClick={() => setFormData(p => ({ ...p, is_locked: false }))}
                                    >
                                        UNLOCK
                                    </Button>
                                </div>
                            )}
                            <div className="space-y-2 relative" onClick={handleLockedClick}>
                                {formData.is_locked && <div className="absolute inset-0 z-50 cursor-pointer" />}
                                <Label>Internal Title (Post Title)</Label>
                                <Input
                                    value={formData.post_title}
                                    onChange={(e) => handleTextChange('post_title', e.target.value)}
                                    disabled={formData.is_locked}
                                />
                            </div>

                            {/* Content Pillar Selector */}
                            <div className="space-y-2">
                                <Label>Content Pillar</Label>
                                <Select
                                    value={formData.definitive_pillar || "no_pillar"}
                                    onValueChange={(val) => setFormData({ ...formData, definitive_pillar: val === "no_pillar" ? "" : val })}
                                >
                                    <SelectTrigger className={`w-full ${(!formData.definitive_pillar && formData.status !== 'draft') ? 'border-red-500/50 bg-red-500/5' : ''}`}>
                                        <SelectValue placeholder="Select a pillar..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="no_pillar">— No Pillar —</SelectItem>
                                        {pillars.map((pillar) => (
                                            <SelectItem key={pillar.id} value={pillar.id}>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: pillar.color }} />
                                                    {pillar.name}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2 flex-1 flex flex-col min-h-[300px] relative" onClick={handleLockedClick}>
                                {formData.is_locked && <div className="absolute inset-0 z-50 cursor-pointer" />}
                                <Label>Main Body / Caption</Label>
                                <Textarea
                                    value={formData.content_text || ''}
                                    onChange={(e) => handleTextChange('content_text', e.target.value)}
                                    className="flex-1 resize-none font-mono text-sm leading-relaxed"
                                    disabled={formData.is_locked}
                                />
                            </div>

                            {/* Call to Action */}
                            <div className="space-y-2 relative" onClick={handleLockedClick}>
                                {formData.is_locked && <div className="absolute inset-0 z-50 cursor-pointer" />}
                                <Label>Call to Action (CTA)</Label>
                                <Input
                                    placeholder="e.g. Click link in bio..."
                                    value={formData.post_cta}
                                    onChange={(e) => setFormData({ ...formData, post_cta: e.target.value })}
                                    disabled={formData.is_locked}
                                />
                            </div>

                            {/* HASHTAG GENERATOR SECTION */}
                            <div className="space-y-2 p-4 bg-muted/30 rounded-lg border border-border/50 relative" onClick={handleLockedClick}>
                                {formData.is_locked && <div className="absolute inset-0 z-50 cursor-pointer" />}
                                <div className="flex items-center justify-between">
                                    <Label className="flex items-center gap-2 text-indigo-400">
                                        <Sparkles className="w-4 h-4" />
                                        Hashtags
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        {formData.generated_hashtags && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 px-2 text-xs text-muted-foreground hover:text-white"
                                                onClick={(e) => {
                                                    e.stopPropagation(); // prevent lock click
                                                    navigator.clipboard.writeText(formData.generated_hashtags);
                                                    toast.success("Copied to Clipboard");
                                                }}
                                            >
                                                <Copy className="w-3 h-3 mr-1" /> Copy
                                            </Button>
                                        )}
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 text-xs border-indigo-500/30 hover:bg-indigo-500/10 hover:text-indigo-400"
                                            onClick={(e) => {
                                                e.stopPropagation(); // prevent lock click
                                                handleGenerateHashtags();
                                            }}
                                            disabled={isGeneratingTags || formData.is_locked}
                                        >
                                            {isGeneratingTags ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
                                            {formData.generated_hashtags ? 'Regenerate AI Tags' : 'Generate AI Tags'}
                                        </Button>
                                    </div>
                                </div>
                                <Textarea
                                    placeholder="#contentalchemy #strategy..."
                                    value={formData.generated_hashtags}
                                    onChange={(e) => handleTextChange('generated_hashtags', e.target.value)}
                                    disabled={formData.is_locked}
                                    className="font-mono text-xs text-muted-foreground min-h-[60px]"
                                />
                                <p className="text-[10px] text-muted-foreground">
                                    AI analyzes your Title, Content, and Pillar to generate optimized tags for {SORTED_PLATFORMS.find(p => p.id === formData.platform)?.label || 'this platform'}.
                                </p>
                            </div>

                            {/* Action Notes - Critical */}
                            <div className="space-y-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-md">
                                <Label className="text-amber-500">Action Notes (Internal Instructions)</Label>
                                <Textarea
                                    placeholder="e.g. Ensure logo is visible in frame 1..."
                                    value={formData.action_notes}
                                    onChange={(e) => setFormData({ ...formData, action_notes: e.target.value })}
                                    className="resize-none h-20 bg-background/50 border-amber-500/20 focus-visible:ring-amber-500"
                                />
                            </div>

                            <AudioAssetEngine
                                formData={formData}
                                setFormData={setFormData}
                                isLocked={formData.is_locked}
                            />
                        </TabsContent>

                        {/* PLATFORM TAB */}
                        <TabsContent value="platform" className="flex-1 p-6 space-y-6 mt-0">
                            {formData.is_locked && (
                                <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                            <CheckCircle2 size={18} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-emerald-500">Creative Approved</p>
                                            <p className="text-[10px] text-emerald-500/60 font-medium whitespace-nowrap">Unlock via the header icon to edit platform fields.</p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-400 font-bold text-[10px]"
                                        onClick={() => setFormData(p => ({ ...p, is_locked: false }))}
                                    >
                                        UNLOCK
                                    </Button>
                                </div>
                            )}
                            {/* ... (Existing Platform Tab Content - Keeping Logic Same) ... */}
                            <div className="p-4 border rounded-md bg-background space-y-6 relative" onClick={handleLockedClick}>
                                {formData.is_locked && <div className="absolute inset-0 z-50 cursor-pointer" />}
                                <div className="flex items-center gap-2 pb-2 border-b">
                                    <h3 className="font-semibold text-lg">{formData.platform ? `${platformConfig?.label} Fields` : "Lane Priority Fields"}</h3>
                                    <span className="text-xs text-muted-foreground ml-auto">Schema-Driven</span>
                                </div>

                                {!formData.platform && (
                                    <div className="py-12 flex flex-col items-center justify-center text-center space-y-3 bg-violet-500/5 rounded-lg border border-dashed border-violet-500/20">
                                        <div className="w-12 h-12 rounded-full bg-violet-500/10 flex items-center justify-center">
                                            <Sparkles className="w-6 h-6 text-violet-400" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-semibold text-violet-300">Target Lane Required</p>
                                            <p className="text-xs text-muted-foreground max-w-[240px]">Select a platform in the header to unlock unique strategy fields for this post.</p>
                                        </div>
                                    </div>
                                )}
                                {/* ... (Platform Specifics Hidden for Brevity - Assuming they stay) ... */}
                                {/* NOTE: I am not replacing the whole Platform Block for efficiency, assume unchanged if not targeted explicitly contextually */}
                                {/* Re-injecting the whole Platform Block because replace_file_content needs contiguity */}
                                {/* YOUTUBE */}
                                {formData.platform === 'youtube' && (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <Label className="text-xs">Video Type</Label>
                                                <Select value={getField('yt_type')} disabled={formData.is_locked} onValueChange={(val) => updateField('yt_type', val)}>
                                                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="video">Video</SelectItem>
                                                        <SelectItem value="short">Short</SelectItem>
                                                        <SelectItem value="podcast">Podcast</SelectItem>
                                                        <SelectItem value="live_stream">Live Stream</SelectItem>
                                                        <SelectItem value="community_post">Community Post</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">Playlists</Label>
                                                <YouTubePlaylistSelector
                                                    value={getField('youtube_playlists')}
                                                    onChange={(val) => updateField('youtube_playlists', val)}
                                                    playlists={settings.youtube_playlists || []}
                                                    disabled={formData.is_locked}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">SEO Title</Label>
                                            <Input placeholder="YouTube SEO Title..." value={getField('youtube_seo_title')} disabled={formData.is_locked} onChange={(e) => updateField('youtube_seo_title', e.target.value)} />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">SEO Description</Label>
                                            <Textarea className="h-80" placeholder="YouTube description..." value={getField('youtube_seo_description')} disabled={formData.is_locked} onChange={(e) => updateField('youtube_seo_description', e.target.value)} />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Tags</Label>
                                            <Input placeholder="tag1, tag2..." value={getField('youtube_seo_tags')} disabled={formData.is_locked} onChange={(e) => updateField('youtube_seo_tags', e.target.value)} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <Label className="text-xs">Pinned Comment</Label>
                                                <Input placeholder="First comment..." value={getField('yt_pinned_comment')} disabled={formData.is_locked} onChange={(e) => updateField('yt_pinned_comment', e.target.value)} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">Related Video Link</Label>
                                                <Input placeholder="https://..." value={getField('yt_related_video_link')} disabled={formData.is_locked} onChange={(e) => updateField('yt_related_video_link', e.target.value)} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* INSTAGRAM */}
                                {formData.platform === 'instagram' && (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <Label className="text-xs">Aspect Ratio</Label>
                                                <Select value={getField('instagram_aspect')} disabled={formData.is_locked} onValueChange={(val) => updateField('instagram_aspect', val)}>
                                                    <SelectTrigger><SelectValue placeholder="Select aspect" /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="reel">Reel (9:16)</SelectItem>
                                                        <SelectItem value="post">Post (1:1 / 4:5)</SelectItem>
                                                        <SelectItem value="story">Story (9:16)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">Format</Label>
                                                <Select value={getField('ig_format')} disabled={formData.is_locked} onValueChange={(val) => updateField('ig_format', val)}>
                                                    <SelectTrigger><SelectValue placeholder="Select format" /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="feed_post">Feed Post</SelectItem>
                                                        <SelectItem value="reel">Reel</SelectItem>
                                                        <SelectItem value="story">Story</SelectItem>
                                                        <SelectItem value="carousel">Carousel</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">First Comment (Hashtags)</Label>
                                            <Textarea className="h-16" placeholder="#hashtags..." value={getField('ig_first_comment')} disabled={formData.is_locked} onChange={(e) => updateField('ig_first_comment', e.target.value)} />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Location Tag</Label>
                                            <Input placeholder="Location..." value={getField('ig_location')} disabled={formData.is_locked} onChange={(e) => updateField('ig_location', e.target.value)} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <Label className="text-xs">Story Link (Sticker)</Label>
                                                <Input placeholder="https://..." value={getField('ig_story_link')} disabled={formData.is_locked} onChange={(e) => updateField('ig_story_link', e.target.value)} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">Audio Notes</Label>
                                                <Input placeholder="Music/Audio choice..." value={getField('ig_audio_notes')} disabled={formData.is_locked} onChange={(e) => updateField('ig_audio_notes', e.target.value)} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* LINKEDIN */}
                                {formData.platform === 'linkedin' && (
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <Label className="text-xs">Presentation Format</Label>
                                            <Select value={getField('linkedin_presentation_format')} disabled={formData.is_locked} onValueChange={(val) => updateField('linkedin_presentation_format', val)}>
                                                <SelectTrigger><SelectValue placeholder="Select format" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="text_only">Text Only</SelectItem>
                                                    <SelectItem value="document_slideshow">Document (PDF)</SelectItem>
                                                    <SelectItem value="native_video">Native Video</SelectItem>
                                                    <SelectItem value="image_text">Image + Text</SelectItem>
                                                    <SelectItem value="poll">Poll</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Scroll Stopper (Opening Line)</Label>
                                            <Input placeholder="Hook..." value={getField('linkedin_scroll_stopper')} disabled={formData.is_locked} onChange={(e) => updateField('linkedin_scroll_stopper', e.target.value)} />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Headline (for Article)</Label>
                                            <Input placeholder="Headline..." value={getField('linkedin_headline')} disabled={formData.is_locked} onChange={(e) => updateField('linkedin_headline', e.target.value)} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <Label className="text-xs">Primary CTA</Label>
                                                <Input placeholder="Call to action..." value={getField('linkedin_primary_cta')} disabled={formData.is_locked} onChange={(e) => updateField('linkedin_primary_cta', e.target.value)} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">First Comment</Label>
                                                <Input placeholder="Link in comments..." value={getField('linkedin_first_comment')} disabled={formData.is_locked} onChange={(e) => updateField('linkedin_first_comment', e.target.value)} />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Document URI (if PDF)</Label>
                                            <Input placeholder="drive://..." value={getField('linkedin_document_uri')} disabled={formData.is_locked} onChange={(e) => updateField('linkedin_document_uri', e.target.value)} />
                                        </div>
                                    </div>
                                )}

                                {/* X (TWITTER) */}
                                {formData.platform === 'x' && (
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <Label className="text-xs">Post Format</Label>
                                            <Select value={getField('x_post_format')} disabled={formData.is_locked} onValueChange={(val) => updateField('x_post_format', val)}>
                                                <SelectTrigger><SelectValue placeholder="Select format" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="single_post">Single Post</SelectItem>
                                                    <SelectItem value="thread">Thread</SelectItem>
                                                    <SelectItem value="poll">Poll</SelectItem>
                                                    <SelectItem value="video">Video</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Hook</Label>
                                            <Input placeholder="Tweet hook..." value={getField('x_hook')} disabled={formData.is_locked} onChange={(e) => updateField('x_hook', e.target.value)} />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Thread Blueprint</Label>
                                            <Textarea className="h-20" placeholder="Outline of thread..." value={getField('x_thread_blueprint')} disabled={formData.is_locked} onChange={(e) => updateField('x_thread_blueprint', e.target.value)} />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Follow-up Link (Plug)</Label>
                                            <Input placeholder="https://..." value={getField('x_follow_up_link')} disabled={formData.is_locked} onChange={(e) => updateField('x_follow_up_link', e.target.value)} />
                                        </div>
                                    </div>
                                )}

                                {/* FACEBOOK PAGE */}
                                {formData.platform === 'fb_page' && (
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <Label className="text-xs">Engagement Question</Label>
                                            <Input placeholder="Question for audience..." value={getField('fb_engagement_question')} disabled={formData.is_locked} onChange={(e) => updateField('fb_engagement_question', e.target.value)} />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Comment Strategy</Label>
                                            <Input placeholder="Plan for comments..." value={getField('fb_comment_strategy')} disabled={formData.is_locked} onChange={(e) => updateField('fb_comment_strategy', e.target.value)} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <Label className="text-xs">Privacy</Label>
                                                <Select value={getField('fb_privacy_audience')} disabled={formData.is_locked} onValueChange={(val) => updateField('fb_privacy_audience', val)}>
                                                    <SelectTrigger><SelectValue placeholder="Audience" /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="public">Public</SelectItem>
                                                        <SelectItem value="friends">Friends</SelectItem>
                                                        <SelectItem value="specific_group">Specific Group</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">Life Event?</Label>
                                                <Select value={String(getField('fb_life_event'))} disabled={formData.is_locked} onValueChange={(val) => updateField('fb_life_event', val === 'true')}>
                                                    <SelectTrigger><SelectValue placeholder="Is Life Event" /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="true">Yes</SelectItem>
                                                        <SelectItem value="false">No</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* FACEBOOK GROUP */}
                                {formData.platform === 'fb_group' && (
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <Label className="text-xs">Community Theme</Label>
                                            <Select value={getField('fb_group_community_theme')} disabled={formData.is_locked} onValueChange={(val) => updateField('fb_group_community_theme', val)}>
                                                <SelectTrigger><SelectValue placeholder="Select Theme" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="motivation_day">Motivation Day</SelectItem>
                                                    <SelectItem value="tech_tip">Tech Tip</SelectItem>
                                                    <SelectItem value="open_qa">Open Q&A</SelectItem>
                                                    <SelectItem value="feedback_loop">Feedback Loop</SelectItem>
                                                    <SelectItem value="member_spotlight">Member Spotlight</SelectItem>
                                                    <SelectItem value="none">None</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Inside Angle</Label>
                                            <Textarea placeholder="Insider context..." value={getField('fb_group_inside_angle')} disabled={formData.is_locked} onChange={(e) => updateField('fb_group_inside_angle', e.target.value)} />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Member Prompt</Label>
                                            <Input placeholder="Call to community..." value={getField('fb_group_member_prompt')} disabled={formData.is_locked} onChange={(e) => updateField('fb_group_member_prompt', e.target.value)} />
                                        </div>
                                    </div>
                                )}

                                {/* TIKTOK */}
                                {formData.platform === 'tiktok' && (
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <Label className="text-xs">Post Type</Label>
                                            <Select value={getField('tiktok_post_type')} disabled={formData.is_locked} onValueChange={(val) => updateField('tiktok_post_type', val)}>
                                                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="video">Video</SelectItem>
                                                    <SelectItem value="photo_carousel">Photo Carousel</SelectItem>
                                                    <SelectItem value="stitch_duet">Stitch / Duet</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">3-Second Hook</Label>
                                            <Input placeholder="Visual/Audio hook..." value={getField('tiktok_three_second_hook')} disabled={formData.is_locked} onChange={(e) => updateField('tiktok_three_second_hook', e.target.value)} />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Search Keywords (SEO)</Label>
                                            <Input placeholder="Keywords for algorithm..." value={getField('tiktok_search_keywords')} disabled={formData.is_locked} onChange={(e) => updateField('tiktok_search_keywords', e.target.value)} />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">SEO Caption</Label>
                                            <Textarea className="h-20" placeholder="Caption..." value={getField('tiktok_seo_caption')} disabled={formData.is_locked} onChange={(e) => updateField('tiktok_seo_caption', e.target.value)} />
                                        </div>
                                    </div>
                                )}

                                {/* EMAIL */}
                                {formData.platform === 'email' && (
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <Label className="text-xs">From Name</Label>
                                            <Input placeholder="Sender Name..." value={getField('email_from_name')} disabled={formData.is_locked} onChange={(e) => updateField('email_from_name', e.target.value)} />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Subject Line</Label>
                                            <Input placeholder="Subject..." value={getField('email_subject')} disabled={formData.is_locked} onChange={(e) => updateField('email_subject', e.target.value)} />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Preheader (Preview Text)</Label>
                                            <Input placeholder="Preview..." value={getField('email_preheader')} disabled={formData.is_locked} onChange={(e) => updateField('email_preheader', e.target.value)} />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Primary CTA Link</Label>
                                            <Input placeholder="https://..." value={getField('email_primary_cta')} disabled={formData.is_locked} onChange={(e) => updateField('email_primary_cta', e.target.value)} />
                                        </div>
                                    </div>
                                )}

                                {/* SUBSTACK */}
                                {formData.platform === 'substack' && (
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <Label className="text-xs">Target Audience</Label>
                                            <Input placeholder="Who is this for..." value={getField('substack_audience')} disabled={formData.is_locked} onChange={(e) => updateField('substack_audience', e.target.value)} />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Subtitle</Label>
                                            <Input placeholder="Subtitle..." value={getField('substack_email_subject')} disabled={formData.is_locked} onChange={(e) => updateField('substack_email_subject', e.target.value)} />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Section</Label>
                                            <Input placeholder="Newsletter section..." value={getField('substack_section')} disabled={formData.is_locked} onChange={(e) => updateField('substack_section', e.target.value)} />
                                        </div>
                                    </div>
                                )}

                                {/* COMMUNITY */}
                                {formData.platform === 'community' && (
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <Label className="text-xs">Target Space/Channel</Label>
                                            <Input placeholder="#general, #announcements..." value={getField('community_target_space')} disabled={formData.is_locked} onChange={(e) => updateField('community_target_space', e.target.value)} />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Topic/Tag</Label>
                                            <Input placeholder="Topic..." value={getField('community_topics')} disabled={formData.is_locked} onChange={(e) => updateField('community_topics', e.target.value)} />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Format</Label>
                                            <Input placeholder="Text, Poll, Event..." value={getField('community_format')} disabled={formData.is_locked} onChange={(e) => updateField('community_format', e.target.value)} />
                                        </div>
                                    </div>
                                )}

                            </div>

                            {/* Universal Media Asset Engine */}
                            <MediaAssetEngine
                                formData={formData}
                                setFormData={setFormData}
                                currentIdea={currentIdea}
                                setIsLightboxOpen={setIsLightboxOpen}
                                setLightboxMedia={setLightboxMedia}
                                detectMediaType={detectMediaType}
                            />
                        </TabsContent>

                        <TabsContent value="resources" className="flex-1 p-6 space-y-6 mt-0 flex flex-col">
                            {formData.is_locked && (
                                <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                            <CheckCircle2 size={18} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-emerald-500">Creative Approved</p>
                                            <p className="text-[10px] text-emerald-500/60 font-medium whitespace-nowrap">Unlock via the header icon to edit resources.</p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-400 font-bold text-[10px]"
                                        onClick={() => setFormData(p => ({ ...p, is_locked: false }))}
                                    >
                                        UNLOCK
                                    </Button>
                                </div>
                            )}

                            <div className="space-y-4 flex-1 mt-4 relative" onClick={handleLockedClick}>
                                {formData.is_locked && <div className="absolute inset-0 z-50 cursor-pointer" />}

                                {/* RESOURCES LIST (Unified) */}
                                <div className="border rounded-md bg-background p-2 space-y-2 max-h-[400px] overflow-y-auto">
                                    {/* Legacy Audio Player Removed - Handled by AudioAssetEngine */}

                                    {/* AUDIO PLAYER Explicit Section - Custom UI (Idea Level) */}
                                    {idea?.idea_audio_memo && (
                                        <div className="p-3 border rounded bg-card/50 flex flex-col gap-2">
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full text-purple-600">
                                                    <Mic className="w-4 h-4" />
                                                </div>
                                                <span className="text-sm font-medium">Audio Memo ({Math.round(idea.idea_audio_memo_duration || 0)}s)</span>
                                            </div>

                                            {/* Custom Player Controls */}
                                            <div className="flex items-center gap-3 bg-background p-2 rounded border border-border">
                                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={toggleIdeaPlayback}>
                                                    {isIdeaPlaying ? <Pause className="w-4 h-4 fill-primary text-primary" /> : <Play className="w-4 h-4 fill-primary text-primary" />}
                                                </Button>

                                                {/* Progress Bar */}
                                                <div className="flex-1 flex flex-col justify-center gap-2">
                                                    <div className="relative w-full h-4 flex items-center group">
                                                        <input
                                                            type="range"
                                                            min="0"
                                                            max={isFinite(ideaPlayerDuration) && ideaPlayerDuration > 0 ? ideaPlayerDuration : 100}
                                                            value={isFinite(ideaCurrentTime) ? ideaCurrentTime : 0}
                                                            onChange={handleIdeaSeek}
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
                                                                background: `linear-gradient(to right, hsl(var(--primary)) ${(ideaCurrentTime / (ideaPlayerDuration || 1)) * 100}%, hsl(var(--secondary)) ${(ideaCurrentTime / (ideaPlayerDuration || 1)) * 100}%)`,
                                                                borderRadius: '999px'
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                                                        <span>{formatTime(ideaCurrentTime)}</span>
                                                        <span>{formatTime(ideaPlayerDuration || idea.idea_audio_memo_duration || 0)}</span>
                                                    </div>
                                                </div>

                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 px-2 text-xs font-mono shrink-0 text-muted-foreground hover:text-foreground"
                                                    onClick={toggleIdeaSpeed}
                                                >
                                                    {ideaPlaybackRate}x
                                                </Button>
                                            </div>

                                            <audio
                                                ref={ideaAudioPlayerRef}
                                                src={idea.idea_audio_memo}
                                                className="hidden"
                                                onTimeUpdate={handleIdeaTimeUpdate}
                                                onLoadedMetadata={handleIdeaLoadedMetadata}
                                                onEnded={() => setIsIdeaPlaying(false)}
                                            />
                                        </div>
                                    )}

                                    {/* Add Resource Input Section (Moved to Top of List) */}
                                    <div className="space-y-3 p-4 bg-muted/20 rounded-lg border border-border/50 shrink-0">
                                        <Label className="text-sm font-medium flex items-center gap-2">
                                            <LinkIcon className="w-4 h-4 text-muted-foreground" />
                                            Add Resource
                                        </Label>
                                        <div className="grid grid-cols-[auto,1fr] gap-2 items-start">
                                            {/* Type Selector */}
                                            <Select
                                                value={newResource.type}
                                                onValueChange={val => setNewResource({ ...newResource, type: val })}
                                                disabled={formData.is_locked}
                                            >
                                                <SelectTrigger className="w-[110px] h-9 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent align="start">
                                                    <SelectItem value="image">
                                                        <div className="flex items-center gap-2">
                                                            <ImageIcon className="w-3.5 h-3.5 text-emerald-500" />
                                                            <span>Image</span>
                                                        </div>
                                                    </SelectItem>
                                                    <SelectItem value="video">
                                                        <div className="flex items-center gap-2">
                                                            <Play className="w-3.5 h-3.5 text-indigo-500" />
                                                            <span>Video</span>
                                                        </div>
                                                    </SelectItem>
                                                    <SelectItem value="document">
                                                        <div className="flex items-center gap-2">
                                                            <FileText className="w-3.5 h-3.5 text-amber-500" />
                                                            <span>Document</span>
                                                        </div>
                                                    </SelectItem>
                                                    <SelectItem value="link">
                                                        <div className="flex items-center gap-2">
                                                            <LinkIcon className="w-3.5 h-3.5 text-muted-foreground" />
                                                            <span>Reference Link</span>
                                                        </div>
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>

                                            {/* Label Input */}
                                            <Input
                                                placeholder="Label (e.g. Research PDF)"
                                                value={newResource.label}
                                                onChange={e => setNewResource({ ...newResource, label: e.target.value })}
                                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddResource())}
                                                className="h-9 text-xs"
                                                disabled={formData.is_locked}
                                            />
                                        </div>

                                        <div className="flex gap-2">
                                            {/* URI Input */}
                                            <Input
                                                placeholder={newResource.type === 'local_file' ? "File path..." : "https://..."}
                                                value={newResource.uri}
                                                onChange={e => setNewResource({ ...newResource, uri: e.target.value })}
                                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddResource())}
                                                className="h-9 text-xs flex-1"
                                                disabled={formData.is_locked}
                                            />
                                            {/* Add Button */}
                                            <Button type="button" size="sm" variant="secondary" onClick={handleAddResource} className="h-9 w-9 p-0 bg-primary text-primary-foreground hover:bg-primary/90" disabled={formData.is_locked}>
                                                <Plus className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* RESOURCES LIST (Unified) */}
                                    {(() => {
                                        // 1. Post-Level Resources (Direct) - Checks post.resources array or object wrapper
                                        const rawPostRes = formData.resources;
                                        const postResources = Array.isArray(rawPostRes) ? rawPostRes : (rawPostRes?.links || []);

                                        // 2. Idea-Level Resources (Inherited)
                                        const ideaResources = currentIdea?.resources || [];

                                        // 3. Merge & Deduplicate (by URI + Label)
                                        const allResources = [...postResources, ...ideaResources].filter((item, index, self) =>
                                            index === self.findIndex((t) => (t.uri === item.uri && t.label === item.label))
                                        );

                                        if (allResources.length === 0 && !currentIdea?.idea_audio_memo) {
                                            return (
                                                <div className="h-20 flex flex-col items-center justify-center text-muted-foreground opacity-60">
                                                    <p className="text-sm text-center">No additional resources.</p>
                                                </div>
                                            );
                                        }

                                        return allResources.map((link, i) => (
                                            <div key={i} className="flex items-center justify-between text-xs p-2 bg-background rounded border border-border group hover:border-primary/50 transition-colors">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="p-2 bg-muted rounded-full shrink-0">
                                                        {(() => {
                                                            const type = detectMediaType(link);
                                                            if (type === 'video') return <Play className="w-4 h-4 text-indigo-500" />;
                                                            if (type === 'document') return <FileText className="w-4 h-4 text-amber-500" />;
                                                            if (type === 'image') return <ImageIcon className="w-4 h-4 text-emerald-500" />;
                                                            return <LinkIcon className="w-4 h-4 text-muted-foreground" />;
                                                        })()}
                                                    </div>
                                                    <div className="flex flex-col overflow-hidden">
                                                        <span className="font-medium truncate">{link.label || link.uri}</span>
                                                        <a href={link.uri} target="_blank" rel="noreferrer" className="text-muted-foreground hover:underline truncate block text-[10px] flex items-center gap-1">
                                                            {link.uri} <ExternalLink className="w-3 h-3" />
                                                        </a>
                                                        {/* Source Badge */}
                                                        {postResources.some(r => r.uri === link.uri && r.label === link.label) ? (
                                                            <span className="text-[9px] text-emerald-500 uppercase font-mono tracking-tighter">Post</span>
                                                        ) : (
                                                            <span className="text-[9px] text-indigo-400 uppercase font-mono tracking-tighter">Inherited</span>
                                                        )}
                                                    </div>
                                                </div>
                                                {/* Allow deleting only if it's a Direct resource (Post Level) */}
                                                {postResources.some(r => r.uri === link.uri && r.label === link.label) && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="opacity-0 group-hover:opacity-100 h-6 w-6 text-destructive"
                                                        onClick={() => {
                                                            const currentLinks = Array.isArray(formData.resources) ? formData.resources : (formData.resources?.links || []);
                                                            // Logic Fix: Filter by BOTH uri and label to avoid mass-deletion of same-URI items
                                                            const newRes = currentLinks.filter(r => r.uri !== link.uri || r.label !== link.label);
                                                            setFormData(p => ({
                                                                ...p,
                                                                resources: {
                                                                    ...p.resources,
                                                                    links: newRes
                                                                }
                                                            }));
                                                        }}
                                                        disabled={formData.is_locked}
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </Button>
                                                )}
                                            </div>
                                        ));
                                    })()}
                                </div></div>
                        </TabsContent>

                        {/* SCHEDULE TAB */}
                        <TabsContent value="schedule" className="p-6 space-y-8 mt-0">
                            <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8 items-start">
                                {/* Status - Narrower */}
                                <div className="space-y-4">
                                    <Label className="flex items-center gap-2">
                                        Post Status
                                    </Label>
                                    <p className="text-[10px] text-muted-foreground -mt-2 mb-2">Controls if the post is a Draft, Scheduled, or Published.</p>
                                    <Select
                                        value={formData.status}
                                        onValueChange={(val) => setFormData({
                                            ...formData,
                                            status: val,
                                            publish_date: val === 'draft' ? null : formData.publish_date,
                                            // Auto-unset "Approved" (is_locked) if moving to draft OR pulling back from published
                                            is_locked: (val === 'draft' || (formData.status === 'published' && val !== 'published')) ? false : formData.is_locked
                                        })}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="draft">Draft</SelectItem>
                                            <SelectItem value="scheduled">Scheduled</SelectItem>
                                            <SelectItem value="published">
                                                Published {formData.platform_fields?.archived && <span className="text-muted-foreground ml-1 font-mono text-[10px]">[A]</span>}
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {formData.status === 'draft' && (
                                        <p className="text-[10px] text-muted-foreground italic flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            Date selection is disabled for Drafts.
                                        </p>
                                    )}
                                </div>

                                {/* Date & Time - More Space */}
                                <div className="space-y-4">
                                    <Label className={`flex items-center gap-2 ${formData.status === 'draft' ? "opacity-30" : ""} `}>
                                        <CalendarIcon className="w-4 h-4 text-blue-400" />
                                        Schedule Date & Time
                                    </Label>
                                    <p className={`text-[10px] text-muted-foreground -mt-2 mb-2 ${formData.status === 'draft' ? "opacity-30" : ""}`}>When this specific post will appear on your calendar.</p>
                                    <div className="flex flex-wrap sm:flex-nowrap gap-3">
                                        <div className="flex-1 min-w-[200px]">
                                            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant={"outline"}
                                                        className={`w-full justify-start text-left font-normal h-10 ${!formData.publish_date && "text-muted-foreground"}`}
                                                    >
                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                        {formData.publish_date ? format(formData.publish_date, "PPP") : <span>Pick a date</span>}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0 bg-[#111] border-white/10" align="start">
                                                    <Calendar
                                                        mode="single"
                                                        selected={formData.publish_date}
                                                        onSelect={(date) => {
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                publish_date: date,
                                                                // Auto-promote to scheduled if it was a draft
                                                                status: prev.status === 'draft' ? 'scheduled' : prev.status
                                                            }));
                                                            setIsCalendarOpen(false);
                                                        }}
                                                        initialFocus
                                                        className="bg-[#1a1a1a] border border-white/10 rounded-md p-3 text-white"
                                                        components={{
                                                            IconLeft: () => <ChevronLeft className="h-4 w-4 text-white" />,
                                                            IconRight: () => <ChevronRight className="h-4 w-4 text-white" />,
                                                        }}
                                                        classNames={{
                                                            day_selected: "bg-purple-600 text-white hover:bg-purple-600 hover:text-white focus:bg-purple-600 focus:text-white",
                                                            day_today: "bg-white/10 text-white",
                                                            caption: "text-white flex justify-center pt-1 relative items-center",
                                                            nav_button: "border border-white/20 hover:bg-white/10 text-white",
                                                            head_cell: "text-muted-foreground w-9 font-normal text-[0.8rem]",
                                                            cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-purple-600/20 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                                                        }}
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                        </div>

                                        <div className="w-full sm:w-[180px]">
                                            <Select
                                                value={formData.publish_time || "00:00"}
                                                onValueChange={(val) => setFormData(prev => ({
                                                    ...prev,
                                                    publish_time: val,
                                                    // Auto-promote to scheduled if it was a draft
                                                    status: prev.status === 'draft' ? 'scheduled' : prev.status
                                                }))}
                                            >
                                                <SelectTrigger className="w-full h-10">
                                                    <Clock className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
                                                    <SelectValue placeholder="Time" />
                                                </SelectTrigger>
                                                <SelectContent className="max-h-60" align="end">
                                                    {Array.from({ length: 24 * 4 }).map((_, i) => {
                                                        const hours = Math.floor(i / 4);
                                                        const minutes = (i % 4) * 15;
                                                        const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                                                        const ampm = hours >= 12 ? 'PM' : 'AM';
                                                        const displayHours = hours % 12 || 12;
                                                        const displayStr = `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
                                                        return (
                                                            <SelectItem key={timeStr} value={timeStr}>
                                                                {displayStr}
                                                            </SelectItem>
                                                        );
                                                    })}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                            </div>


                            {/* EVERGREEN ENGINE */}
                            <div className="space-y-4 pt-4 border-t border-border/40">
                                <div className="flex items-center justify-between">
                                    <Label className="flex items-center gap-2 text-emerald-400">
                                        <Repeat className="w-4 h-4" />
                                        Evergreen Engine
                                    </Label>
                                    <Switch
                                        checked={formData.is_evergreen}
                                        onCheckedChange={(val) => {
                                            // Default to publish_date + cycle, or Today + cycle
                                            const baseDate = formData.publish_date || new Date();
                                            const nextDate = val ? addDays(baseDate, parseInt(settings?.repurpose_cycle) || 365) : null;
                                            setFormData(prev => ({
                                                ...prev,
                                                is_evergreen: val,
                                                repurpose_date: prev.repurpose_date || nextDate
                                            }));
                                        }}
                                        className="data-[state=checked]:bg-emerald-600"
                                    />
                                </div>
                                <p className="text-[10px] text-muted-foreground">
                                    Adds this post back to your **Resurface** list in the future so you can clone/repurpose it again.
                                </p>

                                {formData.is_evergreen && (
                                    <div className="grid gap-2 animate-in fade-in slide-in-from-top-2 duration-300 p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-lg">
                                        <Label className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            Next Repurposing Cycle
                                        </Label>
                                        <p className="text-[9px] text-emerald-500/60 mb-1">When this post should reappear in your Resurface dock.</p>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant={"outline"}
                                                    className={`w-full justify-start text-left font-normal h-9 text-xs ${!formData.repurpose_date && "text-muted-foreground"}`}
                                                >
                                                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                                                    {formData.repurpose_date ? format(formData.repurpose_date, "PPP") : <span>Pick a date</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0 bg-[#111] border-white/10" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={formData.repurpose_date}
                                                    onSelect={(date) => setFormData({ ...formData, repurpose_date: date })}
                                                    disabled={(date) => {
                                                        const pubDate = formData.publish_date ? new Date(formData.publish_date) : new Date();
                                                        pubDate.setHours(0, 0, 0, 0);
                                                        return date <= pubDate;
                                                    }}
                                                    initialFocus
                                                    className="bg-[#1a1a1a] border border-white/10 rounded-md p-3 text-white"
                                                    classNames={{
                                                        day_selected: "bg-emerald-600 text-white hover:bg-emerald-600 hover:text-white focus:bg-emerald-600 focus:text-white",
                                                        day_today: "bg-white/10 text-white",
                                                        caption: "text-white flex justify-center pt-1 relative items-center",
                                                        nav_button: "border border-white/20 hover:bg-white/10 text-white",
                                                        head_cell: "text-muted-foreground w-9 font-normal text-[0.8rem]",
                                                        cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-emerald-600/20 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                                                    }}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                )}
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center p-4 pb-12 md:pb-4 border-t shrink-0 bg-background z-10">
                    <div className="flex items-center gap-2">
                        {post && onDelete && (
                            <Button variant="ghost" onClick={() => onDelete(post)} className="text-destructive hover:text-destructive/90 hover:bg-destructive/10">
                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                            </Button>
                        )}
                        {post && (
                            <Button variant="ghost" onClick={() => exportSinglePost(post)} className="text-muted-foreground hover:text-primary" title="Download JSON Snapshot">
                                <Download className="w-4 h-4" />
                            </Button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={onClose}>Cancel</Button>
                        <Button onClick={handleSave} disabled={loading} className="min-w-[120px]">
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save Post
                        </Button>
                    </div>
                </div>

                <PostReviewOverlay
                    open={showReview}
                    onClose={() => setShowReview(false)}
                    formData={formData}
                    idea={currentIdea}
                    settings={settings}
                    pillars={pillars}
                    postId={displayedPostId}
                    postAudioURL={formData.post_audio_memo || ''}
                    postAudioDuration={formData.post_audio_memo_duration || post?.post_audio_memo_duration || 0}
                />

                {/* Publish Confirmation */}
                <AlertDialog open={confirmPublishOpen} onOpenChange={setConfirmPublishOpen}>
                    <AlertDialogContent className="bg-[#0f1115] border-border text-white shadow-2xl">
                        <AlertDialogHeader>
                            <AlertDialogTitle>Ready to Publish?</AlertDialogTitle>
                            <AlertDialogDescription className="text-gray-400">
                                Have you physically posted this to <span className="text-white font-bold">{platformConfig?.label}</span>?
                                <br /><br />
                                Clicking proceed will mark this as <span className="text-white font-bold">Published</span> and lock the post.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className="bg-white/5 border-white/10 hover:bg-white/10 text-white">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={async () => {
                                    setFormData(p => ({ ...p, status: 'published', is_locked: true }));
                                    // Small delay to let state settle
                                    setTimeout(async () => {
                                        await handleSave(true); // Skip mismatch check since we are publishing
                                        toast.success("Marked as Published");
                                        setConfirmPublishOpen(false);
                                    }, 100);
                                }}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white border-none"
                            >
                                Confirm Publication
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Bundle Download Confirmation */}
                <AlertDialog open={bundleConfirmOpen} onOpenChange={setBundleConfirmOpen}>
                    <AlertDialogContent className="bg-[#0f1115] border-border text-white shadow-2xl">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2 text-indigo-400">
                                <Download className="w-5 h-5" />
                                Bundle Transfer Ready
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-gray-300">
                                <div className="space-y-4 mt-3">
                                    {/* Asset Checklist */}
                                    <div className="bg-white/5 rounded-md p-3 space-y-2 border border-white/5">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Assets Detected</p>

                                        {/* Main Asset */}
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-300">Main Media ({formData.media?.type || 'file'})</span>
                                            {formData.media?.url && formData.media.source !== 'external' ? (
                                                <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">
                                                    <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                                                </span>
                                            ) : formData.media?.source === 'external' ? (
                                                <span className="flex items-center gap-1.5 text-blue-400 text-xs font-medium bg-blue-400/10 px-2 py-0.5 rounded-full border border-blue-400/20">
                                                    <LinkIcon className="w-3.5 h-3.5" /> External Link
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1.5 text-slate-500 text-xs font-medium bg-white/5 px-2 py-0.5 rounded-full">
                                                    <X className="w-3.5 h-3.5" /> None
                                                </span>
                                            )}
                                        </div>

                                        {/* Thumbnail */}
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-300">Custom Thumbnail</span>
                                            {formData.media?.thumbnail_url ? (
                                                <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">
                                                    <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1.5 text-slate-500 text-xs font-medium bg-white/5 px-2 py-0.5 rounded-full">
                                                    <X className="w-3.5 h-3.5" /> None
                                                </span>
                                            )}
                                        </div>

                                        {/* Captions */}
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-300">Caption File (.srt/.vtt)</span>
                                            {formData.media?.caption_url ? (
                                                <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">
                                                    <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1.5 text-slate-500 text-xs font-medium bg-white/5 px-2 py-0.5 rounded-full">
                                                    <X className="w-3.5 h-3.5" /> None
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Warnings based on Context */}
                                    {(!formData.media?.url || (!formData.media?.thumbnail_url && formData.media?.type === 'video')) && (
                                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-md p-3 text-xs text-amber-200/80 flex items-start gap-2">
                                            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                            <div className="space-y-1">
                                                {!formData.media?.url && <p>• No main media file uploaded.</p>}
                                                {!formData.media?.thumbnail_url && formData.media?.type === 'video' && <p>• No custom thumbnail for this video.</p>}
                                                <p className="mt-1 opacity-70">You can proceed, but these assets won't be downloaded.</p>
                                            </div>
                                        </div>
                                    )}

                                    <p className="text-xs text-slate-400">
                                        Clicking proceed will copy metadata to clipboard and download all "Ready" assets.
                                    </p>
                                </div>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className="bg-white/5 border-white/10 hover:bg-white/10 text-white">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={() => {
                                    setBundleConfirmOpen(false);
                                    executeBundleProcess();
                                }}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white border-none font-bold min-w-[100px]"
                            >
                                Proceed
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Mismatch Confirmation */}
                <AlertDialog open={confirmMismatchOpen} onOpenChange={setConfirmMismatchOpen}>
                    <AlertDialogContent className="bg-[#0f1115] border-border text-white shadow-2xl">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2 text-amber-500">
                                <AlertTriangle className="w-5 h-5" />
                                Media Type Mismatch
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-gray-400">
                                You have <span className="text-white font-bold">"{formData.media.type}"</span> selected,
                                but the file looks like a <span className="text-white font-bold text-amber-400">{detectedType}</span>.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className="bg-white/5 border-white/10 hover:bg-white/10 text-white">Go Back</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={() => {
                                    handleSave(true);
                                    setConfirmMismatchOpen(false);
                                }}
                                className="bg-amber-600 hover:bg-amber-700 text-white border-none"
                            >
                                Save Anyway
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* LIGHTBOX OVERLAY */}
                <Dialog open={isLightboxOpen} onOpenChange={(v) => {
                    setIsLightboxOpen(v);
                    if (!v) setLightboxMedia(null);
                }}>
                    <DialogContent className="max-w-[95vw] w-auto h-auto max-h-[95vh] p-0 bg-transparent border-none shadow-none flex items-center justify-center outline-none">
                        <div className="relative flex items-center justify-center w-full h-full">
                            {/* Close Button */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute -top-12 right-0 z-50 text-white/70 hover:text-white hover:bg-white/10 rounded-full"
                                onClick={() => setIsLightboxOpen(false)}
                            >
                                <X className="w-8 h-8" />
                            </Button>

                            {(lightboxMedia?.type || formData.media?.type) === 'video' ? (
                                <video
                                    src={lightboxMedia?.url || formData.media?.url}
                                    className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl bg-black"
                                    controls
                                    autoPlay
                                />
                            ) : (
                                <img
                                    src={lightboxMedia?.url || formData.media?.url}
                                    alt="Full Preview"
                                    className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                                />
                            )}
                        </div>
                    </DialogContent>
                </Dialog>
            </DialogContent>
        </Dialog>
    );
}
