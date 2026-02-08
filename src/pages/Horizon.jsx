import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePosts } from '../hooks/usePosts';
import { useIdeas } from '../hooks/useIdeas';
import { useSettings } from '../hooks/useSettings';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import {
    Calendar as CalendarIcon,
    CalendarPlus,
    Search,
    ArrowUpDown,
    ExternalLink,
    Clock,
    Archive,
    Loader2,
    Trash2,
    Undo2,
    ChevronLeft,
    ChevronRight,
    Shapes,
    LayoutGrid,
    Repeat,
    Copy,
    BellOff,
    XCircle,
    Inbox
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, startOfDay, addDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { SORTED_PLATFORMS, PLATFORM_CONFIG } from '../config/platforms';
import { formatPostId } from '../utils/postIdFormatter';
import { DndContext, useDraggable, useDroppable, PointerSensor, TouchSensor, useSensor, useSensors, DragOverlay, pointerWithin } from '@dnd-kit/core';
import { toast } from "sonner";
import ArchiveResetModal from '../components/horizon/ArchiveResetModal';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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
// Quick Schedule UI
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

// --- DND WRAPPERS ---

// --- DND COMPONENTS ---

// 1. Pure UI Component (Shared by Draggable & Overlay)
const PostCard = React.forwardRef(({ post, idea, settings, onSaveScroll, onQuickSchedule, style, className, isDragging, isOverlay, compact, dockViewMode, onClone, onSnooze, onDismiss, ...props }, ref) => {
    const pillars = settings?.content_pillars || settings?.pillars || [];
    const pillarData = pillars.find(p => p && (p.name === post.definitive_pillar || p.id === post.definitive_pillar));
    const pillarColor = pillarData?.color || '#cbd5e1';
    const platform = PLATFORM_CONFIG[post.platform];
    const PlatformIcon = platform?.icon || CalendarIcon;
    const [isCalendarOpen, setIsCalendarOpen] = useState(false); // Local state for popover

    const now = new Date();
    let pDate = post.publish_date?.seconds ? new Date(post.publish_date.seconds * 1000) : new Date(post.publish_date);
    if (post.publish_time && pDate) {
        const [h, m] = post.publish_time.split(':');
        pDate = new Date(pDate);
        pDate.setHours(parseInt(h), parseInt(m), 0, 0);
    }
    const isOverdue = post.status === 'scheduled' && post.publish_date && pDate < now;
    const displayStatus = isOverdue ? 'overdue' : post.status;

    const statusTextColors = {
        draft: 'text-slate-400',
        scheduled: 'text-amber-500',
        published: 'text-emerald-500',
        overdue: 'text-red-500',
    };

    // --- COMPACT MODE (Drag Overlay Badge) ---
    if (compact) {
        return (
            <div
                ref={ref}
                style={{
                    ...style,
                    borderLeft: `3px solid ${pillarColor}`
                }}
                className={cn(
                    "flex items-center gap-2 p-2 bg-[#1a1d24] border border-indigo-500/50 rounded-lg shadow-2xl rotate-2 scale-105 z-50 w-auto max-w-[200px] overflow-hidden",
                    className
                )}
                {...props}
            >
                {/* Icon */}
                <div className="p-1 rounded-full bg-background/80 border border-border/50 shrink-0">
                    <PlatformIcon size={12} style={{ color: platform?.color }} />
                </div>

                {/* ID Pill (Always Show in Overlay) */}
                <div
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded border-2 bg-background/40 text-white flex items-center shadow-sm shrink-0 whitespace-nowrap"
                    style={{ borderColor: pillarColor }}
                >
                    <span className="font-bold">
                        {formatPostId(post, idea) || '---'}
                    </span>
                </div>

                {/* Title (Very Compact for Drag - Desktop Only) */}
                <span className="hidden md:block text-[11px] font-bold text-white/90 truncate ml-1 flex-1 min-w-0">
                    {post.post_title || idea?.master_title || 'Untitled'}
                </span>
            </div>
        );
    }

    // --- STANDARD FULL CARD ---
    return (
        <div
            ref={ref}
            style={{
                ...style,
                borderLeft: `3px solid ${pillarColor}`
            }}
            className={cn(
                "p-3 bg-[#0f1115] border border-border/40 rounded-xl transition-all group cursor-grab active:cursor-grabbing relative mb-3",
                isDragging && "opacity-30", // Ghost effect in list
                // Overlay styles are handled by 'compact' mode now
                className
            )}
            {...props}
        >
            {/* Line 1: Icon + ID Badge + Quick Schedule + Action */}
            <div className="flex items-center justify-between mb-3 text-white gap-2">
                <div className="flex items-center gap-2">
                    <div className="p-1 rounded-full bg-background/80 border border-border/50 shrink-0">
                        <PlatformIcon size={12} style={{ color: platform?.color }} />
                    </div>
                    {/* ID Pill (Always Show) */}
                    <div
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded border-2 bg-background/40 text-white flex items-center shadow-sm shrink-0 whitespace-nowrap cursor-help"
                        style={{ borderColor: pillarColor }}
                        title={`Post ID: ${formatPostId(post, idea) || 'Pending'}`}
                    >
                        <span className="font-bold">
                            {formatPostId(post, idea) || '---'}
                        </span>
                    </div>

                    {/* Quick Schedule Button (Backlog Only) */}
                    {!isOverlay && dockViewMode !== 'resurface' && onQuickSchedule && (
                        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 text-gray-400 hover:text-green-400 hover:bg-green-400/10 shrink-0"
                                    title="Quick Schedule / Drag Handle"
                                    onClick={(e) => e.stopPropagation()}
                                    onPointerDown={(e) => e.stopPropagation()}
                                >
                                    <CalendarPlus className="w-3.5 h-3.5" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-[#0f1115] border border-border" align="start">
                                <Calendar
                                    mode="single"
                                    selected={post.publish_date ? new Date(post.publish_date.seconds * 1000) : undefined}
                                    onSelect={(date) => {
                                        if (date) {
                                            onQuickSchedule(post, date);
                                            setIsCalendarOpen(false);
                                        }
                                    }}
                                    disabled={(date) => date < new Date().setHours(0, 0, 0, 0)}
                                    initialFocus
                                    className="rounded-md border-none"
                                />
                            </PopoverContent>
                        </Popover>
                    )}

                    {/* Resurface Actions (Evergreen Only) */}
                    {!isOverlay && dockViewMode === 'resurface' && (
                        <div className="flex items-center gap-1 ml-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-emerald-400 hover:bg-emerald-400/10 shrink-0"
                                title="Clone to Calendar"
                                onClick={(e) => { e.stopPropagation(); onClone && onClone(); }}
                                onPointerDown={(e) => e.stopPropagation()}
                            >
                                <CalendarPlus className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-amber-400 hover:bg-amber-400/10 shrink-0"
                                title="Snooze"
                                onClick={(e) => { e.stopPropagation(); onSnooze && onSnooze(); }}
                            >
                                <BellOff className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 shrink-0"
                                title="Dismiss Suggestion"
                                onClick={(e) => { e.stopPropagation(); onDismiss && onDismiss(); }}
                            >
                                <XCircle className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    )}
                </div>
                {!isOverlay && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity relative z-10 pointer-events-auto">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            asChild
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Link
                                to={`/studio?focus=${post.id}&returnUrl=/horizon`}
                                onClick={onSaveScroll}
                            >
                                <ExternalLink className="w-3 h-3 text-gray-500 hover:text-blue-400" />
                            </Link>
                        </Button>
                    </div>
                )}
            </div>

            {/* Line 2: Status */}
            <div className="flex items-center gap-1.5 mb-2 px-2 py-1 bg-background/30 rounded border border-border/10 w-fit">
                <div className={cn("w-1.5 h-1.5 rounded-full",
                    displayStatus === 'published' ? 'bg-emerald-500' : displayStatus === 'scheduled' ? 'bg-amber-500' : displayStatus === 'overdue' ? 'bg-red-500' : 'bg-slate-500'
                )} />
                <span className={cn("text-[9px] font-bold uppercase tracking-widest", statusTextColors[displayStatus])}>
                    {displayStatus}
                </span>
            </div>

            {/* Line 3: Title */}
            <h4 className="text-[13px] font-bold leading-tight mb-1 text-white/90 line-clamp-1">
                {post.post_title || idea?.master_title || '(Untitled Post)'}
            </h4>
            {(post.content || idea?.concept) && (
                <p className="text-[10px] text-gray-500 line-clamp-2 leading-relaxed">
                    {post.content || idea?.concept}
                </p>
            )}
        </div>
    );
});

// 2. Draggable Wrapper
const DraggablePostCard = ({ post, idea, settings, onSaveScroll, onQuickSchedule, dockViewMode, onClone, onSnooze, onDismiss }) => {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `post-${post.id}`,
        data: { type: 'post', post },
        disabled: false // Always allow drag (even for Resurface/Evergreen)
    });

    return (
        <PostCard
            ref={setNodeRef}
            post={post}
            idea={idea}
            settings={settings}
            onSaveScroll={onSaveScroll}
            onQuickSchedule={onQuickSchedule}
            isDragging={isDragging}
            dockViewMode={dockViewMode}
            onClone={onClone}
            onSnooze={onSnooze}
            onDismiss={onDismiss}
            {...listeners}
            {...attributes}
        />
    );
};

const DroppableCalendarDay = ({ day, isSelected, isToday, posts, settings, ideas, onClick, onReturnToBacklog, onSaveScroll }) => {
    const pillars = settings?.content_pillars || settings?.pillars || [];

    const { setNodeRef, isOver } = useDroppable({
        id: `day-${day.toISOString()}`,
        data: { type: 'day', day }
    });

    return (
        <div
            ref={setNodeRef}
            onClick={() => onClick(day)}
            className={cn(
                "bg-[#0D0D0D] min-h-[88px] p-2 transition-all cursor-pointer hover:bg-white/[0.02] border-r border-b border-white/5",
                isSelected && "ring-2 ring-inset ring-blue-500/50 bg-blue-500/5 z-10",
                isOver && "bg-blue-500/20 ring-2 ring-inset ring-blue-400"
            )}
        >
            <span className={cn(
                "text-sm font-medium",
                isToday ? "text-blue-500" : "text-gray-500 underline decoration-white/10 underline-offset-4"
            )}>
                {format(day, 'd')}
            </span>
            <div className="mt-2 flex flex-wrap gap-1">
                {posts.map(post => {
                    const platform = PLATFORM_CONFIG[post.platform];
                    const PlatformIcon = platform?.icon || CalendarIcon;
                    const pillarData = pillars.find(p => p && (p.name === post.definitive_pillar || p.id === post.definitive_pillar));
                    const pillarColor = pillarData?.color || '#cbd5e1';
                    const idea = ideas.find(i => i.id === post.idea_id);

                    return (
                        <DropdownMenu key={post.id} modal={false}>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <div
                                    className="p-0.5 rounded-full border border-white/10 cursor-pointer hover:scale-110 transition-transform bg-[#0a0a0a] relative"
                                    style={{ borderColor: pillarColor }}
                                    title={`${platform?.label}: ${post.status}`}
                                >
                                    <PlatformIcon size={12} style={{ color: platform?.color }} />
                                    {post.action_notes && (
                                        <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 border border-[#0a0a0a]" />
                                    )}
                                </div>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56 bg-[#0f1115] border-border text-white p-0 overflow-hidden rounded-xl shadow-2xl">
                                <div className="p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        {(() => {
                                            let pDate = post.publish_date?.seconds ? new Date(post.publish_date.seconds * 1000) : new Date(post.publish_date);
                                            if (post.publish_time && pDate) {
                                                const [h, m] = post.publish_time.split(':');
                                                pDate = new Date(pDate);
                                                pDate.setHours(parseInt(h), parseInt(m), 0, 0);
                                            }
                                            const isOverdue = post.status === 'scheduled' && post.publish_date && pDate < new Date();
                                            const displayStatus = isOverdue ? 'overdue' : post.status;

                                            return (
                                                <>
                                                    <div className="p-1.5 rounded-full bg-background/80 border border-border/50">
                                                        <PlatformIcon size={12} style={{ color: platform?.color }} />
                                                    </div>
                                                    <Badge className={cn("px-2.5 py-0.5 rounded-lg text-[10px] font-bold border-none",
                                                        displayStatus === 'published' ? 'bg-emerald-500 text-white' : displayStatus === 'overdue' ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'
                                                    )}>
                                                        {displayStatus.toUpperCase()}{post.archived && <span className="text-white/70 ml-1">[A]</span>}
                                                    </Badge>
                                                </>
                                            );
                                        })()}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold line-clamp-2 leading-tight">{post.post_title || idea?.master_title || '(Untitled Post)'}</h4>
                                        <p className="text-[10px] font-mono text-gray-400 mt-1 uppercase tracking-tight">{formatPostId(post, idea)}</p>
                                    </div>
                                </div>
                                <div className="p-1 bg-white/[0.02] border-t border-border/40">
                                    <DropdownMenuItem asChild className="cursor-pointer gap-3 px-3 py-2 rounded-lg focus:bg-white/5 group">
                                        <Link
                                            to={`/studio?focus=${post.id}&returnUrl=/horizon`}
                                            onClick={onSaveScroll}
                                        >
                                            <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-white" />
                                            <span className="text-[13px]">View in Studio</span>
                                        </Link>
                                    </DropdownMenuItem>
                                    {post.status !== 'archived' && (
                                        <DropdownMenuItem
                                            onClick={() => onReturnToBacklog(post)}
                                            className="cursor-pointer gap-3 px-3 py-2 rounded-lg text-blue-400 focus:bg-blue-400/10 focus:text-blue-300 group"
                                        >
                                            <Undo2 className="w-4 h-4" />
                                            <span className="text-[13px]">Return to Backlog</span>
                                        </DropdownMenuItem>
                                    )}
                                </div>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    );
                })}
            </div>
        </div >
    );
};

// --- MAIN PAGE ---

export default function Horizon() {
    const { posts, loading: postsLoading, updatePost, deletePost, addPost } = usePosts();
    const { ideas, loading: ideasLoading } = useIdeas();
    const { settings, loading: settingsLoading } = useSettings();

    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()));
    const [loadingDockSearch, setLoadingDockSearch] = useState('');
    const [loadingDockSort, setLoadingDockSort] = useState('newest');
    const [loadingDockPlatform, setLoadingDockPlatform] = useState('all');
    const [loadingDockPillar, setLoadingDockPillar] = useState('all');
    const [showArchived, setShowArchived] = useState(false);
    const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
    const [confirmDeletePost, setConfirmDeletePost] = useState(null);
    const [dockViewMode, setDockViewMode] = useState('backlog'); // 'backlog' | 'resurface'
    const [activePost, setActivePost] = useState(null); // For DragOverlay
    const [snoozeTarget, setSnoozeTarget] = useState(null); // { post, defaultDays }
    const [snoozeDays, setSnoozeDays] = useState(90);
    const mainContainerRef = React.useRef(null);
    const navigate = useNavigate();

    // RESTORE SCROLL POSITION on Mount
    useEffect(() => {
        const savedScroll = sessionStorage.getItem('horizon_scroll_pos');
        if (savedScroll && mainContainerRef.current) {
            // Small timeout to ensure content layout is stable
            setTimeout(() => {
                if (mainContainerRef.current) {
                    mainContainerRef.current.scrollTop = parseInt(savedScroll, 10);
                }
            }, 50);
            sessionStorage.removeItem('horizon_scroll_pos');
        }
    }, []);

    const handleSaveScroll = () => {
        if (mainContainerRef.current) {
            sessionStorage.setItem('horizon_scroll_pos', mainContainerRef.current.scrollTop.toString());
        }
    };

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        })
    );

    const statusTextColors = {
        draft: 'text-slate-400',
        scheduled: 'text-amber-500',
        published: 'text-emerald-500',
        overdue: 'text-red-500',
    };

    // Unified Dock Logic (Returns Counts + List)
    const getDockStats = () => {
        // Base Pools
        const backlogBase = posts.filter(post => {
            if (post.status !== 'draft' || post.publish_date) return false;
            if (post.idea_id) {
                const idea = ideas.find(i => i.id === post.idea_id);
                return idea && idea.status === 'ready';
            }
            return true;
        });

        const resurfaceBase = posts.filter(post => {
            if (!post.is_evergreen) return false;
            // Must be ready (Date <= Today)
            if (!post.repurpose_date) return false;
            const rDate = post.repurpose_date.seconds ? new Date(post.repurpose_date.seconds * 1000) : new Date(post.repurpose_date);
            if (rDate > new Date()) return false;
            // Exclude drafts (Backlog owns them)
            if (post.status === 'draft') return false;
            return true;
        });

        // Apply Common Filters (Platform / Pillar / Search) to BOTH separately to get accurate counts
        const applyFilters = (list) => {
            let filtered = list;

            // Platform
            if (loadingDockPlatform !== 'all') {
                filtered = filtered.filter(post => post.platform === loadingDockPlatform);
            }
            // Pillar
            if (loadingDockPillar !== 'all') {
                filtered = filtered.filter(post => post.definitive_pillar === loadingDockPillar);
            }
            // Search
            if (loadingDockSearch.trim()) {
                const query = loadingDockSearch.toLowerCase().trim();
                filtered = filtered.filter(post => {
                    const idea = ideas.find(i => i.id === post.idea_id);
                    const title = post.post_title?.toLowerCase() || idea?.master_title?.toLowerCase() || '';
                    const platform = post.platform?.toLowerCase() || '';
                    const postId = formatPostId(post, idea).toLowerCase();
                    return title.includes(query) || platform.includes(query) || postId.includes(query);
                });
            }
            return filtered;
        };

        const finalBacklog = applyFilters(backlogBase);
        const finalResurface = applyFilters(resurfaceBase);

        return {
            counts: { backlog: finalBacklog.length, resurface: finalResurface.length },
            currentList: dockViewMode === 'backlog' ? finalBacklog : finalResurface
        };
    };

    // Unified Dock Logic
    const getDockPosts = () => {
        let filtered = posts.filter(post => {
            // MODE 1: BACKLOG (Drafts)
            if (dockViewMode === 'backlog') {
                if (post.status !== 'draft' || post.publish_date) return false;

                // Inclusion Logic: Idea-Linked (Ready) OR Direct Entry
                if (post.idea_id) {
                    const idea = ideas.find(i => i.id === post.idea_id);
                    return idea && idea.status === 'ready';
                }
                return true;
            }

            // MODE 2: RESURFACE (Evergreen)
            if (dockViewMode === 'resurface') {
                if (!post.is_evergreen) return false;

                // Must be ready (Date <= Today)
                if (!post.repurpose_date) return false;
                const rDate = post.repurpose_date.seconds ? new Date(post.repurpose_date.seconds * 1000) : new Date(post.repurpose_date);
                if (rDate > new Date()) return false;

                // Should not be Draft? (If it's a draft, it's in backlog logic, but Evergreen is property)
                // Usally Evergreen are 'Published' posts.
                // If a post is 'Draft' AND 'Evergreen', and 'Repurpose Date' is passed... 
                // It stays in Drafts probably until published?
                // Let's exclude drafts from Resurface to avoid confusion. Backlog owns drafts.
                if (post.status === 'draft') return false;

                return true;
            }
            return false;
        });

        // Common Filters (Platform / Pillar)
        filtered = filtered.filter(post => {
            if (loadingDockPlatform !== 'all' && post.platform !== loadingDockPlatform) return false;
            // Pillar Filter
            if (loadingDockPillar !== 'all' && post.definitive_pillar !== loadingDockPillar) return false;
            return true;
        });

        if (loadingDockSearch.trim()) {
            const query = loadingDockSearch.toLowerCase().trim();
            filtered = filtered.filter(post => {
                const idea = ideas.find(i => i.id === post.idea_id);
                const title = post.post_title?.toLowerCase() || idea?.master_title?.toLowerCase() || '';
                const platform = post.platform?.toLowerCase() || '';
                const postId = formatPostId(post, idea).toLowerCase();

                return title.includes(query) ||
                    platform.includes(query) ||
                    postId.includes(query);
            });
        }

        return filtered.sort((a, b) => {
            if (dockViewMode === 'resurface') {
                // Resurface prioritizing oldest repurpose date? Or newest?
                // Oldest repurpose date = most overdue.
                const dateA = a.repurpose_date?.seconds ? new Date(a.repurpose_date.seconds * 1000) : new Date(a.repurpose_date);
                const dateB = b.repurpose_date?.seconds ? new Date(b.repurpose_date.seconds * 1000) : new Date(b.repurpose_date);
                return dateA - dateB;
            }
            if (loadingDockSort === 'newest') return new Date(b.created_at) - new Date(a.created_at);
            if (loadingDockSort === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
            if (loadingDockSort === 'platform') return a.platform.localeCompare(b.platform);
            return 0;
        });
    };

    const getPostsForDate = (date) => {
        return posts.filter(post => {
            if (!post.publish_date) return false;
            const pDate = post.publish_date?.seconds ? new Date(post.publish_date.seconds * 1000) : new Date(post.publish_date);
            if (!isSameDay(pDate, date)) return false;
            const isArchived = post.archived || post.status === 'archived';
            if (!showArchived && isArchived) return false;
            return true;
        });
    };

    const handleDragStart = (event) => {
        const { active } = event;
        if (active.data.current?.type === 'post') {
            setActivePost(active.data.current.post);
        }
    };

    // --- REFACTORED SCHEDULING LOGIC (Using in DnD and Quick Schedule) ---
    const handlePostSchedule = async (post, targetDate) => {
        const today = startOfDay(new Date());

        // Constraint: Prevent scheduling in the past
        if (targetDate < today) {
            toast.error("Cannot Schedule in Past", {
                description: "Please select a date from today onwards."
            });
            return;
        }

        // Default to the post's existing time or a standard 09:00 AM instead of midnight
        const scheduleDate = new Date(targetDate);
        const existingTime = post.publish_time || '09:00';
        const [hours, minutes] = existingTime.split(':');
        scheduleDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

        try {
            const wasPublished = post.status === 'published';

            const nextCycleSize = parseInt(settings?.repurpose_cycle) || 365;
            const defaultRepurposeDate = addDays(scheduleDate, nextCycleSize);

            await updatePost(post.id, {
                publish_date: scheduleDate,
                publish_time: existingTime,    // Preserve or default to 09:00
                status: 'scheduled',
                is_evergreen: post.is_evergreen ?? false,
                repurpose_date: post.is_evergreen ? (post.repurpose_date || defaultRepurposeDate) : post.repurpose_date,
                // Auto-unset if pulling back from a previously published slot
                is_locked: wasPublished ? false : (post.is_locked || false)
            });
            toast.success("Post Scheduled", {
                description: `Moved to ${format(scheduleDate, 'MMM d, yyyy')}`
            });
        } catch (err) {
            toast.error("Schedule Failed", { description: err.message });
        }
    };

    // --- SNOOZE LOGIC ---
    const handleSnoozeClick = (post) => {
        const defaultDays = parseInt(settings?.repurpose_snooze_days) || 90;
        setSnoozeDays(defaultDays);
        setSnoozeTarget(post);
    };

    const confirmSnooze = async () => {
        if (!snoozeTarget) return;

        const days = parseInt(snoozeDays) || 90;

        if (days < 1) {
            toast.error("Invalid Duration", { description: "Snooze duration must be at least 1 day." });
            return;
        }

        try {
            const nextDate = addDays(new Date(), days);
            await updatePost(snoozeTarget.id, { repurpose_date: nextDate });
            toast.success("Post Snoozed", { description: `Resurfacing on ${format(nextDate, 'MMM d, yyyy')}` });
            setSnoozeTarget(null);
        } catch (err) {
            console.error("Snooze Failed:", err);
            toast.error("Snooze Failed");
        }
    };


    // --- EVERGREEN DRAG-AND-DROP LOGIC ---
    const handleEvergreenDrop = async (post, targetDate) => {
        const today = startOfDay(new Date());
        if (targetDate < today) {
            toast.error("Cannot Schedule in Past", { description: "Please select a date from today onwards." });
            return;
        }

        const newTitle = `${post.post_title} (Repurposed)`;
        // Default to a standard 09:00 AM for repurposed posts
        const scheduleDate = new Date(targetDate);
        const defaultTime = '09:00';
        const [hours, minutes] = defaultTime.split(':');
        scheduleDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

        try {
            // Calculate Next Sequence for Idea-Linked Post
            let nextSequence = 1;
            if (post.idea_id) {
                const existingPosts = posts.filter(p => p.idea_id === post.idea_id);
                const maxSeq = existingPosts.reduce((max, p) => (p.sequence > max ? p.sequence : max), 0);
                nextSequence = maxSeq + 1;
            }

            // 1. CREATE NEW DRAFT (Cloned)
            const cleanPostData = {
                post_title: newTitle,
                status: 'scheduled', // Directly schedule it
                publish_date: scheduleDate,
                publish_time: defaultTime,
                is_locked: false,
                is_evergreen: true, // Keep in cycle by default
                repurpose_date: addDays(scheduleDate, parseInt(settings?.repurpose_cycle) || 365),
                direct_entry_sequence: null,
                sequence: post.idea_id ? nextSequence : null, // Assign new sequence
                is_direct_entry: !!post.is_direct_entry,
                platform: post.platform || 'linkedin',
                content: post.content || '',
                definitive_pillar: post.definitive_pillar || '',
                post_type: post.post_type || '',
                idea_id: post.idea_id || null,
                media: post.media ? { ...post.media } : null
            };

            // Explicitly ensure Direct Entry sequence is cleared to trigger new generation
            if (cleanPostData.is_direct_entry) {
                cleanPostData.direct_entry_sequence = null;
            }

            const newId = await addPost(cleanPostData);

            // 2. ADVANCE SOURCE CYCLE
            const nextCycle = parseInt(settings?.repurpose_cycle) || 365;
            const nextDate = addDays(new Date(), nextCycle);
            await updatePost(post.id, { repurpose_date: nextDate });

            toast.success("Evergreen Scheduled", { description: `Cloned & scheduled for ${format(scheduleDate, 'MMM d')}` });

            // User Visibility: Navigate to Studio so they can see/address the auto-generated cycle
            navigate(`/studio?focus=${newId}&tab=schedule&returnUrl=/horizon`);

            // Optional: Remove ghost if needed (managed by React state usually)
        } catch (err) {
            console.error("Evergreen Drop Failed:", err);
            toast.error(`Schedule Failed: ${err.message}`);
        }
    };

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        setActivePost(null); // Clear overlay
        if (!over) return;

        const overId = over.id.toString();
        if (overId.startsWith('day-')) {
            const targetDate = new Date(overId.replace('day-', ''));
            const post = active.data.current?.post || {};

            // Fork Logic based on Mode
            if (dockViewMode === 'resurface' && post.is_evergreen) {
                await handleEvergreenDrop(post, targetDate);
            } else {
                await handlePostSchedule(post, targetDate);
            }
        }
    };

    const handleReturnToBacklog = async (post) => {
        try {
            await updatePost(post.id, {
                publish_date: null,
                status: 'draft',
                is_locked: false // Always reset approval when returning to draft
            });
            toast.success("Returned to Backlog");
        } catch (err) {
            toast.error("Action Failed");
        }
    };

    const handleDeletePost = (post) => {
        setConfirmDeletePost(post);
    };

    const performDelete = async (post) => {
        if (!post) return;
        const pid = formatPostId(post, ideas.find(i => i.id === post.idea_id));
        try {
            await deletePost(post.id);
            toast.success(`Post ${pid} deleted`, {
                description: "The post has been permanently removed from the vault."
            });
            setConfirmDeletePost(null);
        } catch (err) {
            console.error("Failed to delete post:", err);
            toast.error("Delete Failed", { description: err.message || "An unexpected error occurred." });
        }
    };

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    if (postsLoading || ideasLoading || settingsLoading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
            </div>
        );
    }

    const { counts: postCounts, currentList: rawDockPosts } = getDockStats();

    const dockPosts = rawDockPosts.sort((a, b) => {
        if (dockViewMode === 'resurface') {
            const dateA = a.repurpose_date?.seconds ? new Date(a.repurpose_date.seconds * 1000) : new Date(a.repurpose_date);
            const dateB = b.repurpose_date?.seconds ? new Date(b.repurpose_date.seconds * 1000) : new Date(b.repurpose_date);
            return dateA - dateB;
        }
        if (loadingDockSort === 'newest') return new Date(b.created_at) - new Date(a.created_at);
        if (loadingDockSort === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
        if (loadingDockSort === 'platform') return a.platform.localeCompare(b.platform);
        return 0;
    });
    const selectedDatePosts = getPostsForDate(selectedDate).sort((a, b) => {
        const dateA = a.publish_date?.seconds ? new Date(a.publish_date.seconds * 1000) : new Date(a.publish_date);
        const dateB = b.publish_date?.seconds ? new Date(b.publish_date.seconds * 1000) : new Date(b.publish_date);
        return dateA - dateB;
    });

    return (
        <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div
                ref={mainContainerRef}
                className="flex flex-col h-full lg:h-screen bg-[#050505] text-white p-4 lg:p-6 overflow-y-auto lg:overflow-hidden"
            >
                {/* Header */}
                <div className="flex flex-col lg:flex-row items-center justify-between mb-6 lg:mb-6 gap-4 relative shrink-0">
                    <div className="flex items-center justify-between w-full lg:w-auto gap-3">
                        <div>
                            <h1 className="text-xl md:text-3xl font-bold tracking-tight mb-1 flex items-center gap-2">
                                <CalendarIcon className="text-primary w-6 h-6 md:w-8 md:h-8" />
                                Content Horizon
                            </h1>
                            <p className="text-muted-foreground hidden md:block">Plan and visualize your content calendar.</p>
                        </div>
                        {/* Mobile: Archive Button shortcut or menu could go here if needed, but keeping simple for now */}
                    </div>

                    {/* Month Navigation - Centered on Desktop, Stacked on Mobile */}
                    <div className="w-full lg:w-auto lg:absolute lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 flex items-center justify-between lg:justify-center gap-4 bg-white/5 lg:bg-transparent p-2 lg:p-0 rounded-xl">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                            className="text-gray-400 hover:text-white hover:bg-white/10"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </Button>
                        <h2 className="text-lg lg:text-xl font-bold tracking-tight min-w-[140px] text-center">
                            {format(currentMonth, 'MMMM yyyy')}
                        </h2>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                            className="text-gray-400 hover:text-white hover:bg-white/10"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </Button>
                    </div>

                    <div className="flex items-center justify-between w-full lg:w-auto gap-3 lg:gap-4">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10 text-sm flex-1 lg:flex-none justify-center">
                            <span className="text-gray-400 text-xs lg:text-sm">Show Archived</span>
                            <input
                                type="checkbox"
                                checked={showArchived}
                                onChange={(e) => setShowArchived(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                        </div>
                        <Button
                            variant="outline"
                            className="glass-panel border-white/10 hover:bg-white/5 flex-1 lg:flex-none"
                            onClick={() => setIsArchiveModalOpen(true)}
                        >
                            <Archive className="w-4 h-4 mr-2" />
                            <span className="text-xs lg:text-sm">Archive & Reset</span>
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
                    {/* Column 1: Loading Dock */}
                    <div className="lg:col-span-3 flex flex-col h-auto lg:min-h-0">
                        <Card className="glass-panel border-white/10 bg-[#0A0A0A] flex flex-col h-auto lg:flex-1 lg:overflow-hidden">
                            <CardHeader className="p-3 md:pb-4 space-y-3">
                                {/* Row 1: Segmented Control (Full Width / Left Aligned) */}
                                <div className="flex items-center justify-between">
                                    <div className="flex bg-[#1a1d24] rounded-lg p-0.5 border border-white/10">
                                        <button
                                            onClick={() => setDockViewMode('backlog')}
                                            className={cn(
                                                "px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2",
                                                dockViewMode === 'backlog'
                                                    ? "bg-blue-500/20 text-blue-400 shadow-sm"
                                                    : "text-gray-500 hover:text-gray-300"
                                            )}
                                        >
                                            <Inbox className="w-3.5 h-3.5" />
                                            <span className="inline">Backlog</span>
                                            <span className={cn(
                                                "ml-1 text-[10px] px-1.5 py-0.5 rounded-full",
                                                dockViewMode === 'backlog' ? "bg-blue-500/20 text-blue-300" : "bg-white/5 text-gray-500"
                                            )}>
                                                {postCounts.backlog}
                                            </span>
                                        </button>
                                        <button
                                            onClick={() => setDockViewMode('resurface')}
                                            className={cn(
                                                "px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2",
                                                dockViewMode === 'resurface'
                                                    ? "bg-emerald-500/20 text-emerald-400 shadow-sm"
                                                    : "text-gray-500 hover:text-gray-300"
                                            )}
                                        >
                                            <Repeat className="w-3.5 h-3.5" />
                                            <span className="inline">Resurface</span>
                                            <span className={cn(
                                                "ml-1 text-[10px] px-1.5 py-0.5 rounded-full",
                                                dockViewMode === 'resurface' ? "bg-emerald-500/20 text-emerald-300" : "bg-white/5 text-gray-500"
                                            )}>
                                                {postCounts.resurface}
                                            </span>
                                        </button>
                                    </div>
                                </div>

                                {/* Row 2: Search (Full Width) */}
                                <div className="relative w-full">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                                    <Input
                                        placeholder="Search..."
                                        className="pl-9 h-9 bg-black/40 border-white/10 text-white placeholder:text-gray-600 focus:border-blue-500/50 text-xs md:text-sm w-full"
                                        value={loadingDockSearch}
                                        onChange={(e) => setLoadingDockSearch(e.target.value)}
                                    />
                                </div>

                                {/* Controls Row: Filters + Sort */}
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        {/* Platform Filter */}
                                        <div className="flex-1 md:flex-none md:w-[140px] lg:w-auto">
                                            <Select value={loadingDockPlatform} onValueChange={setLoadingDockPlatform}>
                                                <SelectTrigger
                                                    className="w-full h-9 px-2 md:px-3 text-xs bg-black/40 border-white/10 text-gray-200"
                                                    title="Filter by Platform"
                                                >
                                                    <div className="flex items-center gap-2 truncate">
                                                        <LayoutGrid className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                                                        <span className="hidden md:inline lg:hidden truncate"><SelectValue placeholder="All Platforms" /></span>
                                                    </div>
                                                </SelectTrigger>
                                                <SelectContent className="bg-[#0f1115] border-white/10 text-gray-200">
                                                    <SelectItem value="all">All Platforms</SelectItem>
                                                    {SORTED_PLATFORMS.filter(p => settings?.lane_visibility?.[p.id] === true).map(p => (
                                                        <SelectItem key={p.id} value={p.id}>
                                                            <div className="flex items-center gap-2">
                                                                {p.icon && <p.icon className="w-3.5 h-3.5" style={{ color: p.color }} />}
                                                                <span>{p.label}</span>
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Pillar Filter */}
                                        <div className="flex-1 md:flex-none md:w-[140px] lg:w-auto">
                                            <Select value={loadingDockPillar} onValueChange={setLoadingDockPillar}>
                                                <SelectTrigger
                                                    className="w-full h-9 px-2 md:px-3 text-xs bg-black/40 border-white/10 text-gray-200"
                                                    title="Filter by Pillar"
                                                >
                                                    <div className="flex items-center gap-2 truncate">
                                                        <Shapes className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                                                        <div className="hidden md:flex lg:hidden items-center gap-2 truncate">
                                                            {loadingDockPillar !== 'all' && (
                                                                <div
                                                                    className="w-2 h-2 rounded-full shrink-0"
                                                                    style={{ backgroundColor: settings?.content_pillars?.find(p => p.id === loadingDockPillar)?.color }}
                                                                />
                                                            )}
                                                            <span className="truncate">
                                                                {loadingDockPillar === 'all'
                                                                    ? 'All Pillars'
                                                                    : settings?.content_pillars?.find(p => p.id === loadingDockPillar)?.name}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </SelectTrigger>
                                                <SelectContent className="bg-[#0f1115] border-white/10 text-gray-200">
                                                    <SelectItem value="all">All Pillars</SelectItem>
                                                    {settings?.content_pillars?.filter(p => p && !p.disabled).map(p => (
                                                        <SelectItem key={p.id} value={p.id}>
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                                                                <span className="truncate">{p.name}</span>
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    {/* Sort */}
                                    <div className="shrink-0">
                                        <Select value={loadingDockSort} onValueChange={setLoadingDockSort}>
                                            <SelectTrigger
                                                className="w-9 md:w-[130px] lg:w-9 h-9 px-0 md:px-3 lg:px-0 text-[11px] bg-transparent md:bg-black/40 lg:bg-transparent border md:border-white/10 lg:border-transparent border-transparent text-gray-400 focus:ring-0 hover:text-gray-300 justify-center md:justify-between lg:justify-center"
                                                title="Sort Order"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <ArrowUpDown className="w-3.5 h-3.5 shrink-0" />
                                                    <span className="hidden md:inline lg:hidden"><SelectValue /></span>
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent className="bg-[#0f1115] border-white/10 text-gray-200">
                                                <SelectItem value="newest">Newest First</SelectItem>
                                                <SelectItem value="oldest">Oldest First</SelectItem>
                                                <SelectItem value="platform">By Platform</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3 p-4 lg:flex-1 lg:overflow-y-auto">
                                {dockPosts.length === 0 ? (
                                    <div className="text-center py-8">
                                        <p className="text-sm text-gray-600">
                                            {dockViewMode === 'backlog' ? "No unscheduled posts" : "No content ready for repurposing"}
                                        </p>
                                    </div>
                                ) : (
                                    dockPosts.map(post => (
                                        <DraggablePostCard
                                            key={post.id}
                                            post={post}
                                            idea={ideas.find(i => i.id === post.idea_id)}
                                            settings={settings}
                                            onSaveScroll={handleSaveScroll}
                                            onQuickSchedule={handlePostSchedule}
                                            dockViewMode={dockViewMode}
                                            onClone={async () => {
                                                const newTitle = `${post.post_title} (Repurposed)`;
                                                try {
                                                    // Calculate Next Sequence for Idea-Linked Post (Same as Drag)
                                                    let nextSequence = 1;
                                                    if (post.idea_id) {
                                                        const existingPosts = posts.filter(p => p.idea_id === post.idea_id);
                                                        const maxSeq = existingPosts.reduce((max, p) => (p.sequence > max ? p.sequence : max), 0);
                                                        nextSequence = maxSeq + 1;
                                                    }

                                                    // Combine new date with a default 09:00 AM time
                                                    const scheduleDate = new Date();
                                                    const defaultTime = '09:00';
                                                    const [hours, minutes] = defaultTime.split(':');
                                                    scheduleDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

                                                    // CLEAN OBJECT for Firestore
                                                    const cleanPostData = {
                                                        post_title: newTitle,
                                                        status: 'scheduled',
                                                        publish_date: scheduleDate,
                                                        publish_time: defaultTime,
                                                        is_locked: false,
                                                        is_evergreen: true, // Keep in cycle by default
                                                        repurpose_date: addDays(scheduleDate, parseInt(settings?.repurpose_cycle) || 365), // Default to next cycle from the new schedule date
                                                        direct_entry_sequence: null,
                                                        sequence: post.idea_id ? nextSequence : null, // Assign new sequence
                                                        is_direct_entry: !!post.is_direct_entry,

                                                        // Explicitly map other fields
                                                        platform: post.platform || 'linkedin',
                                                        content: post.content || '',
                                                        definitive_pillar: post.definitive_pillar || '',
                                                        post_type: post.post_type || '',
                                                        idea_id: post.idea_id || null,

                                                        // Media Safe Copy
                                                        media: post.media ? { ...post.media } : null
                                                    };

                                                    const newId = await addPost(cleanPostData);

                                                    // Advance Source Cycle
                                                    const nextCycle = parseInt(settings?.repurpose_cycle) || 365;
                                                    const nextDate = addDays(new Date(), nextCycle);
                                                    await updatePost(post.id, { repurpose_date: nextDate });

                                                    toast.success("Cloned Successfully", { description: "Scheduled draft ready for review." });
                                                    navigate(`/studio?focus=${newId}&tab=schedule&returnUrl=/horizon`);
                                                } catch (e) {
                                                    console.error("Clone Error:", e);
                                                    toast.error(`Clone Failed: ${e.message}`);
                                                }
                                            }}
                                            onSnooze={() => handleSnoozeClick(post)}
                                            onDismiss={async () => {
                                                await updatePost(post.id, { is_evergreen: false, repurpose_date: null });
                                                toast.success("Removed from Evergreen cycle");
                                            }}
                                        />
                                    ))
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Column 2: Calendar Grid */}
                    <div className="lg:col-span-6 flex flex-col min-h-[600px] lg:min-h-0">
                        <Card className="glass-panel border-white/10 bg-[#0A0A0A] flex flex-col lg:flex-1 lg:overflow-hidden">
                            <div className="flex-1 overflow-y-auto p-4">
                                <div className="grid grid-cols-7 gap-px bg-white/5 border border-white/5 rounded-xl overflow-hidden ring-1 ring-white/10">
                                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                        <div key={day} className="bg-[#0D0D0D] p-2 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-white/5">
                                            {day}
                                        </div>
                                    ))}
                                    {Array(monthStart.getDay()).fill(null).map((_, i) => (
                                        <div key={`empty-${i}`} className="bg-[#0D0D0D] min-h-[88px] opacity-20 border-r border-b border-white/5" />
                                    ))}
                                    {daysInMonth.map(day => (
                                        <DroppableCalendarDay
                                            key={day.toISOString()}
                                            day={day}
                                            isSelected={isSameDay(day, selectedDate)}
                                            isToday={isSameDay(day, new Date())}
                                            posts={getPostsForDate(day)}
                                            settings={settings}
                                            ideas={ideas}
                                            onClick={setSelectedDate}
                                            onReturnToBacklog={handleReturnToBacklog}
                                            onSaveScroll={handleSaveScroll}
                                        />
                                    ))}
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Column 3: Day Detail */}
                    <div className="lg:col-span-3 flex flex-col h-auto lg:min-h-0">
                        <Card className="glass-panel border-white/10 bg-[#0A0A0A] flex flex-col h-auto lg:flex-1 lg:overflow-hidden">
                            <CardHeader className="pt-4 pb-4 border-b border-white/5">
                                <CardTitle className="text-lg font-semibold flex flex-col gap-1">
                                    <span className="text-gray-500 text-sm font-normal">{format(selectedDate, 'EEEE')}</span>
                                    {format(selectedDate, 'MMMM d, yyyy')}
                                </CardTitle>
                                <p className="text-xs text-blue-400 mt-2 flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5" />
                                    {selectedDatePosts.length} posts scheduled
                                </p>
                            </CardHeader>
                            <CardContent className="p-4 space-y-4 lg:flex-1 lg:overflow-y-auto">
                                {selectedDatePosts.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full min-h-[220px] text-center p-6 border-2 border-dashed border-white/5 rounded-2xl bg-white/[0.02]">
                                        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-gray-700 mb-4 shadow-inner">
                                            <CalendarIcon className="w-8 h-8 opacity-50" />
                                        </div>
                                        <h3 className="text-gray-400 font-medium mb-1">No posts scheduled for this date</h3>
                                        <p className="text-xs text-gray-600 mb-6 max-w-[200px] mx-auto">
                                            This day is currently empty. Head to the studio to create new content.
                                        </p>
                                        <Button
                                            variant="outline"
                                            className="bg-white/5 border-white/10 hover:bg-blue-500/10 hover:border-blue-500/50 hover:text-blue-400 transition-all gap-2"
                                            asChild
                                        >
                                            <Link to="/studio">
                                                <ExternalLink className="w-3.5 h-3.5" />
                                                Go to Studio
                                            </Link>
                                        </Button>
                                    </div>
                                ) : (
                                    selectedDatePosts.map(post => {
                                        const idea = ideas.find(i => i.id === post.idea_id);
                                        const pDate = post.publish_date?.seconds ? new Date(post.publish_date.seconds * 1000) : new Date(post.publish_date);
                                        const pillars = settings?.content_pillars || settings?.pillars || [];
                                        const pillarData = pillars.find(p => p && (p.name === post.definitive_pillar || p.id === post.definitive_pillar));
                                        const pillarColor = pillarData?.color || '#cbd5e1';
                                        const platform = PLATFORM_CONFIG[post.platform];
                                        const PlatformIcon = platform?.icon || CalendarIcon;

                                        return (
                                            <div
                                                key={post.id}
                                                style={{ borderLeft: `3px solid ${pillarColor}` }}
                                                className="p-3 bg-[#0f1115] border border-border/40 rounded-xl hover:bg-zinc-900/50 transition-all group relative"
                                            >
                                                <div className="flex items-center justify-between mb-3 text-white">
                                                    <div className="flex items-center gap-2">
                                                        <div className="p-1 rounded-full bg-background/80 border border-border/50">
                                                            <PlatformIcon size={12} style={{ color: platform?.color }} />
                                                        </div>
                                                        <div
                                                            className="text-[10px] font-mono px-2 py-0.5 rounded border-2 bg-background/40 text-white flex items-center shadow-sm"
                                                            style={{ borderColor: pillarColor }}
                                                        >
                                                            <span className="font-bold">
                                                                {formatPostId(post, idea)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 text-gray-500 hover:text-blue-400 hover:bg-blue-400/10"
                                                            asChild
                                                        >
                                                            <Link
                                                                to={`/studio?focus=${post.id}&returnUrl=/horizon`}
                                                                onClick={handleSaveScroll}
                                                            >
                                                                <ExternalLink className="w-3.5 h-3.5" />
                                                            </Link>
                                                        </Button>
                                                        {post.status !== 'archived' && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleReturnToBacklog(post)}
                                                                className="h-6 w-6 text-gray-500 hover:text-blue-400 hover:bg-blue-400/10"
                                                                title="Return to Backlog"
                                                            >
                                                                <Undo2 className="w-3.5 h-3.5" />
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDeletePost(post)}
                                                            className="h-6 w-6 text-gray-500 hover:text-red-400 hover:bg-red-400/10"
                                                            title="Delete Permanently"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </div>
                                                </div>

                                                {/* Line 2: Status */}
                                                <div className="flex items-center justify-between mb-2 px-2 py-1 bg-background/30 rounded border border-border/10">
                                                    <div className="flex items-center gap-1.5">
                                                        {(() => {
                                                            let pDate = post.publish_date?.seconds ? new Date(post.publish_date.seconds * 1000) : new Date(post.publish_date);
                                                            if (post.publish_time && pDate) {
                                                                const [h, m] = post.publish_time.split(':');
                                                                pDate = new Date(pDate);
                                                                pDate.setHours(parseInt(h), parseInt(m), 0, 0);
                                                            }
                                                            const isOverdue = post.status === 'scheduled' && post.publish_date && pDate < new Date();
                                                            const displayStatus = isOverdue ? 'overdue' : post.status;
                                                            return (
                                                                <>
                                                                    <div className={cn("w-1.5 h-1.5 rounded-full",
                                                                        displayStatus === 'published' ? 'bg-emerald-500' : displayStatus === 'scheduled' ? 'bg-amber-500' : displayStatus === 'overdue' ? 'bg-red-500' : 'bg-slate-500'
                                                                    )} />
                                                                    <span className={cn("text-[9px] font-bold uppercase tracking-widest", statusTextColors[displayStatus])}>
                                                                        {displayStatus} {post.archived && <span className="text-muted-foreground ml-1">[A]</span>}
                                                                    </span>
                                                                </>
                                                            );
                                                        })()}
                                                    </div>
                                                    <div className="text-[9px] font-bold text-gray-500 uppercase tracking-tight flex items-center gap-1">
                                                        <Clock size={10} />
                                                        {post.publish_time || '09:00'}
                                                    </div>
                                                </div>

                                                {/* Line 3: Title */}
                                                <h4 className="text-[13px] font-bold mb-1 group-hover:text-blue-400 transition-colors line-clamp-2">
                                                    {post.post_title || idea?.master_title || 'Untitled'}
                                                </h4>
                                                {(post.content || idea?.concept) && (
                                                    <p className="text-[10px] text-gray-500 line-clamp-2 leading-relaxed mb-4">
                                                        {post.content || idea?.concept}
                                                    </p>
                                                )}

                                                {post.action_notes && (
                                                    <div className="mt-3 pt-3 border-t border-white/5">
                                                        <div className="flex items-start gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1" />
                                                            <p className="text-[10px] text-amber-200/70 leading-relaxed italic">
                                                                {post.action_notes}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}


                                            </div>
                                        );
                                    })
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            <ArchiveResetModal
                open={isArchiveModalOpen}
                onClose={() => setIsArchiveModalOpen(false)}
                posts={posts}
                updatePost={updatePost}
            />

            {/* Snooze Confirmation Modal */}
            <AlertDialog open={!!snoozeTarget} onOpenChange={(open) => !open && setSnoozeTarget(null)}>
                <AlertDialogContent className="bg-[#0f1115] border-border text-white shadow-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-amber-500 font-bold flex items-center gap-2">
                            <BellOff className="w-5 h-5" />
                            Snooze Post
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-400">
                            How long should we wait before resurfacing this post?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-2">
                        <label className="text-xs text-gray-500 mb-1.5 block">Snooze Duration (Days)</label>
                        <Input
                            type="number"
                            min="1"
                            value={snoozeDays}
                            onChange={(e) => setSnoozeDays(e.target.value)}
                            className="bg-black/50 border-white/10 text-white"
                        />
                        <p className="text-[10px] text-gray-600 mt-2">
                            Defaults to {settings?.repurpose_snooze_days || 90} days based on settings.
                        </p>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-white/5 border-white/10 hover:bg-white/10 text-white">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmSnooze}
                            className="bg-amber-600 hover:bg-amber-700 text-white border-none"
                        >
                            Confirm Snooze
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Post Delete Confirmation */}
            <AlertDialog open={!!confirmDeletePost} onOpenChange={(open) => !open && setConfirmDeletePost(null)}>
                <AlertDialogContent className="bg-[#0f1115] border-border text-white shadow-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-red-500 font-bold">Permanently Delete Post?</AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-400">
                            This will permanently delete "{confirmDeletePost?.post_title || ideas.find(i => i.id === confirmDeletePost?.idea_id)?.master_title || 'Untitled Post'}" ({formatPostId(confirmDeletePost, ideas.find(i => i.id === confirmDeletePost?.idea_id))}).
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-white/5 border-white/10 hover:bg-white/10 text-white">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => confirmDeletePost && performDelete(confirmDeletePost)}
                            className="bg-red-600 hover:bg-red-700 text-white border-none"
                        >
                            Delete Permanently
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            {/* Drag Overlay for Visibility */}
            <DragOverlay dropAnimation={{
                sideEffects: null,
                duration: 200,
                easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
            }}>
                {activePost ? (
                    <PostCard
                        post={activePost}
                        idea={ideas.find(i => i.id === activePost.idea_id)}
                        settings={settings}
                        isOverlay={true}
                        compact={true}
                    />
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}
