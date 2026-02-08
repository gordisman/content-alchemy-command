import React, { useState, useEffect } from 'react';
import { PlatformCard } from './PlatformCard';
import { ArrowUpDown, ChevronsDownUp, ChevronsUpDown, Plus } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';

// Draggable Wrapper for Post Card
const DraggablePlatformCard = ({ post, onClick, onMovePost, onDeletePost, pillars, onViewManifesto, settings, ideas }) => {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `post-${post.id}`, // Unique ID for DnD
        data: { type: 'post', post }
    });

    const style = {
        opacity: isDragging ? 0.3 : 1,
        cursor: isDragging ? 'grabbing' : 'grab',
    };

    const idea = ideas?.find(i => i.id === post.idea_id);

    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
            <PlatformCard
                post={post}
                idea={idea}
                onClick={onClick}
                onMovePost={onMovePost}
                onDeletePost={onDeletePost}
                pillars={pillars}
                onViewManifesto={onViewManifesto}
                settings={settings}
            />
        </div>
    );
};

export function Lane({ platform, posts = [], isCollapsed: forceCollapsed, onEditPost, onMovePost, onDeletePost, pillars, onViewManifesto, onAddPost, settings, ideas }) {
    // Platform is now the full config object { id, label, color, icon: Icon }
    const { label, color, icon: Icon } = platform;
    const [sortBy, setSortBy] = useState('scheduled'); // 'scheduled' | 'created'

    // Sync with forceCollapsed but allow local toggle
    const [isExpanded, setIsExpanded] = useState(!forceCollapsed);
    useEffect(() => {
        setIsExpanded(!forceCollapsed);
    }, [forceCollapsed]);

    const sortedPosts = [...posts].sort((a, b) => {
        const getHighResTime = (item, field) => {
            const val = item[field];
            if (!val) return 0;
            // Firestore Timestamp (seconds + nanoseconds)
            if (val?.seconds !== undefined) {
                return val.seconds * 1000 + (val.nanoseconds ? val.nanoseconds / 1000000 : 0);
            }
            if (val instanceof Date) return val.getTime();
            try { return new Date(val).getTime(); } catch (e) { return 0; }
        };

        if (sortBy === 'scheduled') {
            const getSchedTime = (item) => {
                const val = item.publish_date;
                if (!val) return Infinity;
                if (val?.seconds !== undefined) {
                    return val.seconds * 1000 + (val.nanoseconds ? val.nanoseconds / 1000000 : 0);
                }
                if (val instanceof Date) return val.getTime();
                return Infinity;
            };
            const timeA = getSchedTime(a);
            const timeB = getSchedTime(b);

            if (timeA !== timeB) return timeA - timeB;

            // Fallback for scheduled: Tie-break with creation date
            return getHighResTime(b, 'created_at') - getHighResTime(a, 'created_at');
        } else {
            // Sort by "Freshness" (Newest First)
            // Use the most recent of created_at or updated_at
            const timeA = Math.max(getHighResTime(a, 'updated_at'), getHighResTime(a, 'created_at'));
            const timeB = Math.max(getHighResTime(b, 'updated_at'), getHighResTime(b, 'created_at'));

            // If activity is more than 2 seconds apart, prioritize Time
            if (Math.abs(timeA - timeB) > 2000) {
                return timeB - timeA;
            }

            // TIE-BREAKER / SAME-SESSION: If activity is very close, use logical ID order
            // 1. Idea Number (Higher first)
            const ideaA = Number(a.idea_number) || 0;
            const ideaB = Number(b.idea_number) || 0;
            if (ideaA !== ideaB) return ideaB - ideaA;

            // 2. Sequence (Higher first)
            const seqA = Number(a.sequence) || 0;
            const seqB = Number(b.sequence) || 0;
            if (seqA !== seqB) return seqB - seqA;

            // 3. Direct Entry Sequence (Higher first)
            const dSeqA = Number(a.direct_entry_sequence) || 0;
            const dSeqB = Number(b.direct_entry_sequence) || 0;
            if (dSeqA !== dSeqB) return dSeqB - dSeqA;

            // 4. Final Fallback to Time
            return timeB - timeA;
        }
    });

    const toggleSort = () => {
        setSortBy(prev => prev === 'scheduled' ? 'created' : 'scheduled');
    };

    return (
        <div className={`flex-shrink-0 w-80 flex flex-col transition-all duration-300 ${isExpanded ? 'h-full' : 'h-14'} bg-muted/30 rounded-lg border border-border overflow-hidden`}>
            {/* Header */}
            <div
                className={`p-4 border-b border-border flex justify-between items-center bg-card rounded-t-lg border-l-4 cursor-pointer hover:bg-card/80 transition-colors shrink-0`}
                style={{ borderLeftColor: color }}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2">
                    {Icon && <Icon size={16} style={{ color: color }} />}
                    <h3 className="font-semibold text-sm uppercase tracking-wider">{label}</h3>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{posts.length}</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onAddPost();
                        }}
                        className="flex items-center justify-center h-6 w-6 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title="Create New Post"
                    >
                        <Plus size={16} />
                    </button>
                    {isExpanded && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleSort();
                            }}
                            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted"
                            title={`Sort by ${sortBy === 'scheduled' ? 'Created' : 'Scheduled'}`}
                        >
                            <ArrowUpDown size={12} />
                            <span>{sortBy === 'scheduled' ? 'Sched' : 'Newest'}</span>
                        </button>
                    )}
                    <div className="text-muted-foreground/50">
                        {isExpanded ? <ChevronsDownUp size={14} /> : <ChevronsUpDown size={14} />}
                    </div>
                </div>
            </div>

            {/* Content Area (Droppable) */}
            {isExpanded && (
                <div className="flex-1 p-2 overflow-y-auto space-y-3 min-h-[200px]">
                    {posts.length === 0 ? (
                        <div className="h-24 border-2 border-dashed border-muted-foreground/20 rounded-md flex items-center justify-center text-muted-foreground text-xs">
                            Empty ({label})
                        </div>
                    ) : (
                        sortedPosts.map(post => (
                            <DraggablePlatformCard
                                key={post.id}
                                post={post}
                                onClick={() => onEditPost && onEditPost(post)}
                                onMovePost={onMovePost}
                                onDeletePost={onDeletePost}
                                pillars={pillars}
                                onViewManifesto={onViewManifesto}
                                settings={settings}
                                ideas={ideas}
                            />
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
