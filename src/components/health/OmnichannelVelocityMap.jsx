import React, { useState, useMemo } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { TrendingUp, Info } from 'lucide-react';
import { cn } from "@/lib/utils";
import moment from 'moment';
import { PLATFORM_CONFIG } from '@/config/platforms';
import { formatPostId } from '@/utils/postIdFormatter';


export default function OmnichannelVelocityMap({ posts, settings, ideas, timeRange: globalTimeRange }) {
    const [viewMode, setViewMode] = useState('platform'); // 'platform' or 'pillar'
    const [focusedLane, setFocusedLane] = useState('all'); // 'all' or filtering ID
    const [localTimeRange, setLocalTimeRange] = useState(globalTimeRange || 'last30');
    const [activePost, setActivePost] = useState(null); // { post, x, y } for popover

    // Responsive Dimensions
    const containerRef = React.useRef(null);
    const [containerWidth, setContainerWidth] = useState(900);

    // Measure container width
    React.useEffect(() => {
        if (!containerRef.current) return;
        const resizeObserver = new ResizeObserver((entries) => {
            for (let entry of entries) {
                if (entry.contentRect.width > 0) {
                    setContainerWidth(Math.floor(entry.contentRect.width));
                }
            }
        });
        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    // Reset focused lane when view mode changes
    useMemo(() => {
        setFocusedLane('all');
    }, [viewMode]);

    // Filter published posts based on LOCAL timeRange
    const publishedPosts = useMemo(() => {
        const isPublished = (p) => {
            const status = p.status?.toLowerCase();
            return status === 'published' || p.archived === true;
        };

        let filtered = posts.filter(p => isPublished(p) && p.publish_date);

        // NOTE: We do NOT hard-filter by date here anymore for the upper bound.
        // We filter by the "smart window" later, but we need the data first to find the earliest post.
        // However, for performance, we can loosely filter by the MAX possible window (365 days).
        const maxCutoff = moment().subtract(365, 'days').startOf('day');
        filtered = filtered.filter(p => moment(p.publish_date?.toDate?.() || p.publish_date).isSameOrAfter(maxCutoff));

        return filtered.sort((a, b) =>
            moment(a.publish_date?.toDate?.() || a.publish_date).valueOf() -
            moment(b.publish_date?.toDate?.() || b.publish_date).valueOf()
        );
    }, [posts]);

    // Get strategic pillars (not disabled, no '!')
    const strategicPillars = useMemo(() => {
        return settings?.content_pillars?.filter(p => p.active !== false && !p.name.startsWith('!')) || [];
    }, [settings]);

    // Build lane data - Filtered by settings AND focusedLane
    const laneData = useMemo(() => {
        let lanes = [];

        if (viewMode === 'platform') {
            // Only show platforms that are EXPLICITLY enabled in lane_visibility
            let visiblePlatforms = Object.keys(PLATFORM_CONFIG).filter(key => settings?.lane_visibility?.[key] === true);

            // Apply Focus Filter
            if (focusedLane !== 'all') {
                visiblePlatforms = visiblePlatforms.filter(p => p === focusedLane);
            }

            lanes = visiblePlatforms.map(platform => ({
                id: platform,
                label: PLATFORM_CONFIG[platform].label,
                color: PLATFORM_CONFIG[platform].color,
                icon: PLATFORM_CONFIG[platform].icon,
                posts: publishedPosts.filter(p => p.platform === platform)
            }));
        } else {
            // Only show strategic pillars (already filtered in strategicPillars)
            let pillars = strategicPillars;

            // Apply Focus Filter
            if (focusedLane !== 'all') {
                pillars = pillars.filter(p => p.id === focusedLane);
            }

            lanes = pillars.map(pillar => ({
                id: pillar.id,
                label: pillar.name,
                color: pillar.color,
                posts: publishedPosts.filter(p => p.definitive_pillar === pillar.id || p.definitive_pillar === pillar.name)
            }));
        }
        return lanes;
    }, [viewMode, publishedPosts, strategicPillars, settings, focusedLane]);

    // Smart Axis Trimming: Calculate dynamic starting date
    const dateRange = useMemo(() => {
        const end = moment();
        const maxDays = localTimeRange === 'last7' ? 7 : localTimeRange === 'last30' ? 30 : localTimeRange === 'last90' ? 90 : 365;
        const theoreticalStart = moment().subtract(maxDays, 'days');

        // Find earliest post across ALL visible lanes
        let earliestPostDate = moment();
        let hasPosts = false;

        laneData.forEach(lane => {
            lane.posts.forEach(p => {
                const pDate = moment(p.publish_date?.toDate?.() || p.publish_date);
                if (pDate.isBefore(earliestPostDate)) {
                    earliestPostDate = pDate;
                    hasPosts = true;
                }
            });
        });

        // Smart Start: Use EARLIEST data point, but bounded by theoretical start
        let smartStart = theoreticalStart;

        if (hasPosts) {
            // If earliest post is MORE RECENT than theoretical start, use that (zoom in).
            // Add 1 day buffer before the post for aesthetics.
            const bufferedStart = moment(earliestPostDate).subtract(1, 'days').startOf('day');

            if (bufferedStart.isAfter(theoreticalStart)) {
                smartStart = bufferedStart;
            }
        } else {
            // Logic for empty sets: Show partial window or full window?
            // Let's stick to full window if empty to show "nothing happened in last X days"
        }

        return { start: smartStart, end };
    }, [localTimeRange, laneData]);

    // Generate date ticks
    const laneHeight = 60;
    const topMargin = 15;
    const bottomMargin = 35;
    const leftMargin = 180;
    const rightMargin = 40;

    // RESPONSIVE WIDTH CALCULATION:
    // 1. Calculate minimum required width based on days (e.g. 15px per day)
    const totalDays = Math.max(1, dateRange.end.diff(dateRange.start, 'days'));
    const minReadableWidth = leftMargin + rightMargin + (totalDays * 15);

    const dateTicks = useMemo(() => {
        const { start, end } = dateRange;
        const diff = end.diff(start, 'days');
        const ticks = [];
        const plotWidth = Math.max(containerWidth, minReadableWidth) - leftMargin - rightMargin;

        let interval = 1;
        // Basic Logic
        if (diff > 8 && diff <= 31) interval = 5;
        else if (diff > 31 && diff <= 91) interval = 14;
        else if (diff > 91) interval = 30; // Monthly-ish

        // Advanced Logic: Pixel Density Check
        // If 1-day interval creates ticks closer than 50px, bump it up
        if (plotWidth > 0 && diff > 0) {
            const pxPerDay = plotWidth / diff;
            const pxPerTick = pxPerDay * interval;
            if (pxPerTick < 50) {
                // If ticks are too close, double layout interval or force standard steps
                interval = Math.ceil(50 / pxPerDay);
            }
        }

        const current = moment(start);
        while (current.isSameOrBefore(end)) {
            ticks.push(moment(current));
            current.add(interval, 'days');
        }
        return ticks;
    }, [dateRange, containerWidth, minReadableWidth]);

    // Position posts for vertical stacking
    const positionedPosts = useMemo(() => {
        const positioned = [];
        const { start } = dateRange;

        laneData.forEach((lane, laneIndex) => {
            const dateGroups = {};
            lane.posts.forEach(post => {
                const postDate = moment(post.publish_date?.toDate?.() || post.publish_date);

                // IMPORTANT: Filter out posts that fall BEFORE the smart start date!
                // (Since we relaxed the upstream filter, we must filter here for display)
                if (postDate.isBefore(start)) return;

                const dateKey = postDate.format('YYYY-MM-DD');
                if (!dateGroups[dateKey]) dateGroups[dateKey] = [];
                dateGroups[dateKey].push(post);
            });
            Object.values(dateGroups).forEach(group => {
                group.forEach((post, stackIndex) => {
                    const postDate = moment(post.publish_date?.toDate?.() || post.publish_date);
                    const pillar = strategicPillars.find(p => p.id === post.definitive_pillar || p.name === post.definitive_pillar);
                    const platform = PLATFORM_CONFIG[post.platform];

                    // Find corresponding idea for ID formatting
                    const idea = ideas?.find(i => i.id === post.idea_id);
                    const postId = formatPostId(post, idea);

                    const tooltipText = [
                        `${post.post_title || 'Untitled'}`,
                        `Pillar: ${pillar?.name || 'Administrative'}`,
                        `Platform: ${platform?.label || post.platform}`,
                        `${postDate.format('MMM D, YYYY h:mm A')}`
                    ].join('\n');

                    positioned.push({
                        post,
                        postId,
                        laneIndex,
                        stackIndex,
                        date: postDate,
                        tooltipText,
                        color: viewMode === 'platform'
                            ? pillar?.color || '#6B7280'
                            : platform?.color || '#6B7280'
                    });
                });
            });
        });
        return positioned;
    }, [laneData, viewMode, strategicPillars, dateRange, ideas]);

    // Simplified Insights
    const simpleInsights = useMemo(() => {
        // Recalculate based on visible window
        const obs = [];
        const days = Math.max(1, dateRange.end.diff(dateRange.start, 'days'));

        let totalVisiblePosts = 0;
        laneData.forEach(l => {
            // Count only posts in range
            const inRange = l.posts.filter(p => !moment(p.publish_date?.toDate?.() || p.publish_date).isBefore(dateRange.start));
            totalVisiblePosts += inRange.length;
        });

        if (totalVisiblePosts > 0) {
            const velocity = (totalVisiblePosts / days).toFixed(1);
            obs.push({ message: `Current publication velocity: ${velocity} posts/day across the displayed ${days}-day window.` });
        }
        const emptyLanes = laneData.filter(l => {
            const inRange = l.posts.filter(p => !moment(p.publish_date?.toDate?.() || p.publish_date).isBefore(dateRange.start));
            return inRange.length === 0;
        });

        if (emptyLanes.length > 0) {
            obs.push({ message: `The ${emptyLanes[0].label} lane shows 0% activity for this window.` });
        }
        return obs.slice(0, 2);
    }, [laneData, dateRange]);

    // 2. Chart width uses container width, but respects the minimum readability threshold
    const chartWidth = Math.max(containerWidth, minReadableWidth);

    const chartHeight = topMargin + (Math.max(1, laneData.length) * laneHeight) + bottomMargin;
    const plotWidth = chartWidth - leftMargin - rightMargin;

    const handleDotInteraction = (item, x, y, isClick = false) => {
        if (isClick) {
            setActivePost(activePost?.post?.id === item.post.id ? null : { ...item, x, y });
        } else {
            setActivePost({ ...item, x, y });
        }
    };

    // Helper options for Focus dropdown
    const focusOptions = useMemo(() => {
        if (viewMode === 'platform') {
            const visibleKeys = Object.keys(PLATFORM_CONFIG).filter(key => settings?.lane_visibility?.[key] === true);
            return visibleKeys.map(k => ({ value: k, label: PLATFORM_CONFIG[k].label }));
        } else {
            return strategicPillars.map(p => ({ value: p.id, label: p.name }));
        }
    }, [viewMode, settings, strategicPillars]);

    return (
        <Card className="glass-panel border-blue-500/20 bg-slate-950/40 p-3 pt-4">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-2 gap-4 px-1">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                        <TrendingUp className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black uppercase tracking-tight">Omnichannel Velocity Map</h2>
                        <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-black opacity-70">Tracking publication rhythm and platform distribution</p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-end md:items-center gap-3">
                    {/* FILTER GROUP */}
                    <div className="flex items-center gap-4">
                        {/* LANE FOCUS FILTER */}
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-black uppercase text-muted-foreground">Focus:</span>
                            <Select value={focusedLane} onValueChange={setFocusedLane}>
                                <SelectTrigger className="w-[140px] bg-slate-900/50 border-border text-[11px] font-black uppercase h-8 truncate">
                                    <SelectValue placeholder="All Lanes" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All {viewMode === 'platform' ? 'Platforms' : 'Pillars'}</SelectItem>
                                    {focusOptions.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="h-4 w-px bg-white/10" />

                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-black uppercase text-muted-foreground">Window:</span>
                            <Select value={localTimeRange} onValueChange={setLocalTimeRange}>
                                <SelectTrigger className="w-[120px] bg-slate-900/50 border-border text-[11px] font-black uppercase h-8">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="last7">7 Days</SelectItem>
                                    <SelectItem value="last30">30 Days</SelectItem>
                                    <SelectItem value="last90">90 Days</SelectItem>
                                    <SelectItem value="all">All Time</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* VIEW SWITCHER - New Line on Mobile */}
                    <div className="flex bg-slate-900/50 p-1 rounded-xl border border-white/5 w-full md:w-auto">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewMode('platform')}
                            className={cn(
                                "text-[9px] uppercase font-black px-3 h-10 tracking-tight flex flex-col items-center justify-center leading-[1.1] flex-1 md:flex-none",
                                viewMode === 'platform' ? "bg-blue-600 text-white" : "text-muted-foreground"
                            )}
                        >
                            <span>View By</span>
                            <span>Platform</span>
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewMode('pillar')}
                            className={cn(
                                "text-[9px] uppercase font-black px-3 h-10 tracking-tight flex flex-col items-center justify-center leading-[1.1] flex-1 md:flex-none",
                                viewMode === 'pillar' ? "bg-blue-600 text-white" : "text-muted-foreground"
                            )}
                        >
                            <span>View By</span>
                            <span>Pillar</span>
                        </Button>
                    </div>
                </div>
            </div>

            <div className="relative overflow-x-auto pt-2 pb-2 custom-scrollbar" ref={containerRef}>
                <svg
                    width={chartWidth}
                    height={chartHeight}
                    className="mx-auto"
                    onClick={() => setActivePost(null)}
                >
                    {laneData.map((lane, index) => {
                        return (
                            <g key={lane.id} className="group/lane">
                                <rect x={0} y={topMargin + index * laneHeight} width={chartWidth} height={laneHeight} fill={lane.color} opacity={0.08} />

                                <foreignObject
                                    x={10}
                                    y={topMargin + index * laneHeight}
                                    width={leftMargin - 20}
                                    height={laneHeight}
                                >
                                    <div className="h-full flex items-center gap-2.5 pr-4 pointer-events-none">
                                        {lane.icon && (
                                            <div className="shrink-0 flex items-center justify-center w-5">
                                                <lane.icon size={18} style={{ color: lane.color }} />
                                            </div>
                                        )}
                                        <div
                                            className="text-[11px] font-bold text-slate-400 leading-[1.2] line-clamp-2 select-none"
                                            title={lane.label}
                                        >
                                            {lane.label}
                                        </div>
                                    </div>
                                </foreignObject>

                                <line x1={leftMargin} y1={topMargin + (index + 1) * laneHeight} x2={chartWidth - rightMargin} y2={topMargin + (index + 1) * laneHeight} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                            </g>
                        );
                    })}
                    {dateTicks.map((tick, i) => {
                        const totalDays = dateRange.end.diff(dateRange.start, 'days') || 1;
                        const xPos = leftMargin + (tick.diff(dateRange.start, 'days') / totalDays) * plotWidth;
                        return (
                            <g key={i}>
                                <line x1={xPos} y1={topMargin} x2={xPos} y2={chartHeight - bottomMargin} stroke="rgba(255,255,255,0.05)" strokeDasharray="4,4" />
                                <text x={xPos} y={chartHeight - bottomMargin + 18} fill="rgba(255,255,255,0.5)" fontSize="11" fontWeight="900" textAnchor="middle">
                                    {tick.format('MMM D')}
                                </text>
                            </g>
                        );
                    })}
                    {positionedPosts.map((item, i) => {
                        const totalDays = dateRange.end.diff(dateRange.start, 'days') || 1;
                        const xPos = leftMargin + (item.date.diff(dateRange.start, 'days') / totalDays) * plotWidth;
                        const yPos = topMargin + item.laneIndex * laneHeight + laneHeight / 2 - 8 + (item.stackIndex * 12);

                        return (
                            <g
                                key={i}
                                className="cursor-pointer"
                                onMouseEnter={() => handleDotInteraction(item, xPos, yPos)}
                                onMouseLeave={() => setActivePost(null)}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDotInteraction(item, xPos, yPos, true);
                                }}
                            >
                                {/* Invisible larger hit area for mobile */}
                                <circle cx={xPos} cy={yPos} r="15" fill="transparent" />
                                {/* Visible dot */}
                                <circle cx={xPos} cy={yPos} r="5" fill={item.color} stroke="rgba(0,0,0,0.5)" strokeWidth="1" />
                            </g>
                        );
                    })}
                </svg>

                {/* Styled Absolute Popover */}
                {activePost && (() => {
                    const isFlipped = activePost.y < 160; // Flip down if dot is too high

                    // Horizontal clamping logic
                    const popoverWidth = 200; // Expected min-width
                    const halfWidth = popoverWidth / 2;
                    let horizontalOffset = 0;

                    // Check right boundary
                    if (activePost.x + halfWidth > chartWidth - 20) {
                        horizontalOffset = (chartWidth - 20) - (activePost.x + halfWidth);
                    }
                    // Check left boundary (considering the labels on the left)
                    if (activePost.x - halfWidth < leftMargin) {
                        horizontalOffset = leftMargin - (activePost.x - halfWidth);
                    }

                    return (
                        <div
                            className="absolute z-50 pointer-events-none bg-slate-900/95 backdrop-blur-md border border-white/10 p-3 rounded-lg shadow-2xl min-w-[200px]"
                            style={{
                                left: activePost.x + horizontalOffset,
                                top: isFlipped ? activePost.y + 12 : activePost.y - 12,
                                transform: isFlipped ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
                                marginTop: isFlipped ? '12px' : '-8px',
                                transition: 'all 0.2s ease-out'
                            }}
                        >
                            <div className="flex flex-col gap-1">
                                {activePost.postId && (
                                    <div className="text-[9px] font-black text-blue-400 uppercase tracking-[0.15em] mb-0.5">
                                        {activePost.postId}
                                    </div>
                                )}
                                <h4 className="text-[11px] font-black uppercase text-white leading-tight mb-1">
                                    {activePost.post.post_title || 'Untitled Post'}
                                </h4>
                                <div className="space-y-0.5 mt-1 border-t border-white/5 pt-1">
                                    <p className="text-[9px] font-bold text-muted-foreground uppercase flex justify-between">
                                        <span>Pillar:</span>
                                        <span className="text-white/70 italic text-right max-w-[120px] truncate">{activePost.tooltipText.split('\n')[1].replace('Pillar: ', '')}</span>
                                    </p>
                                    <p className="text-[9px] font-bold text-muted-foreground uppercase flex justify-between">
                                        <span>Platform:</span>
                                        <span className="text-white/70">{activePost.tooltipText.split('\n')[2].replace('Platform: ', '')}</span>
                                    </p>
                                    <p className="text-[9px] font-black text-blue-400 uppercase mt-1">
                                        {activePost.tooltipText.split('\n')[3]}
                                    </p>
                                </div>
                            </div>
                            {/* Little triangle arrow - slides to follow the dot */}
                            <div
                                className={cn(
                                    "absolute w-2 h-2 bg-slate-900 border-white/10 rotate-45",
                                    isFlipped
                                        ? "-top-1 border-l border-t"
                                        : "-bottom-1 border-r border-b"
                                )}
                                style={{
                                    left: `calc(50% - ${horizontalOffset}px)`,
                                    transform: 'translateX(-50%) rotate(45deg)'
                                }}
                            />
                        </div>
                    );
                })()}
            </div>

            <div className="mt-4 pt-4 border-t border-white/5">
                <div className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-3 px-1">Legend:</div>
                <div className="flex flex-wrap gap-4">
                    {viewMode === 'platform' ? (
                        strategicPillars.filter(p => p.active !== false).map(pillar => (
                            <div key={pillar.id} className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded shadow-sm" style={{ backgroundColor: pillar.color }} />
                                <span className="text-[11px] font-bold uppercase text-muted-foreground tracking-tight">{pillar.name}</span>
                            </div>
                        ))
                    ) : (
                        Object.keys(PLATFORM_CONFIG).filter(k => settings?.lane_visibility?.[k] === true).map(k => {
                            const platform = PLATFORM_CONFIG[k];
                            const Icon = platform.icon;
                            return (
                                <div key={k} className="flex items-center gap-2">
                                    <div className="w-5 h-5 flex items-center justify-center">
                                        <Icon size={16} style={{ color: platform.color }} />
                                    </div>
                                    <span className="text-[11px] font-bold uppercase text-muted-foreground tracking-tight">{platform.label}</span>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-5 mt-6">
                <div className="flex items-center gap-2 mb-3">
                    <Info className="w-4 h-4 text-blue-400" />
                    <h3 className="text-[11px] font-black uppercase tracking-widest">Strategic Observer Insights</h3>
                </div>
                <div className="space-y-2">
                    {simpleInsights.map((ins, i) => (
                        <div key={i} className="flex items-start gap-2 text-[12px] font-bold text-muted-foreground leading-relaxed">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                            {ins.message}
                        </div>
                    ))}
                </div>
            </div>
        </Card>
    );
}
