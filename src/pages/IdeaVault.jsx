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
    Shapes
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
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
import IdeaEditorModal from '../components/vault/IdeaEditorModal';

export default function IdeaVault() {
    const { ideas, loading: ideasLoading, error: ideasError, updateIdea, deleteIdea, addIdea } = useIdeas();
    const { posts } = usePosts(); // Get all posts
    const { settings, loading: settingsLoading } = useSettings();

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // all, incubating, ready, completed
    const [pillarFilter, setPillarFilter] = useState('all');

    // Editor State
    const [editorOpen, setEditorOpen] = useState(false);
    const [editingIdea, setEditingIdea] = useState(null);

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [ideaToDelete, setIdeaToDelete] = useState(null);

    // Sort logic could go here, defaulting to 'created desc' from hook for now.

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

        return matchesSearch && matchesStatus && matchesPillar;
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
        setIdeaToDelete(idea);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (ideaToDelete) {
            const idBadge = `#IDEA-${ideaToDelete.idea_number}`;
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
            <div className="glass-panel p-2 md:p-4 rounded-xl flex items-center gap-2 shrink-0">
                {/* Search - Flexible */}
                <div className="relative flex-1 min-w-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 h-10 bg-background/50 border-border w-full text-sm"
                    />
                </div>

                {/* Filters Group */}
                <div className="flex items-center gap-2">
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

                    {/* New Idea Button - Moved Here */}
                    <Button
                        className="bg-primary hover:bg-primary/90 text-white h-10 w-10 md:w-auto md:px-4"
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
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto pr-1 md:pr-2 min-h-0">
                {filteredIdeas.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground border-2 border-dashed border-border/50 rounded-xl">
                        <Lightbulb className="w-12 h-12 mb-4 opacity-20" />
                        <p>No ideas found matching your filters.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredIdeas.map(idea => (
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
