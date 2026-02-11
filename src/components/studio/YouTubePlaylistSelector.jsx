import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function YouTubePlaylistSelector({
    value = [], // Array of IDs
    onChange,
    playlists = [],
    disabled = false
}) {
    const [open, setOpen] = useState(false);
    const [filter, setFilter] = useState('');

    // Ensure value is always an array (handle legacy string data gracefully)
    const safeValue = Array.isArray(value) ? value : [];

    const activePlaylists = playlists.filter(p => p.is_active !== false);

    // Filter logic
    const filtered = activePlaylists.filter(p =>
        p.name?.toLowerCase().includes(filter.toLowerCase())
    );

    const togglePlaylist = (id) => {
        const isSelected = safeValue.includes(id);
        let newValue;
        if (isSelected) {
            newValue = safeValue.filter(v => v !== id);
        } else {
            newValue = [...safeValue, id];
        }
        onChange(newValue);
    };

    const clearSelection = (e) => {
        e.stopPropagation();
        onChange([]);
    };

    // Get selected names for display
    const selectedNames = safeValue.map(id => {
        const p = playlists.find(pl => pl.id === id);
        return p ? p.name : id; // Fallback to ID if name not found
    });

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between h-auto min-h-[40px] px-3 py-2"
                    disabled={disabled}
                >
                    <div className="flex flex-wrap gap-1 items-center text-left">
                        {safeValue.length === 0 ? (
                            <span className="text-muted-foreground font-normal">Select playlists...</span>
                        ) : (
                            selectedNames.map((name, i) => (
                                <Badge key={i} variant="secondary" className="mr-1 mb-1 font-normal text-[10px] h-5 px-1.5 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                                    {name}
                                </Badge>
                            ))
                        )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0 opacity-50 ml-2">
                        {safeValue.length > 0 && (
                            <div
                                role="button"
                                tabIndex={0}
                                className="hover:bg-muted rounded-full p-0.5"
                                onClick={clearSelection}
                            >
                                <X className="h-3 w-3" />
                            </div>
                        )}
                        <ChevronsUpDown className="h-4 w-4" />
                    </div>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
                <div className="p-2 border-b">
                    <Input
                        placeholder="Filter playlists..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="h-8 text-xs"
                    />
                </div>
                <ScrollArea className="h-[200px]">
                    {filtered.length === 0 ? (
                        <div className="p-4 text-center text-xs text-muted-foreground">
                            No playlists found.
                        </div>
                    ) : (
                        <div className="p-1">
                            {filtered.map((playlist) => {
                                const isSelected = safeValue.includes(playlist.id);
                                return (
                                    <div
                                        key={playlist.id}
                                        className={cn(
                                            "flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm cursor-pointer select-none transition-colors",
                                            isSelected ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                                        )}
                                        onClick={() => togglePlaylist(playlist.id)}
                                    >
                                        <div className={cn(
                                            "flex h-4 w-4 items-center justify-center rounded border border-primary/30",
                                            isSelected ? "bg-primary border-primary" : "bg-transparent"
                                        )}>
                                            {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                                        </div>
                                        <div className="flex flex-col flex-1 min-w-0">
                                            <span className="truncate font-medium text-xs">{playlist.name}</span>
                                            {playlist.yt_description && (
                                                <span className="truncate text-[10px] text-muted-foreground">{playlist.yt_description}</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </ScrollArea>
                <div className="p-2 border-t bg-muted/20 flex justify-between items-center">
                    <span className="text-[10px] text-muted-foreground self-center">
                        {safeValue.length} selected
                    </span>
                    <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setOpen(false)}>
                        Done
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
