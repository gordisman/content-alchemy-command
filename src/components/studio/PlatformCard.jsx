import { Calendar as CalendarIcon, MoreHorizontal, Edit, Trash2, Sparkles, MoveRight, Clock } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SORTED_PLATFORMS, PLATFORM_CONFIG } from '../../config/platforms';
import { formatPostId } from '../../utils/postIdFormatter';

export function PlatformCard({ post, idea = null, onClick, onMovePost, onDeletePost, pillars = [], onViewManifesto, settings = {} }) {
    // 1. Determine Pillar Color (Left Border)
    const pillarName = post.definitive_pillar;
    const pillarData = pillars?.find(p => p && (p.name === pillarName || p.id === pillarName));
    const pillarColor = pillarData?.color || '#cbd5e1';

    // 2. Determine Platform Config for Icon
    const platform = PLATFORM_CONFIG[post.platform];
    const PlatformIcon = platform?.icon || MoreHorizontal;

    // 3. Determine Status Text Color & Label Override
    const now = new Date();
    let pDate = post.publish_date?.seconds ? new Date(post.publish_date.seconds * 1000) : new Date(post.publish_date);

    // Fallback/Legacy: If we have a time string, ensure the comparison date uses it
    if (post.publish_time && pDate) {
        const [hours, minutes] = post.publish_time.split(':');
        pDate = new Date(pDate);
        pDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    }

    const isOverdue = post.status === 'scheduled' && post.publish_date && pDate < now;
    const displayStatus = isOverdue ? 'overdue' : post.status;

    const statusTextColors = {
        draft: 'text-slate-400',       // Muted Gray
        scheduled: 'text-amber-500',   // Amber
        published: 'text-emerald-500',  // Emerald
        overdue: 'text-red-500',
    };
    const statusTextColor = statusTextColors[displayStatus] || 'text-muted-foreground';

    return (
        <div
            onClick={onClick}
            className={`bg-[#0f1115] p-4 rounded-xl shadow-lg border border-border/40 border-l-[3px] hover:border-border transition-all cursor-grab active:cursor-grabbing hover:bg-zinc-900/50 group relative`}
            style={{ borderLeftColor: pillarColor }}
        >
            {/* Top Row: Platform Icon + Badge + Action Icons */}
            <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                    {/* Platform Icon */}
                    <div className="p-1.5 rounded-full bg-background/80 shadow-inner border border-border/50">
                        <PlatformIcon size={14} style={{ color: platform?.color }} />
                    </div>

                    {/* Badge */}
                    <div
                        className="text-[10px] font-mono px-2 py-0.5 rounded border-2 bg-background/40 text-white flex items-center shadow-lg"
                        style={{ borderColor: pillarColor }}
                    >
                        <span className="font-bold">
                            {formatPostId(post, idea)}
                        </span>
                    </div>
                </div>

                {/* Top Action Icons */}
                <div className="flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                    <button
                        className="p-1.5 hover:bg-purple-500/10 rounded-full transition-colors group/icon"
                        title="View Idea Manifesto"
                        onClick={(e) => {
                            e.stopPropagation();
                            onViewManifesto && onViewManifesto(post.idea_id);
                        }}
                    >
                        <Sparkles size={14} className="text-purple-400 group-hover/icon:text-purple-300" />
                    </button>


                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                className="p-1.5 hover:bg-blue-500/10 rounded-full transition-colors group/icon text-blue-500"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <MoveRight size={14} />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[#1a1a1a] border-border w-48 z-50">
                            {SORTED_PLATFORMS.filter(p => settings?.lane_visibility?.[p.id] === true).map(p => (
                                <DropdownMenuItem
                                    key={p.id}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onMovePost && onMovePost(post, p.id);
                                    }}
                                    className="cursor-pointer gap-2"
                                >
                                    <p.icon size={14} style={{ color: p.color }} />
                                    <span className="text-xs">{p.label}</span>
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                className="p-1.5 hover:bg-muted rounded-full transition-colors text-muted-foreground"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <MoreHorizontal size={14} />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                onClick();
                            }}>
                                <Edit className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive focus:bg-red-950/20 focus:text-red-400" onClick={(e) => {
                                e.stopPropagation();
                                onDeletePost && onDeletePost(post);
                            }}>
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Status Bar + Schedule Info */}
            <div className="flex items-center justify-between mb-3 px-3 py-1.5 bg-background/30 rounded-lg border border-border/20">
                <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${displayStatus === 'published' ? 'bg-emerald-500' : displayStatus === 'scheduled' ? 'bg-amber-500' : displayStatus === 'overdue' ? 'bg-red-500' : 'bg-slate-500'}`} />
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${statusTextColor}`}>
                        {displayStatus} {post.archived && <span className="text-muted-foreground ml-1">[A]</span>}
                    </span>
                </div>

                {post.publish_date && (
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tight">
                        <Clock size={10} className="opacity-50" />
                        <span>{safeDate(post.publish_date)}</span>
                        <span className="opacity-30">•</span>
                        <span>{post.publish_time || '00:00'}</span>
                    </div>
                )}
            </div>

            {/* Title Line */}
            <h4 className="text-sm font-bold leading-tight mb-2 text-white/90 tracking-tight">
                <span className="line-clamp-2">
                    {post.post_title || '(Untitled Post)'}
                </span>
            </h4>

            {/* Content Snippet (Preview) */}
            <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-3 min-h-[2.4em]">
                {post.body || post.content_text || post.concept || <span className="italic opacity-50 text-[10px]">No content preview available yet...</span>}
            </p>

            {/* Action Notes (Yellow Footer) */}
            {post.action_notes && (
                <div className="mt-2 pt-2.5 border-t border-border/30 text-[11px] text-amber-200/70 leading-normal flex gap-2">
                    <span className="text-amber-500 text-xs mt-0.5">•</span>
                    <span className="line-clamp-2 italic">{post.action_notes}</span>
                </div>
            )}
        </div>
    );
}

// Helper for date safety
const safeDate = (dateVal) => {
    try {
        if (!dateVal) return '';
        const d = dateVal.seconds ? new Date(dateVal.seconds * 1000) : new Date(dateVal);
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch { return ''; }
};
