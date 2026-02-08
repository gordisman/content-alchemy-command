import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Star,
    MoreVertical,
    Edit2,
    Trash2,
    Archive,
    Link as LinkIcon
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const statusConfig = {
    incubating: { label: 'Incubating', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    ready: { label: 'Ready', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    completed: { label: 'Completed', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' }
};

export default function IdeaCard({
    idea,
    onEdit,
    onDelete,
    onToggleFavorite,
    onArchive,
    pillar
}) {
    const status = statusConfig[idea.status] || statusConfig.incubating;

    return (
        <Card className={cn(
            "glass-panel rounded-xl p-5 transition-all duration-300 hover:shadow-[0_0_30px_rgba(139,92,246,0.15)] hover:border-violet-500/50 relative group",
            idea.is_favorite && "ring-1 ring-amber-500/30"
        )}>
            {pillar && (
                <div
                    className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
                    style={{ backgroundColor: pillar.color }}
                />
            )}

            <div className="flex items-center justify-between gap-3 mb-3 pl-2">
                <Badge className={cn("text-xs border-0 shrink-0", status.color)}>
                    {status.label}
                </Badge>

                <div className="flex items-center gap-2">
                    {idea.idea_number && (
                        <Badge variant="outline" className="text-xs border-violet-500/30 text-violet-400 font-mono shrink-0">
                            #IDEA-{idea.idea_number}
                        </Badge>
                    )}
                    <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onToggleFavorite(idea)}
                            className={cn(
                                "h-8 w-8",
                                idea.is_favorite
                                    ? "text-amber-400 hover:text-amber-300"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Star className={cn("w-4 h-4", idea.is_favorite && "fill-current")} />
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                    <MoreVertical className="w-4 h-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-[#1a1a1a] border-border text-foreground">
                                <DropdownMenuItem onClick={() => onEdit(idea)}>
                                    <Edit2 className="w-4 h-4 mr-2" />
                                    Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onArchive(idea)}>
                                    <Archive className="w-4 h-4 mr-2" />
                                    {idea.status === 'completed' ? 'Mark as Ready' : 'Mark as Completed'}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onDelete(idea)} className="text-red-400 focus:text-red-300 focus:bg-red-500/10">
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>

            <div className="pl-2">
                <h3 className="font-semibold text-lg mb-2 line-clamp-2 leading-tight">
                    {idea.master_title}
                </h3>

                {idea.concept && (
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                        {idea.concept}
                    </p>
                )}

                {idea.resources?.length > 0 && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
                        <LinkIcon className="w-3 h-3" />
                        <span>{idea.resources.length} resources</span>
                    </div>
                )}
            </div>
        </Card>
    );
}
