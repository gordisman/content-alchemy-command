import React, { useState } from 'react';
import { useIdeas } from '../hooks/useIdeas';
import { usePosts } from '../hooks/usePosts';
import { useSettings } from '../hooks/useSettings';
import IdeaCard from '../components/vault/IdeaCard';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Lightbulb,
    Plus,
    Search,
    Loader2,
    Filter,
    ArrowUpDown,
    Activity,
    Shapes,
    Eye,
    EyeOff,
    CheckSquare,
    Square,
    ChevronRight,
    Layers
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuCheckboxItem,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { storage } from '../lib/firebase';
import { ref, deleteObject } from 'firebase/storage';
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
import IdeaEditorModal from '../components/vault/IdeaEditorModal';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"; // Need tooltips

export default function IdeaVault() {
    const { ideas, loading: ideasLoading, error: ideasError, updateIdea, deleteIdea, addIdea } = useIdeas();
    const { posts } = usePosts(); // Get all posts
    const { settings, loading: settingsLoading } = useSettings();

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // all, incubating, ready, completed
    const [pillarFilter, setPillarFilter] = useState('all');

    // Feature: Sort & Hide Completed
    const [sortOrder, setSortOrder] = useState('newest'); // newest, oldest, id_asc, id_desc, progress
    const [hideCompleted, setHideCompleted] = useState(true);

    // Feature: Select Mode
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedIdeas, setSelectedIdeas] = useState([]);

    // Editor State
    const [editorOpen, setEditorOpen] = useState(false);
    const [editingIdea, setEditingIdea] = useState(null);

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [ideaToDelete, setIdeaToDelete] = useState(null);

    const loading = ideasLoading || settingsLoading;

    if (loading) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

    // Filter Logic
    const filteredIdeas = ideas.filter(idea => {
        // Search
        const matchesSearch = !search ||
            idea.master_title?.toLowerCase().includes(search.toLowerCase()) ||
            idea.concept?.toLowerCase().includes(search.toLowerCase()) ||
            idea.idea_number?.toString().includes(search.toLowerCase()) ||
            `#IDEA-${idea.idea_number}`.toLowerCase().includes(search.toLowerCase());

        // Status
        const matchesStatus = statusFilter === 'all' || idea.status === statusFilter;

        // Pillar
        const matchesPillar = pillarFilter === 'all' || idea.pillar === pillarFilter;

        // Hide Completed (Feature)
        // If hideCompleted is TRUE, and idea.status IS 'completed', then return FALSE (filter it out)
        if (hideCompleted && idea.status === 'completed') {
            return false;
        }

        return matchesSearch && matchesStatus && matchesPillar;
    });

    // Sort Logic (Feature)
    const sortedIdeas = [...filteredIdeas].sort((a, b) => {
        switch (sortOrder) {
            case 'newest':
                return new Date(b.created_date || 0) - new Date(a.created_date || 0);
            case 'oldest':
                return new Date(a.created_date || 0) - new Date(b.created_date || 0);
            case 'id_asc':
                return (a.idea_number || 0) - (b.idea_number || 0);
            case 'id_desc':
                return (b.idea_number || 0) - (a.idea_number || 0);
            case 'progress':
                const getProgress = (idea) => {
                    const ideaPosts = posts.filter(p => p.idea_id === idea.id);
                    if (ideaPosts.length === 0) return 0;
                    const published = ideaPosts.filter(p => p.status === 'published').length;
                    return (published / ideaPosts.length);
                };
                return getProgress(b) - getProgress(a); // High to Low
            default: // newest
                return new Date(b.created_date || 0) - new Date(a.created_date || 0);
        }
    });

    const pillars = settings?.content_pillars?.filter(p => p.active !== false) || [];

    // Handlers
    const handleToggleFavorite = async (idea) => {
        await updateIdea(idea.id, { is_favorite: !idea.is_favorite });
    };

    const handleArchive = async (idea) => {
        const newStatus = idea.status === 'completed' ? 'ready' : 'completed';
        await updateIdea(idea.id, { status: newStatus });
    };

    const handleDeleteClick = (idea) => {
        // SAFETY CHECK: Prevent deletion if spawned posts exist
        const associatedPosts = posts.filter(p => p.idea_id === idea.id);
        if (associatedPosts.length > 0) {
            toast.error("Cannot delete this Idea", {
                description: `It has ${associatedPosts.length} post(s) spawned from it. Please delete the posts (Drafts, Scheduled, or Published) before deleting the Idea.`
            });
            return;
        }

        // TRIGGER DIALOG
        setIdeaToDelete(idea);
        setDeleteDialogOpen(true);
    };

    // Selection Handlers
    const toggleSelectMode = () => {
        setIsSelectMode(!isSelectMode);
        setSelectedIdeas([]); // Clear on toggle
    };

    const toggleIdeaSelection = (id) => {
        setSelectedIdeas(prev =>
            prev.includes(id)
                ? prev.filter(i => i !== id)
                : [...prev, id]
        );
    };

    const handleSelectAllVisible = () => {
        if (selectedIdeas.length === sortedIdeas.length) {
            setSelectedIdeas([]); // Clear if all selected
        } else {
            setSelectedIdeas(sortedIdeas.map(i => i.id));
        }
    };

    const handleBulkStatusUpdate = async (newStatus) => {
        try {
            const promises = selectedIdeas.map(id => updateIdea(id, { status: newStatus }));
            await Promise.all(promises);
            toast.success(`${selectedIdeas.length} ideas moved to ${newStatus}`);
            setSelectedIdeas([]);
            setIsSelectMode(false);
        } catch (error) {
            toast.error("Failed to update status");
        }
    };

    const handleBulkPillarUpdate = async (pillarId) => {
        try {
            const promises = selectedIdeas.map(id => updateIdea(id, { pillar: pillarId }));
            await Promise.all(promises);
            const pillarName = pillars.find(p => p.id === pillarId)?.name || 'Unknown';
            toast.success(`${selectedIdeas.length} ideas assigned to "${pillarName}"`);
            setSelectedIdeas([]);
            setIsSelectMode(false);
        } catch (error) {
            toast.error("Failed to update pillar");
        }
    };

    const confirmDelete = async () => {
        if (ideaToDelete) {
            const idBadge = `#IDEA-${ideaToDelete.idea_number}`;

            // DEEP PURGE: Delete associated audio memo from storage if it exists
            if (ideaToDelete.idea_audio_memo && ideaToDelete.idea_audio_memo.includes('firebasestorage.googleapis.com')) {
                try {
                    const storageRef = ref(storage, ideaToDelete.idea_audio_memo);
                    await deleteObject(storageRef);
                    console.log("Deep Purge: Storage audio memo deleted for ", idBadge);
                } catch (err) {
                    console.error("Deep Purge failed for audio memo:", err);
                    // We continue anyway so the record is still deleted
                }
            }

            try {
                await deleteIdea(ideaToDelete.id);
                toast.success(`Idea ${idBadge} Deleted`, {
                    description: `"${ideaToDelete.master_title}" has been removed from the vault.`
                });
            } catch (error) {
                console.error("Failed to delete idea:", error);
                toast.error("Delete Failed", { description: error.message || "An unexpected error occurred." });
            }
        }
        setDeleteDialogOpen(false);
    };

    const getSortLabel = (key) => {
        switch (key) {
            case 'newest': return 'Date Created (Newest)';
            case 'oldest': return 'Date Created (Oldest)';
            case 'id_asc': return 'ID Number (Low to High)';
            case 'id_desc': return 'ID Number (High to Low)';
            case 'progress': return 'Progress (% Published)';
            default: return 'Sort By';
        }
    };

    return (
        <div className="h-full flex flex-col p-2 md:p-6 space-y-3 md:space-y-6 overflow-hidden">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
                <div>
                    <h1 className="text-xl md:text-3xl font-bold tracking-tight mb-1 flex items-center gap-2">
                        <Lightbulb className="text-amber-400 fill-amber-400/20 w-6 h-6 md:w-8 md:h-8" />
                        Idea Vault
                    </h1>
                    <p className="text-muted-foreground hidden md:block">Capture, refine, and organize your content ideas.</p>
                </div>
            </div>

            {/* Toolbar - Consolidated Row */}
            <div className="glass-panel p-2 md:p-4 rounded-xl flex flex-col gap-3 shrink-0">
                {/* Top Row: Search + Main Filters + New Idea */}
                <div className="flex flex-wrap items-center gap-2 w-full">
                    {/* Search - Flexible */}
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 h-10 bg-background/50 border-border w-full text-sm"
                        />
                    </div>

                    {/* Status Filter */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon" className="h-10 w-10 md:w-auto md:px-4 md:justify-start" title="Filter by Status">
                                <Activity className="h-4 w-4 md:mr-2" />
                                <span className="hidden md:inline">Status: <span className="text-primary capitalize">{statusFilter}</span></span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {['all', 'incubating', 'ready', 'completed'].map(s => (
                                <DropdownMenuItem key={s} onClick={() => setStatusFilter(s)} className="capitalize">
                                    {s}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Pillar Filter */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon" className="h-10 w-10 md:w-auto md:px-4 md:justify-start" title="Filter by Pillar">
                                <Shapes className="h-4 w-4 md:mr-2" />
                                <span className="hidden md:inline">Pillar: <span className="text-primary">{pillarFilter === 'all' ? 'All' : pillars.find(p => p.id === pillarFilter)?.name || 'Unknown'}</span></span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 max-h-80 overflow-y-auto">
                            <DropdownMenuItem onClick={() => setPillarFilter('all')}>
                                All Pillars
                            </DropdownMenuItem>
                            {pillars.map(p => (
                                <DropdownMenuItem key={p.id} onClick={() => setPillarFilter(p.id)} className="gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                                    <span className="truncate">{p.name}</span>
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* New Idea Button - Always on Right */}
                    <Button
                        className="bg-primary hover:bg-primary/90 text-white h-10 w-10 md:w-auto md:px-4 ml-auto"
                        size="icon md:default"
                        title="Create New Idea"
                        onClick={() => {
                            setEditingIdea(null);
                            setEditorOpen(true);
                        }}
                    >
                        <Plus className="h-5 w-5 md:mr-2" />
                        <span className="hidden md:inline">New Idea</span>
                    </Button>
                </div>

                {/* Bottom Row: Sort + View Options */}
                <div className="flex flex-wrap items-center gap-2 w-full border-t border-border/30 pt-2">
                    {/* Sort Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="h-9 px-3 min-w-[180px] justify-between text-muted-foreground hover:text-foreground text-xs">
                                <span className="flex items-center gap-2 truncate">
                                    <ArrowUpDown className="w-3.5 h-3.5" />
                                    {getSortLabel(sortOrder)}
                                </span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-[200px]">
                            <DropdownMenuRadioGroup value={sortOrder} onValueChange={setSortOrder}>
                                <DropdownMenuRadioItem value="newest">Date Created (Newest)</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="oldest">Date Created (Oldest)</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="id_asc">ID Number (Low to High)</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="id_desc">ID Number (High to Low)</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="progress">Progress (% Published)</DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Show/Hide Completed */}
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant={hideCompleted ? "default" : "secondary"}
                                    className={`h-9 px-3 gap-2 transition-all text-xs ${hideCompleted ? "bg-[#5d5dff] hover:bg-[#4b4bff] text-white" : ""}`}
                                    onClick={() => setHideCompleted(!hideCompleted)}
                                    title={hideCompleted ? "Show Completed" : "Hide Completed"}
                                >
                                    {hideCompleted ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                    {hideCompleted ? "Show Completed" : "Hide Completed"}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="max-w-xs">{hideCompleted ? "ON: Hides completed/archived ideas to keep your active workspace clean." : "OFF: Shows all ideas including completed/archived ones."}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    {/* Select Mode Toggle & Toolbar - Starts on new line on mobile */}
                    <div className="w-full md:w-auto flex items-center gap-2 mt-2 md:mt-0 md:border-l md:border-border/30 md:pl-2">
                        {!isSelectMode ? (
                            <Button
                                variant="outline"
                                className="h-9 px-3 gap-2 transition-all text-xs border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800"
                                onClick={toggleSelectMode}
                            >
                                <CheckSquare className="w-3.5 h-3.5" />
                                Select Mode
                            </Button>
                        ) : (
                            <div className="flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-left-2">
                                <Button
                                    variant="default"
                                    className="h-9 px-3 gap-2 text-xs bg-violet-600 hover:bg-violet-700 text-white font-semibold"
                                    onClick={handleSelectAllVisible}
                                >
                                    <CheckSquare className="w-3.5 h-3.5" />
                                    Selected ({selectedIdeas.length})
                                </Button>

                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="h-9 text-xs"
                                    onClick={handleSelectAllVisible}
                                >
                                    {selectedIdeas.length === sortedIdeas.length ? "Deselect All" : "Select All Visible"}
                                </Button>

                                {selectedIdeas.length > 0 && (
                                    <>
                                        <div className="h-4 w-px bg-border mx-1" />

                                        <Button variant="outline" size="sm" className="h-9 text-xs gap-1" onClick={() => handleBulkStatusUpdate('ready')}>
                                            <ChevronRight className="w-3 h-3" /> Move to Ready
                                        </Button>

                                        <Button variant="outline" size="sm" className="h-9 text-xs gap-1" onClick={() => handleBulkStatusUpdate('incubating')}>
                                            <ChevronRight className="w-3 h-3 rotate-180" /> Return to Incubating
                                        </Button>

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" size="sm" className="h-9 text-xs gap-1">
                                                    <Layers className="w-3 h-3" /> Assign Pillar
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                <DropdownMenuItem onClick={() => handleBulkPillarUpdate(null)}>
                                                    Unassigned
                                                </DropdownMenuItem>
                                                {pillars.map(p => (
                                                    <DropdownMenuItem key={p.id} onClick={() => handleBulkPillarUpdate(p.id)} className="gap-2">
                                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                                                        {p.name}
                                                    </DropdownMenuItem>
                                                ))}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </>
                                )}

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 text-muted-foreground hover:text-destructive"
                                    onClick={toggleSelectMode}
                                    title="Exit Select Mode"
                                >
                                    <EyeOff className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto pr-1 md:pr-2 min-h-0">
                {sortedIdeas.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground border-2 border-dashed border-border/50 rounded-xl">
                        <Lightbulb className="w-12 h-12 mb-4 opacity-20" />
                        <p>No ideas found matching your filters.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {sortedIdeas.map(idea => (
                            <IdeaCard
                                key={idea.id}
                                idea={idea}
                                pillar={pillars.find(p => p.id === idea.pillar)}
                                onToggleFavorite={handleToggleFavorite}
                                onArchive={handleArchive}
                                onDelete={handleDeleteClick}
                                onEdit={(i) => {
                                    setEditingIdea(i);
                                    setEditorOpen(true);
                                }}
                                // New Props for Post Counting
                                postCounts={{
                                    total: posts.filter(p => p.idea_id === idea.id).length,
                                    published: posts.filter(p => p.idea_id === idea.id && p.status === 'published').length
                                }}
                                // New Props for Selection
                                isSelectMode={isSelectMode}
                                isSelected={selectedIdeas.includes(idea.id)}
                                onToggleSelect={toggleIdeaSelection}
                            />
                        ))}
                    </div>
                )}
            </div>

            <IdeaEditorModal
                open={editorOpen}
                onClose={() => setEditorOpen(false)}
                idea={editingIdea}
                onDelete={handleDeleteClick}
                onSave={async (data) => {
                    if (editingIdea) {
                        await updateIdea(editingIdea.id, data);
                        toast.success("Idea Updated");
                    } else {
                        // Find max ID for auto-increment logic
                        const maxId = ideas.reduce((max, curr) => Math.max(max, curr.idea_number || 0), 100);
                        await addIdea({ ...data, idea_number: maxId + 1 });
                        toast.success("Idea Created");
                    }
                }}
            />

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete "{ideaToDelete?.master_title}" (#IDEA-{ideaToDelete?.idea_number}). This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete Idea
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
