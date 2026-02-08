import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreVertical, MoveRight, Lightbulb } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { SORTED_PLATFORMS } from '../../config/platforms';

export default function BacklogCard({
    idea,
    onMoveTo,
    onReturnToIncubation,
    pillar,
    settings = {}
}) {
    return (
        <Card
            className={cn(
                "glass-panel glass-panel-hover rounded-xl p-3 mb-3 cursor-grab active:cursor-grabbing transition-all duration-300 flex flex-col relative group border-border/50",
                "hover:border-violet-500/30"
            )}
        >
            {/* Pillar Color Bar */}
            {pillar && (
                <div
                    className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
                    style={{ backgroundColor: pillar.color }}
                />
            )}

            <div className="flex items-center justify-between gap-2 mb-2 pl-2">
                <Badge
                    variant="outline"
                    className="text-[10px] border-violet-500/30 text-violet-400 font-mono"
                >
                    #IDEA-{idea.idea_number}
                </Badge>

                <div className="flex items-center gap-0">
                    {/* Move To Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-primary hover:text-primary hover:bg-primary/10"
                                title="Spawn Post..."
                            >
                                <MoveRight className="w-3 h-3" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[#1a1a1a] border-border w-48">
                            {SORTED_PLATFORMS.filter(p => settings?.lane_visibility?.[p.id] === true).map(platform => (
                                <DropdownMenuItem
                                    key={platform.id}
                                    onClick={() => onMoveTo(platform.id)}
                                    className="cursor-pointer gap-2"
                                >
                                    <platform.icon size={14} style={{ color: platform.color }} />
                                    <span className="text-xs">{platform.label}</span>
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground">
                                <MoreVertical className="w-3 h-3" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[#1a1a1a] border-border">
                            <DropdownMenuItem onClick={onReturnToIncubation} className="text-amber-400 focus:text-amber-300">
                                <Lightbulb className="w-3 h-3 mr-2" />
                                Incubate
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <h4 className="font-bold text-sm line-clamp-2 pl-2 text-white/90 leading-tight tracking-tight">
                {idea.master_title}
            </h4>
        </Card>
    );
}
