import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Search, ChevronsDownUp, ChevronsUpDown, X, Lightbulb, Archive, Sparkles, Plus, LayoutDashboard } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { usePosts } from '../hooks/usePosts';
import { useIdeas } from '../hooks/useIdeas';
import { Lane } from '../components/studio/Lane';
import { PlatformCard } from '../components/studio/PlatformCard';
import BacklogCard from '../components/studio/BacklogCard';
import PostEditorModal from '../components/studio/PostEditorModal';
import IdeaManifestoModal from '../components/studio/IdeaManifestoModal';
import { SORTED_PLATFORMS } from '../config/platforms';
import { formatPostId } from '../utils/postIdFormatter';
import { DndContext, useDraggable, useDroppable, useSensor, useSensors, PointerSensor, DragOverlay } from '@dnd-kit/core';
import { toast } from "sonner";
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

// Error Boundary for Debugging
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error, errorInfo });
        console.error("Studio Crashed:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-8 bg-red-50 text-red-900 h-full overflow-auto">
                    <h2 className="text-2xl font-bold mb-4">Studio Crashed</h2>
                    <p className="font-semibold">{this.state.error?.toString()}</p>
                    <pre className="mt-4 p-4 bg-red-100 rounded text-sm whitespace-pre-wrap">
                        {this.state.errorInfo?.componentStack}
                    </pre>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                        Reload Page
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

// Draggable Wrapper for Backlog Card
const DraggableBacklogCard = ({ idea, ...props }) => {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `idea-${idea.id}`,
        data: { type: 'idea', idea }
    });

    const style = {
        opacity: isDragging ? 0.3 : 1,
        cursor: isDragging ? 'grabbing' : 'grab',
    };

    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
            <BacklogCard idea={idea} {...props} />
        </div>
    );
};

// Droppable Wrapper for Lane
const DroppableLane = ({ platform, children }) => {
    const { setNodeRef, isOver } = useDroppable({
        id: `lane-${platform.id}`,
        data: { type: 'lane', platform }
    });

    return (
        <div ref={setNodeRef} className={`h-full transition-colors ${isOver ? 'bg-primary/5 ring-2 ring-primary ring-inset rounded-lg' : ''}`}>
            {children}
        </div>
    );
};

export default function Studio() {
    // Hooks
    const { settings, loading: settingsLoading, error: settingsError } = useSettings();
    const { posts, loading: postsLoading, error: postsError, addPost, updatePost, deletePost } = usePosts();
    const { ideas, loading: ideasLoading, updateIdea } = useIdeas();

    // DnD Sensors - Critical for allowing clicks on buttons inside draggable items
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Drag only starts after moving 8px
            },
        })
    );

    // Editor State - Must be before early returns
    const [editorOpen, setEditorOpen] = useState(false);
    const [editingPost, setEditingPost] = useState(null);
    const [spawnIdea, setSpawnIdea] = useState(null);
    const [manifestoIdea, setManifestoIdea] = useState(null); // Idea for Manifesto Modal
    const [targetPlatform, setTargetPlatform] = useState(null);
    const [filterPlatform, setFilterPlatform] = useState('all'); // 'all' or platformId
    // Advanced Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [filterPillar, setFilterPillar] = useState('all');
    const [filterHorizon, setFilterHorizon] = useState('7d_future'); // '7d_future' | '30d' | 'all'
    const [isAllCollapsed, setIsAllCollapsed] = useState(false);
    const [showArchived, setShowArchived] = useState(false);
    const [statusFilter, setStatusFilter] = useState('active'); // 'active' | 'draft' | 'scheduled' | 'published' | 'all'
    const [deleteDetails, setDeleteDetails] = useState(null); // { post: object }
    const [isMobileIdeasOpen, setIsMobileIdeasOpen] = useState(false);
    const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

    // DnD Active State for Overlay
    const [activeId, setActiveId] = useState(null);
    const [activeDragData, setActiveDragData] = useState(null);

    const [returnUrl, setReturnUrl] = useState(null);
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();

    // Focus Logic: Auto-open editor if postId is in URL
    useEffect(() => {
        const focusId = searchParams.get('focus');
        const retUrl = searchParams.get('returnUrl');

        if (focusId && posts.length > 0) {
            const postToFocus = posts.find(p => p.id === focusId);
            if (postToFocus) {
                setEditingPost(postToFocus);
                setEditorOpen(true);
                if (retUrl) {
                    setReturnUrl(retUrl);
                }

                // Clear the params after opening
                const newParams = new URLSearchParams(searchParams);
                newParams.delete('focus');
                newParams.delete('returnUrl');
                setSearchParams(newParams, { replace: true });
            }
        }
    }, [searchParams, posts, setSearchParams]);

    // Deep Linking: Handle incoming pillar filter
    useEffect(() => {
        if (location.state?.filterPillar) {
            setFilterPillar(location.state.filterPillar);
        }
    }, [location.state]);

    // Handle Editor Close with potential Navigation
    const handleEditorClose = () => {
        setEditorOpen(false);
        if (returnUrl) {
            navigate(returnUrl);
            setReturnUrl(null);
        }
    };

    // Loading & Error States
    const loading = settingsLoading || postsLoading || ideasLoading;
    const error = settingsError || postsError;

    // --- REPAIR / INIT LOGIC ---
    const handleInitialize = async () => {
        if (!confirm("This will initialize the database with default settings. Continue?")) return;
        const { initializeSystemDefaults } = await import('../utils/master_seed');
        const res = await initializeSystemDefaults();
        if (res.success) {
            alert("System Initialized! reloading...");
            window.location.reload();
        } else {
            alert("Error: " + res.error);
        }
    };

    if (loading) return <div className="p-8">Loading Studio configuration...</div>;

    // Smart Error Screen
    if (error) {
        const isInitError = error.includes('settings not found') || error.includes('Missing permissions');
        return (
            <div className="p-8 text-destructive flex flex-col gap-4 items-start">
                <div className="text-xl font-bold">System Connection Issue</div>
                <div className="p-4 bg-red-50 border border-red-200 rounded text-red-800">
                    {error}
                </div>

                {isInitError && (
                    <div className="mt-4 p-6 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 w-full max-w-md">
                        <h3 className="font-bold text-lg mb-2">🚀 New Environment Detected</h3>
                        <p className="mb-4">It looks like you are connecting to a fresh database.</p>
                        <Button onClick={handleInitialize} size="lg">
                            Initialize System Defaults
                        </Button>
                    </div>
                )}
            </div>
        );
    }

    // Data Processing
    const platformCounts = posts.reduce((acc, post) => {
        acc[post.platform] = (acc[post.platform] || 0) + 1;
        return acc;
    }, {});

    // Filter Posts for each Lane
    const getLanePosts = (platformId) => {
        return posts.filter(p => {
            // Platform Match
            if (p.platform !== platformId) return false;

            // 0. Pillar Filter (Critical Fix)
            if (filterPillar !== 'all') {
                // Check both raw ID and definitive calculated value
                if (p.pillar !== filterPillar && p.definitive_pillar !== filterPillar) return false;
            }

            // 1. Archive Filter
            const isArchived = p.archived || p.status === 'archived';

            if (showArchived) {
                // STRICT MODE: If "Show Archived" is ON, we ONLY want to see the Archive.
                if (!isArchived) return false;

                // Checking Search Filter even for archived items is good UX
                if (searchQuery) {
                    const q = searchQuery.toLowerCase();
                    // Construct Display ID for Search
                    const displayId = formatPostId(p, ideas.find(i => i.id === p.idea_id)) || '';

                    return (
                        p.post_title?.toLowerCase().includes(q) ||
                        p.body?.toLowerCase().includes(q) ||
                        displayId.toLowerCase().includes(q)
                    );
                }

                // BYPASS the Status Filter (Active/Draft/etc)
                // We want to see the archived item regardless of whether it's 'published' or 'draft' underneath.

                return true;
            }

            // If "Show Archived" is OFF:
            // Hide any archived posts
            if (isArchived) return false;

            // 2. Status Filter
            switch (statusFilter) {
                case 'active': // Hide Published
                    if (p.status === 'published') return false;
                    break;
                case 'draft': // Draft Only
                    if (p.status !== 'draft') return false;
                    break;
                case 'scheduled': // Scheduled Only
                    if (p.status !== 'scheduled') return false;
                    break;
                case 'published': // Published Only
                    if (p.status !== 'published') return false;
                    break;
                case 'all': // Show All
                default:
                    break;
            }

            // 3. Search Filter
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                // Construct Display ID for Search
                const displayId = formatPostId(p, ideas.find(i => i.id === p.idea_id)) || '';

                return (
                    p.post_title?.toLowerCase().includes(q) ||
                    p.body?.toLowerCase().includes(q) ||
                    displayId.toLowerCase().includes(q)
                );
            }

            return true;
        });
    };

    const activeLanes = SORTED_PLATFORMS.filter(platform => {
        // Only show lanes that are EXPLICITLY enabled in Settings
        const isVisibleInSettings = settings?.lane_visibility?.[platform.id] === true;
        const matchesFilter = filterPlatform === 'all' || filterPlatform === platform.id;

        // Smart Telescoping: Hide empty lanes if the user is FILTERING the view.
        // We consider it "Filtering" if:
        // 1. Searching (Text or ID)
        // 2. Viewing Archive
        // 3. Filtered by specific Pillar
        // 4. Filtered by specific Status (e.g. "Published Only" or "Draft Only")
        // NOTE: We do NOT telescope for simple Horizon changes (e.g. 7d vs 30d) so users can still plan empty periods.
        const isFiltering = searchQuery || showArchived || filterPillar !== 'all' || statusFilter !== 'active';

        if (isFiltering) {
            const hasPosts = getLanePosts(platform.id).length > 0;
            // Only show lane if it has relevant posts
            return matchesFilter && hasPosts;
        }

        return isVisibleInSettings && matchesFilter;
    });


    const readyIdeas = ideas.filter(i => i.status === 'ready');

    // Handlers


    const handleSpawnWithPlatform = (ideaId, platformId) => {
        const idea = ideas.find(i => i.id === ideaId);
        if (idea) {
            setSpawnIdea(idea);
            setEditingPost(null);
            setTargetPlatform(platformId);
            setEditorOpen(true);
        }
    };

    const handleViewManifesto = (ideaId) => {
        const idea = ideas.find(i => i.id === ideaId);
        if (idea) {
            setManifestoIdea(idea);
        } else {
            // Fallback if idea not found in loaded list (rare)
            console.warn("Manifesto Idea note found:", ideaId);
        }
    };

    const handleDragStart = (event) => {
        const { active } = event;
        setActiveId(active.id);
        setActiveDragData(active.data.current);

    };

    const handleDragEnd = (event) => {
        const { active, over } = event;

        // Clear active state first
        setActiveId(null);
        setActiveDragData(null);

        if (active && over) {
            const activeType = active.data.current?.type;
            const overType = over.data.current?.type;

            // Handle IDEA -> LANE (Spawn)
            if (activeType === 'idea' && overType === 'lane') {
                const idea = active.data.current.idea;
                const platform = over.data.current.platform;

                // Trigger Spawn
                handleSpawnWithPlatform(idea.id, platform.id);
            }

            // Handle POST -> LANE (Move)
            if (activeType === 'post' && overType === 'lane') {
                const post = active.data.current.post;
                const platform = over.data.current.platform;

                // Only act if moving to a DIFFERENT lane
                if (post.platform !== platform.id) {


                    // Optimistically update the post object for the modal
                    // This allows the modal to open with the NEW platform pre-selected
                    const updatedPost = { ...post, platform: platform.id };

                    setEditingPost(updatedPost);
                    setTargetPlatform(platform.id);
                    setEditorOpen(true);
                    toast.info(`Moved to ${platform.label}`);
                }
            }
        }
    };

    const handleDragCancel = () => {
        setActiveId(null);
        setActiveDragData(null);
    };

    const handleCreateStarterPost = () => {
        setEditingPost(null);
        setSpawnIdea(null);
        // If we are filtered to a specific platform, use that as the default for the starter post
        setTargetPlatform(filterPlatform !== 'all' ? filterPlatform : null);
        setEditorOpen(true);
    };

    const handleReturnToIncubating = async (idea) => {
        await updateIdea(idea.id, { status: 'incubating' });
        toast.info("Idea returned to incubation");
    };

    const handleAddPost = (platformId) => {
        setSpawnIdea(null);
        setEditingPost(null);
        setTargetPlatform(platformId);
        setEditorOpen(true);
    };

    const handleEditPost = (post) => {
        setEditingPost(post);
        setSpawnIdea(null);
        setTargetPlatform(null);
        setEditorOpen(true);
    };

    const handleSavePost = async (postData) => {
        if (editingPost) {
            await updatePost(editingPost.id, postData);
            toast.success("Post updated");
        } else {
            await addPost(postData);
            toast.success("Post created");
        }
    };

    // Triggered by UI
    const handleDeletePost = (post) => {
        setDeleteDetails({ post });
    };

    // Triggered by Dialog Confirmation
    const confirmDeletePost = async () => {
        if (deleteDetails?.post) {
            const pid = formatPostId(deleteDetails.post, ideas.find(i => i.id === deleteDetails.post.idea_id));
            try {
                await deletePost(deleteDetails.post.id);
                setEditorOpen(false); // Close editor if open
                toast.success(`Post ${pid} deleted`, {
                    description: "The post has been permanently removed from the vault."
                });
            } catch (error) {
                console.error("Failed to delete post:", error);
                toast.error("Failed to delete post", {
                    description: error.message || "An unexpected error occurred."
                });
            } finally {
                setDeleteDetails(null);
            }
        }
    };

    return (
        <ErrorBoundary>
            <DndContext
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
                sensors={sensors}
            >
                <div className="h-full min-h-0 flex flex-col md:flex-row gap-0 overflow-y-auto md:overflow-hidden relative">
                    {/* Left Sidebar: Ideas Ready (Hidden on Mobile unless toggled) */}
                    <div className={`
                        fixed inset-0 z-40 md:relative md:inset-auto md:z-0
                        ${isMobileIdeasOpen ? 'flex' : 'hidden md:flex'}
                        w-64 border-r border-border bg-card/95 backdrop-blur-md md:bg-card/30 flex-col flex-shrink-0 transition-all duration-300
                    `}>
                        <div className="p-3 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between shrink-0">
                            <h2 className="font-bold text-sm flex items-center gap-2 tracking-tight">
                                <Sparkles className="w-4 h-4 text-purple-400" />
                                <span>CONTENT SOURCES</span>
                            </h2>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="md:hidden h-8 w-8"
                                onClick={() => setIsMobileIdeasOpen(false)}
                            >
                                <X size={16} />
                            </Button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-6">
                            {/* ACTION ZONE: Tone down the button so it doesn't fight the list */}
                            <div className="space-y-3">
                                <Button
                                    onClick={handleCreateStarterPost}
                                    variant="outline"
                                    className="w-full bg-background border-dashed border-2 border-violet-500/30 hover:border-violet-500 hover:bg-violet-500/5 text-violet-300 gap-2 h-10 transition-all active:scale-95 shadow-sm shadow-violet-500/5"
                                    title="Create a post without an idea attached"
                                >
                                    <Plus className="w-4 h-4 text-violet-400" />
                                    <span className="font-semibold text-[11px] uppercase tracking-wider">New Starter Post</span>
                                </Button>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-3 py-2.5 bg-card border-2 border-border/80 rounded-xl shadow-sm">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
                                        <span className="text-xs font-black text-foreground tracking-[0.1em] uppercase">Ideas Ready to Post</span>
                                    </div>
                                    <span className="text-[11px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-bold tabular-nums shadow-sm">
                                        {readyIdeas.length}
                                    </span>
                                </div>

                                <div className="space-y-3 px-0.5 pb-4">
                                    {readyIdeas.length === 0 ? (
                                        <div className="text-center py-10 text-muted-foreground text-sm border-2 border-dashed border-border/50 rounded-lg">
                                            <p>No ideas ready.</p>
                                            <p className="text-xs mt-1 text-muted-foreground/50 italic">Mark ideas as "Ready" in the Vault.</p>
                                        </div>
                                    ) : (
                                        readyIdeas.map(idea => (
                                            <DraggableBacklogCard
                                                key={idea.id}
                                                idea={idea}
                                                pillar={settings?.content_pillars?.find(p => p && p.id === idea.pillar)}
                                                settings={settings}
                                                // Keep original props for fallback/compatibility
                                                onMoveTo={(platform) => handleSpawnWithPlatform(idea.id, platform)}
                                                onReturnToIncubation={() => handleReturnToIncubating(idea)}
                                            />
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Studio Area */}
                    <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                        {/* Mobile Ideas Toggle Trigger */}
                        <div className="md:hidden flex items-center px-4 pt-3 gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 rounded-full bg-primary/10 border-primary/20 text-primary text-[10px] font-bold gap-1.5"
                                onClick={() => setIsMobileIdeasOpen(true)}
                            >
                                <Lightbulb size={12} className="fill-primary/20" />
                                IDEAS READY ({readyIdeas.length})
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className={`h-8 rounded-full text-[10px] font-bold gap-1.5 transition-all ${isMobileFiltersOpen ? 'bg-primary text-white border-primary' : 'bg-muted border-border text-muted-foreground'}`}
                                onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
                            >
                                <Search size={12} />
                                FILTERS {isMobileFiltersOpen ? 'CLOSE' : 'OPEN'}
                            </Button>
                        </div>

                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 mb-6 px-4 pt-2 md:pt-4">
                            <div>
                                <h1 className="text-xl md:text-3xl font-bold tracking-tight mb-1 flex items-center gap-2">
                                    <LayoutDashboard className="text-primary w-6 h-6 md:w-8 md:h-8" />
                                    Studio
                                </h1>
                                <p className="text-muted-foreground hidden md:block">Manage your content sources and production pipeline.</p>
                            </div>
                            <div className="text-[10px] font-bold text-muted-foreground/50 tracking-widest uppercase self-end md:self-auto mb-1 md:mb-0">
                                {filterPlatform === 'all' ? `${activeLanes.length} Active Lanes` : 'Filtered View'} • {posts.length} Total Posts
                            </div>
                        </div>

                        {/* Filters & Controls (Collapsible on Mobile) */}
                        <div className={`${isMobileFiltersOpen ? 'flex' : 'hidden md:flex'} flex-col shrink-0 transition-all duration-300`}>

                            {/* Filter Bar Row */}
                            <div className="px-4 pb-2.5 flex items-center gap-2 shrink-0 flex-wrap">
                                {/* Search */}
                                <div className="relative flex-1 min-w-[200px]">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                                    <Input
                                        placeholder="Search by Title, ID (try #D), or Body..."
                                        className="pl-9 bg-card/50 border-border/50 h-9"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>

                                {/* Pillar Filter */}
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Pillar:</span>
                                    <Select value={filterPillar} onValueChange={setFilterPillar}>
                                        <SelectTrigger className="w-[180px] bg-card/50 border-border/50 h-9 overflow-hidden">
                                            <div className="flex items-center gap-2 truncate">
                                                {filterPillar !== 'all' && (
                                                    <div
                                                        className="w-2 h-2 rounded-full shrink-0"
                                                        style={{ backgroundColor: settings?.content_pillars?.find(p => (p.id === filterPillar || p.name === filterPillar))?.color }}
                                                    />
                                                )}
                                                <div className="truncate text-left flex-1">
                                                    <SelectValue placeholder="All Pillars">
                                                        {filterPillar === 'all' ? 'All Pillars' : (settings?.content_pillars?.find(p => (p.id === filterPillar || p.name === filterPillar))?.name)}
                                                    </SelectValue>
                                                </div>
                                            </div>
                                        </SelectTrigger>
                                        <SelectContent className="bg-card border-border">
                                            <SelectItem value="all">All Pillars</SelectItem>
                                            {settings?.content_pillars?.filter(p => p && !p.disabled).map(p => (
                                                <SelectItem key={p.id} value={p.id || p.name}>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full inline-block shrink-0" style={{ backgroundColor: p.color }} />
                                                        <span className="truncate">{p.name}</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Horizon Filter */}
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Horizon:</span>
                                    <Select value={filterHorizon} onValueChange={setFilterHorizon}>
                                        <SelectTrigger className="w-[180px] bg-card/50 border-border/50 h-9">
                                            <SelectValue placeholder="Horizon" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-card border-border">
                                            <SelectItem value="7d_future">Last 7d + Future</SelectItem>
                                            <SelectItem value="30d">Last 30 Days</SelectItem>
                                            <SelectItem value="all">All Time</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* NEW: Status Filter */}
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Status:</span>
                                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                                        <SelectTrigger className="w-[180px] bg-card/50 border-border/50 h-9">
                                            <SelectValue placeholder="Status" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-card border-border">
                                            <SelectItem value="active">Active (Draft & Sched)</SelectItem>
                                            <SelectItem value="draft">Draft Only</SelectItem>
                                            <SelectItem value="scheduled">Scheduled Only</SelectItem>
                                            <SelectItem value="published">Published Only</SelectItem>
                                            <SelectItem value="all">All Posts</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Show Archived Toggle */}
                                <div className="flex items-center">
                                    <Button
                                        variant={showArchived ? "secondary" : "outline"}
                                        size="sm"
                                        className={`h-9 bg-card/50 border-border/50 ${showArchived ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground'}`}
                                        onClick={() => setShowArchived(!showArchived)}
                                    >
                                        <Archive className="h-4 w-4 mr-2" />
                                        <span className="text-xs font-medium">Show Archived</span>
                                    </Button>
                                </div>

                                {/* Collapse/Expand Controls */}
                                <div className="flex bg-muted/30 p-1 rounded-lg border border-border/50">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className={`h-7 px-3 text-[11px] gap-1.5 transition-all ${isAllCollapsed ? 'bg-background shadow-sm hover:bg-background' : 'text-muted-foreground hover:text-foreground'}`}
                                        onClick={() => setIsAllCollapsed(true)}
                                    >
                                        <ChevronsDownUp className="w-3.5 h-3.5" />
                                        Collapse All
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className={`h-7 px-3 text-[11px] gap-1.5 transition-all ${!isAllCollapsed ? 'bg-background shadow-sm hover:bg-background' : 'text-muted-foreground hover:text-foreground'}`}
                                        onClick={() => setIsAllCollapsed(false)}
                                    >
                                        <ChevronsUpDown className="w-3.5 h-3.5" />
                                        Expand All
                                    </Button>
                                </div>
                            </div>

                            {/* Filter Bar */}
                            <div className="px-4 pb-2.5 flex flex-wrap gap-1.5 shrink-0">
                                <Button
                                    variant={filterPlatform === 'all' ? "default" : "outline"}
                                    size="sm"
                                    className="h-8 rounded-full"
                                    onClick={() => setFilterPlatform('all')}
                                >
                                    Show All
                                </Button>
                                {SORTED_PLATFORMS.map(p => {
                                    // Only show filter buttons for lanes that are EXPLICITLY enabled in Settings
                                    if (settings?.lane_visibility?.[p.id] !== true) return null;
                                    const count = platformCounts[p.id] || 0;
                                    const isActive = filterPlatform === p.id;

                                    return (
                                        <Button
                                            key={p.id}
                                            variant={isActive ? "default" : "outline"}
                                            size="sm"
                                            className={`h-8 rounded-full gap-2 transition-all ${isActive ? '' : 'text-muted-foreground'}`}
                                            onClick={() => setFilterPlatform(p.id)}
                                            style={isActive ? { backgroundColor: p.color, borderColor: p.color, color: '#fff' } : {}}
                                        >
                                            {p.icon && <p.icon className="w-4 h-4" style={isActive ? { color: '#fff' } : { color: p.color }} />}
                                            {p.label}
                                            <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20' : 'bg-muted text-foreground'}`}>
                                                {count}
                                            </span>
                                        </Button>
                                    );
                                })}
                            </div>


                        </div>

                        {/* Horizontal Scroll Container for Lanes */}
                        <div className="flex-1 overflow-x-auto overflow-y-hidden touch-pan-x overscroll-x-contain min-h-[400px] md:min-h-0">
                            <div className="flex h-full gap-4 pb-12 md:pb-4 px-4 min-w-max">
                                {activeLanes.map(platform => {
                                    const lanePosts = getLanePosts(platform.id);
                                    return (
                                        <DroppableLane key={platform.id} platform={platform}>
                                            <Lane
                                                platform={platform} // Pass the full config object
                                                posts={lanePosts}
                                                isCollapsed={isAllCollapsed}
                                                onEditPost={handleEditPost}
                                                onAddPost={() => handleAddPost(platform.id)}
                                                onMovePost={(post, newPlatform) => {
                                                    updatePost(post.id, { platform: newPlatform });
                                                    const platformName = SORTED_PLATFORMS.find(p => p.id === newPlatform)?.label || newPlatform;
                                                    toast.success(`Moved to ${platformName}`);
                                                }}
                                                onDeletePost={handleDeletePost}
                                                onViewManifesto={handleViewManifesto}
                                                pillars={settings?.content_pillars || []}
                                                settings={settings}
                                                ideas={ideas}
                                            />
                                        </DroppableLane>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <PostEditorModal
                        open={editorOpen}
                        onClose={handleEditorClose}
                        post={editingPost}
                        // If spawning, use spawnIdea. If editing, find the linked idea from the full list.
                        idea={spawnIdea || (editingPost?.idea_id ? ideas.find(i => i.id === editingPost.idea_id) : null)}
                        ideas={ideas} // Pass all ideas for the dropdown
                        initialPlatform={targetPlatform}
                        allPosts={posts} // Pass all posts for sequence calculation
                        onSave={handleSavePost}
                        onDelete={handleDeletePost}
                        onUpdateIdea={updateIdea}
                        pillars={settings?.content_pillars || []}
                        settings={settings}
                        onViewManifesto={handleViewManifesto}
                    />

                    <IdeaManifestoModal
                        open={!!manifestoIdea}
                        onClose={() => setManifestoIdea(null)}
                        idea={manifestoIdea}
                        pillars={settings?.content_pillars || []}
                    />

                    <AlertDialog open={!!deleteDetails} onOpenChange={(open) => !open && setDeleteDetails(null)}>
                        <AlertDialogContent key={deleteDetails?.post?.id}>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete this Post?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will permanently delete "{deleteDetails?.post?.post_title || 'Untitled Post'}" ({formatPostId(deleteDetails?.post, ideas.find(i => i.id === deleteDetails?.post?.idea_id))}).
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={confirmDeletePost} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    Delete
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    <DragOverlay dropAnimation={null}>
                        {activeId && activeDragData ? (
                            <div className="z-[9999] pointer-events-none opacity-90 scale-105 rotate-1 shadow-2xl transition-transform touch-none origin-center">
                                {activeDragData.type === 'idea' ? (
                                    <div className="w-64">
                                        <BacklogCard
                                            idea={activeDragData.idea}
                                            pillar={settings?.content_pillars?.find(p => p && p.id === activeDragData.idea.pillar)}
                                        />
                                    </div>
                                ) : activeDragData.type === 'post' ? (
                                    <div className="w-72">
                                        <PlatformCard
                                            post={activeDragData.post}
                                            pillars={settings?.content_pillars || []}
                                        />
                                    </div>
                                ) : null}
                            </div>
                        ) : null}
                    </DragOverlay>
                </div>
            </DndContext >
        </ErrorBoundary>
    );
}
