import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Archive, RotateCcw, Calendar as CalendarIcon, Loader2, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
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
import { toast } from 'sonner';
import { format, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { cn } from "@/lib/utils";

export default function ArchiveResetModal({ open, onClose, posts, updatePost }) {
    const [isRestoreMode, setIsRestoreMode] = useState(false);
    const [isActioning, setIsActioning] = useState(false);
    const [fromDate, setFromDate] = useState(null);
    const [toDate, setToDate] = useState(null);
    const [fromOpen, setFromOpen] = useState(false);
    const [toOpen, setToOpen] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    // Reset state when modal opens
    useEffect(() => {
        if (open) {
            setFromDate(null);
            setToDate(null);
            setIsActioning(false);
            setIsRestoreMode(false);
        }
    }, [open]);

    const getPostDate = (post) => {
        if (!post.publish_date) return null;
        if (post.publish_date.seconds) return new Date(post.publish_date.seconds * 1000);
        return new Date(post.publish_date);
    };

    // Total counts for UI badges
    const totalPublishedCount = posts.filter(p => p.status === 'published' && !p.archived && !p.platform_fields?.archived).length;
    const totalArchivedCount = posts.filter(p => p.archived === true || p.platform_fields?.archived === true).length;

    // Filter Logic: targetPosts handles both Archive and Restore modes
    const targetPosts = posts.filter(post => {
        const date = getPostDate(post);
        if (!date) return false;

        // If NO dates selected, we return empty list (User MUST pick a range)
        if (!fromDate || !toDate) return false;

        const start = startOfDay(fromDate);
        const end = endOfDay(toDate);

        // Check if post date is within the selected range (inclusive)
        const inRange = !isBefore(date, start) && !isAfter(date, end);

        if (isRestoreMode) {
            // RESTORE MODE: Find archived posts in range (Checking both locations to heal legacy data)
            return (post.archived === true || post.platform_fields?.archived === true) && inRange;
        } else {
            // ARCHIVE MODE: Find published, unarchived posts in range
            return post.status === 'published' && !post.archived && !post.platform_fields?.archived && inRange;
        }
    });

    // Stragglers logic (only for Archive Mode suggestions)
    const stragglers = posts.filter(post => {
        if (post.status !== 'published' || post.archived === true) return false;
        const date = getPostDate(post);
        if (!date) return false;
        return isBefore(date, startOfDay(new Date()));
    });

    const handleAction = async () => {
        if (targetPosts.length === 0) return;

        setIsActioning(true);
        try {
            // Process ALL target posts
            const updates = targetPosts.map(post => {
                return updatePost(post.id, {
                    archived: !isRestoreMode // True if archiving, False if restoring
                });
            });

            await Promise.all(updates);

            toast.success(isRestoreMode ? "Posts Restored" : "Posts Archived", {
                description: `Successfully ${isRestoreMode ? "restored" : "archived"} ${targetPosts.length} posts.`
            });

            // Close modal after success
            onClose();
        } catch (error) {
            console.error("Batch action error:", error);
            toast.error("Action Failed", { description: "Could not complete the operation." });
        } finally {
            setIsActioning(false);
        }
    };

    const handleArchiveStragglers = async () => {
        if (stragglers.length === 0) return;
        setShowConfirm(true);
    };

    const confirmArchiveStragglers = async () => {
        setShowConfirm(false);

        setIsActioning(true);
        try {
            const updates = stragglers.map(post => {
                return updatePost(post.id, {
                    archived: true
                });
            });
            await Promise.all(updates);
            toast.success("Past Posts Archived", { description: `Cleaned up ${stragglers.length} past posts.` });
            onClose();
        } catch (error) {
            toast.error("Failed to Archive", { description: error.message });
        } finally {
            setIsActioning(false);
        }
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onClose}>
                <DialogContent className="glass-panel border-white/10 bg-[#0A0A0A] text-white max-w-xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <Archive className="w-5 h-5 text-purple-400" />
                            Manage Archive
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6 mt-2">
                        {/* ACTION MODE SELECTION */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between px-1">
                                <span className="text-sm font-medium text-gray-400">Action Mode</span>
                            </div>
                            <Tabs
                                value={isRestoreMode ? "restore" : "archive"}
                                onValueChange={(val) => setIsRestoreMode(val === "restore")}
                                className="w-full"
                            >
                                <TabsList className="w-full grid grid-cols-2 bg-white/5 border border-white/10 h-11 p-1">
                                    <TabsTrigger
                                        value="archive"
                                        className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300 data-[state=active]:border-purple-500/20 data-[state=active]:border text-xs gap-2"
                                    >
                                        <Archive className="w-3.5 h-3.5" />
                                        Archive Posts
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="restore"
                                        className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300 data-[state=active]:border-emerald-500/20 data-[state=active]:border text-xs gap-2"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                        Restore Archive
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>

                            {/* MODE DESCRIPTION */}
                            <div className={cn(
                                "p-3 rounded-lg border text-xs leading-relaxed transition-colors",
                                isRestoreMode
                                    ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-100/70"
                                    : "bg-purple-500/5 border-purple-500/10 text-purple-100/70"
                            )}>
                                {isRestoreMode
                                    ? "Choose a date range to find and restore previously archived posts. This will make them visible again in all views without changing their original status or date."
                                    : "Select a date range to hide published posts from your main views. Archived posts are kept in the system but won't appear in the Horizon or Studio feeds."}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-gray-400">
                                    {isRestoreMode
                                        ? "Select range to restore archived posts"
                                        : "Archive published posts within the date range"}
                                </p>
                                <div className={`px-2 py-0.5 rounded border text-[10px] font-medium ${isRestoreMode ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-purple-500/30 bg-purple-500/10 text-purple-300"}`}>
                                    {isRestoreMode ? `${totalArchivedCount} Archived Total` : `${totalPublishedCount} Active Published`}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs text-gray-500 font-medium ml-1">From Date</label>
                                    <Popover open={fromOpen} onOpenChange={setFromOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-full justify-start text-left font-normal bg-black/20 border-white/10 text-xs h-10 hover:bg-white/5 hover:text-white",
                                                    !fromDate && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                                                {fromDate ? format(fromDate, "PPP") : <span className="text-gray-600">Pick start date</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 bg-[#111] border-white/10" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={fromDate}
                                                onSelect={(d) => { setFromDate(d); setFromOpen(false); }}
                                                initialFocus
                                                disabled={(date) => date < new Date("1900-01-01")}
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
                                <div className="space-y-1.5">
                                    <label className="text-xs text-gray-500 font-medium ml-1">To Date</label>
                                    <Popover open={toOpen} onOpenChange={setToOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-full justify-start text-left font-normal bg-black/20 border-white/10 text-xs h-10 hover:bg-white/5 hover:text-white",
                                                    !toDate && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                                                {toDate ? format(toDate, "PPP") : <span className="text-gray-600">Pick end date</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 bg-[#111] border-white/10" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={toDate}
                                                onSelect={(d) => { setToDate(d); setToOpen(false); }}
                                                initialFocus
                                                disabled={(date) =>
                                                    date < new Date("1900-01-01") ||
                                                    (fromDate && isBefore(date, startOfDay(fromDate)))
                                                }
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
                                                    nav_button_previous: "absolute left-1 !text-white hover:text-white opacity-70 hover:!opacity-100",
                                                    nav_button_next: "absolute right-1 !text-white hover:text-white opacity-70 hover:!opacity-100",
                                                    head_cell: "text-muted-foreground w-9 font-normal text-[0.8rem]",
                                                    cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-purple-600/20 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                                                }}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>
                        </div>

                        {/* CLEAN UP STRAGGLERS SECTION */}
                        {stragglers.length > 0 && !isRestoreMode ? (
                            <div className="flex items-center justify-between p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-amber-400" />
                                        <span className="text-sm font-medium text-amber-100">Clean Up Past Posts</span>
                                    </div>
                                    <p className="text-[11px] text-amber-200/60 leading-tight">
                                        You have <strong className="text-amber-200">{stragglers.length}</strong> published posts from before today that are not archived.
                                    </p>
                                </div>
                                <Button
                                    size="sm"
                                    onClick={handleArchiveStragglers}
                                    disabled={isActioning}
                                    className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white border-0"
                                >
                                    {isActioning ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                                    Archive All Past
                                </Button>
                            </div>
                        ) : null}

                        {stragglers.length === 0 && !isRestoreMode && (
                            <div className="flex items-center justify-center p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-lg text-emerald-400/50 text-xs italic">
                                <Sparkles className="w-3 h-3 mr-2 opacity-50" />
                                All past published posts are archived! No stragglers found.
                            </div>
                        )}
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0 mt-4">
                        <Button variant="ghost" onClick={onClose} disabled={isActioning} className="h-11">
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAction}
                            disabled={
                                !fromDate ||
                                !toDate ||
                                isAfter(startOfDay(fromDate), endOfDay(toDate)) ||
                                targetPosts.length === 0 ||
                                isActioning
                            }
                            className={cn(
                                "border-none h-11 px-8 text-white transition-colors",
                                isRestoreMode
                                    ? "bg-emerald-600 hover:bg-emerald-700"
                                    : "bg-[#8B5CF6] hover:bg-[#7C3AED]"
                            )}
                        >
                            {isActioning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            {(!fromDate || !toDate)
                                ? "Select Date Range"
                                : isRestoreMode
                                    ? `Restore (${targetPosts.length})`
                                    : `Archive (${targetPosts.length})`
                            }
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
                <AlertDialogContent className="glass-panel border-white/10 bg-[#0A0A0A] text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Archive All Past Posts?</AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-400">
                            You have {stragglers.length} published posts from before today that are not archived.
                            Archiving them will hide them from the Horizon and Studio views. This action is bulk and intended for cleaning up your history.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmArchiveStragglers}
                            className="bg-amber-600 hover:bg-amber-700 text-white border-none"
                        >
                            Yes, Archive ({stragglers.length})
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
