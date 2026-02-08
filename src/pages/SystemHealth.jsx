import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ActivitySquare,
    Target,
    Info,
    Loader2,
    TrendingUp,
    HeartPulse,
    ShieldCheck,
    Zap,
    Clock,
    AlertTriangle,
    Lightbulb
} from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    ResponsiveContainer,
    Cell
} from 'recharts';
import moment from 'moment';
import { cn } from "@/lib/utils";

// Components
import OmnichannelVelocityMap from '@/components/health/OmnichannelVelocityMap';
import IdeaEditorModal from '@/components/vault/IdeaEditorModal';
import PostEditorModal from '@/components/studio/PostEditorModal';

// Hooks
import { usePosts } from '../hooks/usePosts';
import { useSettings } from '../hooks/useSettings';
import { useAllocationData } from '../hooks/useAllocationData';
import { useIdeas } from '../hooks/useIdeas';

import { PLATFORM_CONFIG } from '../config/platforms';
import { formatPostId } from '../utils/postIdFormatter';

const PillarLabel = (props) => {
    const { x, y, width, value, index, pillars } = props;
    const entry = pillars[index];
    if (!entry) return null;

    return (
        <g>
            <text x={x + width / 2} y={y - 21} fill="#fff" fontSize={11} fontWeight="bold" textAnchor="middle">
                {`${value}%`}
            </text>
            {entry.pillarCount > 0 && (
                <text x={x + width / 2} y={y - 8} fill="rgba(255,255,255,0.5)" fontSize={10} fontWeight="black" textAnchor="middle">
                    {`(${entry.pillarCount})`}
                </text>
            )}
        </g>
    );
};

export default function SystemHealth() {
    const { posts, loading: postsLoading, updatePost } = usePosts();
    const { settings, loading: settingsLoading } = useSettings();
    const { sets, targets, loading: allocLoading } = useAllocationData();
    const { ideas, loading: ideasLoading, updateIdea } = useIdeas();
    const navigate = useNavigate();

    const [timeRange, setTimeRange] = useState('last30');
    const [hoveredPillar, setHoveredPillar] = useState(null);

    // Incubation Audit State
    const [dormancyThreshold, setDormancyThreshold] = useState('30');

    // Editor State
    const [editorOpen, setEditorOpen] = useState(false);
    const [editingIdea, setEditingIdea] = useState(null);

    // Post Editor State
    const [postEditorOpen, setPostEditorOpen] = useState(false);
    const [editingPost, setEditingPost] = useState(null);

    const handleSaveIdea = async (updatedData) => {
        if (editingIdea) {
            await updateIdea(editingIdea.id, updatedData);
            setEditorOpen(false);
            setEditingIdea(null);
        }
    };

    const handleSavePost = async (updatedData) => {
        if (editingPost) {
            await updatePost(editingPost.id, updatedData);
            setPostEditorOpen(false);
            setEditingPost(null);
        }
    };

    // Calculate pillar alignment data (Report 1)
    const alignmentData = useMemo(() => {
        if (!settings?.content_pillars || !sets || !targets || postsLoading) return null;

        const activeSet = sets.find(s => s.is_active);
        if (!activeSet) return null;

        const normalizeDate = (val) => {
            if (!val) return null;
            return moment(val?.toDate?.() || val);
        };

        const isPublished = (p) => {
            const status = p.status?.toLowerCase();
            return status === 'published' || p.archived === true;
        };

        const matchesPillar = (post, pillar) => {
            const pVal = post.definitive_pillar;
            if (!pVal) return false;
            return pVal === pillar.id || pVal === pillar.name;
        };

        let filteredPosts = posts.filter(p => isPublished(p));

        if (timeRange === 'last7') {
            const cutoff = moment().subtract(7, 'days').startOf('day');
            filteredPosts = filteredPosts.filter(p => normalizeDate(p.publish_date)?.isSameOrAfter(cutoff));
        } else if (timeRange === 'last30') {
            const cutoff = moment().subtract(30, 'days').startOf('day');
            filteredPosts = filteredPosts.filter(p => normalizeDate(p.publish_date)?.isSameOrAfter(cutoff));
        } else if (timeRange === 'last90') {
            const cutoff = moment().subtract(90, 'days').startOf('day');
            filteredPosts = filteredPosts.filter(p => normalizeDate(p.publish_date)?.isSameOrAfter(cutoff));
        }

        const totalPublished = filteredPosts.length;
        const strategicPillars = settings.content_pillars.filter(p => !p.disabled && !p.name.startsWith('!'));

        const processedData = strategicPillars.map((pillar, index) => {
            const targetDocId = `${activeSet.id}_${pillar.id}`;
            const targetPercent = targets[targetDocId]?.target_percentage || 0;
            const pillarPosts = filteredPosts.filter(p => matchesPillar(p, pillar));
            const actualPercent = totalPublished > 0 ? (pillarPosts.length / totalPublished) * 100 : 0;

            return {
                name: pillar.name,
                pillarNumber: index + 1,
                color: pillar.color,
                target: Math.round(targetPercent),
                actual: Math.round(actualPercent),
                pillarCount: pillarPosts.length,
                variance: targetPercent - actualPercent
            };
        });

        return { pillars: processedData, activeSet, totalPublished };
    }, [posts, settings, sets, targets, timeRange, postsLoading]);

    // Calculate Dynamic Production Audit data (Report 3)
    const productionAuditData = useMemo(() => {
        if (!settings?.content_pillars || postsLoading) return null;
        const strategicPillars = settings.content_pillars.filter(p => !p.disabled && !p.name.startsWith('!'));

        return strategicPillars.map(pillar => {
            const pillarPosts = posts.filter(p => {
                const status = p.status?.toLowerCase();
                const isPublishedFlag = status === 'published' || p.archived === true;
                const pVal = p.definitive_pillar;
                const isPillarMatch = pVal === pillar.id || pVal === pillar.name;
                return isPublishedFlag && isPillarMatch;
            });
            const lastPublishedPost = [...pillarPosts].sort((a, b) => {
                const dateA = a.publish_date?.toDate?.() || a.publish_date;
                const dateB = b.publish_date?.toDate?.() || b.publish_date;
                return moment(dateB).valueOf() - moment(dateA).valueOf();
            })[0];

            const lastDate = lastPublishedPost ? moment(lastPublishedPost.publish_date?.toDate?.() || lastPublishedPost.publish_date) : null;
            const lastPostTitle = lastPublishedPost ? lastPublishedPost.post_title : null;
            const lastPostPlatform = lastPublishedPost ? lastPublishedPost.platform : null;

            // Format ID for display
            let lastPostIdDisplay = null;
            if (lastPublishedPost) {
                const parentIdea = ideas?.find(i => i.id === lastPublishedPost.idea_id);
                lastPostIdDisplay = formatPostId(lastPublishedPost, parentIdea) || `#POST-${lastPublishedPost.id.substring(0, 4).toUpperCase()}`;
            }

            let status = 'neglected', statusColor = 'text-red-400', badge = 'Neglected';

            if (lastDate) {
                const days = moment().diff(lastDate, 'days');
                if (days <= 14) { status = 'fresh'; statusColor = 'text-emerald-400'; badge = 'Fresh'; }
                else if (days <= 30) { status = 'stale'; statusColor = 'text-amber-400'; badge = 'Stale'; }
            }

            return {
                ...pillar,
                lastDate,
                lastPostTitle,
                lastPostPlatform,
                lastPostFull: lastPublishedPost, // Pass full object for flexibility
                lastPostIdDisplay, // Pass correctly formatted ID
                status,
                statusColor,
                badge,
                count: pillarPosts.length
            };
        });
    }, [posts, settings, ideas, postsLoading, ideasLoading]);

    // Calculate stale incubating ideas (Report 4)
    const staleIdeas = useMemo(() => {
        if (!ideas || ideasLoading) return [];

        const thresholdDays = parseInt(dormancyThreshold, 10);
        const cutoffDate = moment().subtract(thresholdDays, 'days');

        const filtered = ideas.filter(idea => {
            if (idea.status !== 'incubating') return false;

            // Check modification date first, fallback to creation date
            const lastActivity = idea.updated_at?.toDate?.() || idea.created_at?.toDate?.() || idea.updated_at || idea.created_at;
            if (!lastActivity) return false;

            return moment(lastActivity).isBefore(cutoffDate);
        }).sort((a, b) => {
            // Sort by oldest activity first (most neglected)
            const dateA = a.updated_at?.toDate?.() || a.created_at?.toDate?.() || a.updated_at || a.created_at;
            const dateB = b.updated_at?.toDate?.() || b.created_at?.toDate?.() || b.updated_at || b.created_at;
            return moment(dateA).valueOf() - moment(dateB).valueOf();
        });

        return filtered;
    }, [ideas, dormancyThreshold, ideasLoading, settings]);

    // Calculate overdue scheduled posts (Report 5)
    const overduePosts = useMemo(() => {
        if (!posts || postsLoading) return [];
        const now = moment();

        const filtered = posts.filter(post => {
            if (post.status !== 'scheduled') return false;
            const pubDate = post.publish_date?.toDate?.() || post.publish_date;
            if (!pubDate) return false;
            return moment(pubDate).isBefore(now);
        }).sort((a, b) => {
            const dateA = a.publish_date?.toDate?.() || a.publish_date;
            const dateB = b.publish_date?.toDate?.() || b.publish_date;
            return moment(dateA).valueOf() - moment(dateB).valueOf(); // Oldest first
        });

        return filtered;

    }, [posts, postsLoading, settings]);

    const loading = postsLoading || settingsLoading || allocLoading || ideasLoading;

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground animate-pulse uppercase tracking-[0.2em] font-black">Scanning System Vitality</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full space-y-8 overflow-y-auto pb-12 custom-scrollbar">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2 pt-2">
                <div>
                    <h1 className="text-xl md:text-3xl font-bold tracking-tight mb-1 flex items-center gap-2">
                        <ActivitySquare className="text-primary w-6 h-6 md:w-8 md:h-8" />
                        System Health
                    </h1>
                    <p className="text-muted-foreground hidden md:block">Monitor workflow health and content alignment.</p>
                </div>
            </header>

            {/* Main Reports Grid */}
            <div className="grid grid-cols-1 gap-8 px-2">
                {/* Report 1: Pillar Alignment Tracker */}
                <Card className="bg-slate-950/40 border-border p-4 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-all duration-700 rotate-12">
                        <Target className="w-32 h-32" />
                    </div>

                    <div className="flex items-center justify-between gap-3 mb-6 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-violet-500/10 rounded-lg">
                                <Target className="w-5 h-5 text-violet-400" />
                            </div>
                            <div className="flex flex-col">
                                <h2 className="text-lg font-black uppercase tracking-tight">
                                    Pillar Alignment Tracker
                                </h2>
                                {alignmentData?.totalPublished > 0 && (
                                    <span className="text-[11px] font-black text-blue-400/80 uppercase tracking-widest mt-0.5">
                                        ({alignmentData.totalPublished} Posts Totaled)
                                    </span>
                                )}
                                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-1">
                                    Strategic adherence vs. {alignmentData?.activeSet?.set_name || 'Active Mode'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Strategic Window:</span>
                            <Select value={timeRange} onValueChange={setTimeRange}>
                                <SelectTrigger className="w-[140px] bg-slate-900/50 border-border text-xs font-bold uppercase h-9">
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

                    {alignmentData?.pillars.length > 0 ? (
                        <div className="space-y-6 relative z-10 select-none">
                            <div className="h-[320px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={alignmentData.pillars}
                                        margin={{ top: 40, right: 30, left: 0, bottom: 10 }}
                                        barGap={8}
                                        className="outline-none"
                                        style={{ outline: 'none' }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                        <XAxis
                                            dataKey="pillarNumber"
                                            type="category"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={(props) => {
                                                const { x, y, payload, width: axisWidth } = props;
                                                const entry = alignmentData.pillars.find(p => p.pillarNumber === payload.value);
                                                if (!entry) return null;

                                                // Precise geometry calculation
                                                const pillarCount = alignmentData.pillars.length;
                                                const gap = 4;
                                                // Use axisWidth (total width of the axis) to calculate slot width
                                                // We subtract margins to match the BarChart coordinate system
                                                const chartMarginLeft = 0;
                                                const chartMarginRight = 30;
                                                const effectiveWidth = axisWidth - chartMarginLeft - chartMarginRight;
                                                const slotWidth = effectiveWidth / pillarCount;

                                                const rectWidth = slotWidth - (gap * 2);
                                                const xOffset = -(rectWidth / 2);

                                                return (
                                                    <g transform={`translate(${x},${y})`}>
                                                        <rect
                                                            x={xOffset}
                                                            y={8}
                                                            width={rectWidth}
                                                            height={4}
                                                            fill={entry.color}
                                                            rx={2}
                                                        />
                                                        <text
                                                            x={0}
                                                            y={28}
                                                            fill="rgba(255,255,255,0.4)"
                                                            fontSize={11}
                                                            fontWeight="black"
                                                            textAnchor="middle"
                                                        >
                                                            {payload.value}
                                                        </text>
                                                    </g>
                                                );
                                            }}
                                            height={40}
                                        />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} label={{ value: 'Volume %', angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.3)', fontSize: 10, offset: 10 }} />
                                        <Bar dataKey="target" name="Strategic Target" radius={[4, 4, 0, 0]} label={{ position: 'top', fill: 'rgba(255,255,255,0.4)', fontSize: 10, offset: 5, formatter: (val) => `${val}%` }}>
                                            {alignmentData.pillars.map((entry, index) => <Cell key={`target-${index}`} fill="rgba(255,255,255,0.1)" />)}
                                        </Bar>
                                        <Bar
                                            dataKey="actual"
                                            name="Actual Output"
                                            radius={[4, 4, 0, 0]}
                                            label={<PillarLabel pillars={alignmentData.pillars} />}
                                        >
                                            {alignmentData.pillars.map((entry, index) => <Cell key={`actual-${index}`} fill={entry.color} />)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Legend Area - Normalized with Velocity Map */}
                            <div className="pt-4 border-t border-white/5 relative z-10 space-y-5">
                                {/* Primary Category Indicator */}
                                <div className="flex items-center gap-3">
                                    <div className="w-5 h-5 rounded bg-white/10" />
                                    <div className="flex flex-col">
                                        <span className="text-[12px] font-black uppercase text-white/90 leading-none mb-1">Strategic Target</span>
                                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest opacity-60">Goal allocation %</span>
                                    </div>
                                </div>

                                {/* Pillar Grid - Matching Velocity Map Aesthetic */}
                                <div className="flex flex-wrap gap-x-8 gap-y-3">
                                    {alignmentData.pillars.map(pillar => (
                                        <div key={pillar.pillarNumber} className="flex items-center gap-2">
                                            <div className="w-4 h-4 rounded shadow-sm shrink-0" style={{ backgroundColor: pillar.color }} />
                                            <div className="flex items-center text-[11px] font-bold uppercase text-muted-foreground tracking-tight">
                                                <span className="text-white/20 mr-1.5 font-black">#{pillar.pillarNumber}</span>
                                                <span className="leading-none">{pillar.name}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-4 mt-6">
                                <div className="flex items-center gap-2 mb-3">
                                    <Target className="w-5 h-5 text-violet-400" />
                                    <h3 className="text-xs font-black uppercase tracking-widest">Strategic Observer Insights</h3>
                                </div>
                                <div className="space-y-4">
                                    {alignmentData.pillars.some(p => p.variance > 5) && (
                                        <div>
                                            <div className="bg-amber-500/20 text-amber-500 text-[11px] font-black px-3 py-1 rounded-md uppercase w-fit mb-3 tracking-wider">Priority Focus</div>
                                            <p className="text-[12px] font-bold text-muted-foreground leading-relaxed">
                                                These pillars are under-represented compared to your <span className="text-white font-black">{alignmentData.activeSet.set_name}</span> goals:
                                                <span className="text-amber-200/90 block mt-1 font-bold tracking-tight text-[12px] italic">
                                                    {alignmentData.pillars.filter(p => p.variance > 5).map(p => p.name).join(', ')}
                                                </span>
                                            </p>
                                        </div>
                                    )}
                                    {alignmentData.pillars.some(p => p.variance < -5) && (
                                        <div className="pt-4 border-t border-white/5">
                                            <div className="bg-blue-500/20 text-blue-400 text-[11px] font-black px-3 py-1 rounded-md uppercase w-fit mb-3 tracking-wider">Overshadowing</div>
                                            <p className="text-[12px] font-bold text-muted-foreground leading-relaxed">
                                                These areas are exceeding their planned allocation. Consider adjusting focus:
                                                <span className="text-blue-300/90 block mt-1 font-bold tracking-tight text-[12px] italic">
                                                    {alignmentData.pillars.filter(p => p.variance < -5).map(p => p.name).join(', ')}
                                                </span>
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-white/5 rounded-2xl">
                            <TrendingUp className="w-12 h-12 text-muted-foreground mb-4 opacity-10" />
                            <p className="text-xs text-muted-foreground uppercase tracking-[0.2em] font-black opacity-50">Insufficient Data for Strategic Analysis</p>
                        </div>
                    )}
                </Card>

                {/* Report 2: Omnichannel Velocity Map */}
                <div className="px-2">
                    <OmnichannelVelocityMap
                        posts={posts}
                        settings={settings}
                        ideas={ideas}
                        timeRange={timeRange}
                    />
                </div>
                {/* Report 3: Dynamic Production Audit */}
                <Card className="bg-slate-950/40 border-border p-6 shadow-2xl relative overflow-hidden group">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-2 bg-emerald-500/10 rounded-lg">
                            <ShieldCheck className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black uppercase tracking-tight">Dynamic Production Audit</h2>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Pillar vitality and publishing consistency</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {productionAuditData?.map(pillar => (
                            <div
                                key={pillar.id}
                                onClick={() => navigate('/studio', { state: { filterPillar: pillar.id } })}
                                className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 hover:bg-white/[0.04] transition-all cursor-pointer hover:border-white/10 hover:scale-[1.01] active:scale-[0.99] group/card"
                                role="button"
                                tabIndex={0}
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-start gap-2">
                                            <div className="w-4 h-4 rounded shadow-sm shrink-0" style={{ backgroundColor: pillar.color }} />
                                            <h3 className="text-xs font-black uppercase line-clamp-2 leading-tight">{pillar.name}</h3>
                                        </div>
                                        <p className="text-[9px] text-muted-foreground font-bold leading-tight">{pillar.description}</p>
                                    </div>
                                    <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded", pillar.status === 'fresh' ? "bg-emerald-500/20 text-emerald-400" : pillar.status === 'stale' ? "bg-amber-500/20 text-amber-500" : "bg-red-500/20 text-red-400")}>
                                        {pillar.badge}
                                    </span>
                                </div>
                                <div className="space-y-2 pt-4 border-t border-white/5">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[9px] font-black uppercase text-muted-foreground self-start mt-1">Last Shipped</span>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="text-[10px] font-black uppercase text-white">{pillar.lastDate ? pillar.lastDate.format('MMM D, YYYY') : 'Never'}</span>
                                            {pillar.lastPostTitle && (() => {
                                                const PlatformIcon = PLATFORM_CONFIG[pillar.lastPostPlatform]?.icon || ActivitySquare;
                                                const platformColor = PLATFORM_CONFIG[pillar.lastPostPlatform]?.color || '#666';
                                                const platformLabel = PLATFORM_CONFIG[pillar.lastPostPlatform]?.label || 'Unknown Platform';

                                                return (
                                                    <div className="relative">
                                                        <div
                                                            className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-2 py-1 rounded-md max-w-[140px] cursor-pointer transition-colors hover:bg-white/10"
                                                            onMouseEnter={() => setHoveredPillar(pillar)}
                                                            onMouseLeave={() => setHoveredPillar(null)}
                                                        >
                                                            <PlatformIcon size={10} style={{ color: platformColor }} className="shrink-0" />
                                                            <span className="text-[9px] font-bold text-white/90 truncate leading-none pt-[1px]">
                                                                {pillar.lastPostTitle}
                                                            </span>
                                                        </div>

                                                        {/* Hover Popover */}
                                                        {hoveredPillar?.id === pillar.id && pillar.lastPostFull && (
                                                            <div className="absolute top-full right-0 mt-2 z-50 bg-slate-900/95 backdrop-blur-md border border-white/10 p-3 rounded-lg shadow-2xl min-w-[200px] w-max max-w-[240px] pointer-events-none">
                                                                <div className="flex flex-col gap-1">
                                                                    {/* Post ID */}
                                                                    <div className="text-[9px] font-black text-blue-400 uppercase tracking-[0.15em] mb-0.5">
                                                                        {pillar.lastPostIdDisplay}
                                                                    </div>

                                                                    {/* Title */}
                                                                    <h4 className="text-[11px] font-black uppercase text-white leading-tight mb-1">
                                                                        {pillar.lastPostTitle}
                                                                    </h4>

                                                                    <div className="space-y-0.5 mt-1 border-t border-white/5 pt-1">
                                                                        {/* Pillar */}
                                                                        <p className="text-[9px] font-bold text-muted-foreground uppercase flex justify-between gap-4">
                                                                            <span>Pillar:</span>
                                                                            <span className="text-white/70 italic text-right truncate">{pillar.name}</span>
                                                                        </p>

                                                                        {/* Platform */}
                                                                        <p className="text-[9px] font-bold text-muted-foreground uppercase flex justify-between gap-4">
                                                                            <span>Platform:</span>
                                                                            <span className="text-white/70">{platformLabel}</span>
                                                                        </p>

                                                                        {/* Date */}
                                                                        <p className="text-[9px] font-black text-blue-400 uppercase mt-1 text-right">
                                                                            {pillar.lastDate?.format('MMM D, YYYY h:mm A')}
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                {/* Triangle Arrow */}
                                                                <div
                                                                    className="absolute -top-1 right-4 w-2 h-2 bg-slate-900 border-l border-t border-white/10 rotate-45"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[9px] font-black uppercase text-muted-foreground">Total Output</span>
                                        <span className="text-[10px] font-black uppercase text-white">{pillar.count} Posts</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {productionAuditData?.some(p => p.status === 'neglected') && (
                        <div className="mt-8 p-4 bg-red-500/5 border border-red-500/20 rounded-2xl flex items-center gap-4">
                            <AlertTriangle className="w-5 h-5 text-red-500/60" />
                            <p className="text-[10px] font-bold text-red-200/50 uppercase tracking-widest leading-relaxed">
                                CRITICAL NEGLECT: Multiple pillars haven't seen content in 30+ days. Restoration of strategic balance requires immediate action.
                            </p>
                        </div>
                    )}
                </Card>

                {/* Bottom Audits Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Report 4: Incubation Audit */}
                    {/* Report 4: Incubation Audit */}
                    <Card className="bg-slate-950/40 border-border p-5 shadow-2xl flex flex-col h-[300px]">
                        <div className="flex items-start justify-between mb-4 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-500/10 rounded-lg shrink-0">
                                    <Clock className="w-5 h-5 text-amber-500" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-black uppercase tracking-tight">Incubation Audit</h2>
                                    <p className="text-[9px] text-muted-foreground uppercase font-black">Stagnant Master Ideas</p>
                                </div>
                            </div>

                            {/* Dormancy Filter */}
                            <Select value={dormancyThreshold} onValueChange={setDormancyThreshold}>
                                <SelectTrigger className="h-7 w-[95px] text-[10px] font-bold uppercase bg-background/50 border-white/10 text-muted-foreground focus:ring-0">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent align="end">
                                    <SelectItem value="30" className="text-xs"> &gt; 30 Days</SelectItem>
                                    <SelectItem value="60" className="text-xs"> &gt; 60 Days</SelectItem>
                                    <SelectItem value="90" className="text-xs"> &gt; 90 Days</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {staleIdeas.length === 0 ? (
                            /* Healthy State */
                            <div className="flex-1 flex flex-col items-center justify-center bg-emerald-500/5 rounded-xl border border-emerald-500/10 border-dashed">
                                <div className="p-3 bg-emerald-500/20 rounded-full mb-2">
                                    <ShieldCheck className="w-6 h-6 text-emerald-400" />
                                </div>
                                <span className="text-xs font-black uppercase text-emerald-400">Pipeline Healthy</span>
                                <span className="text-[9px] font-bold text-emerald-500/60 uppercase tracking-wider mt-0.5">No stagnant ideas found</span>
                            </div>
                        ) : (
                            /* Stale List */
                            <div className="flex-1 flex flex-col gap-2 min-h-0">
                                <div className="flex items-center justify-between px-1 mb-1 shrink-0">
                                    <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Stagnant Ideas</span>
                                    <span className="text-[9px] font-black text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">{staleIdeas.length} Found</span>
                                </div>

                                <div className="overflow-y-auto pr-2 -mr-2 space-y-2 custom-scrollbar">
                                    {staleIdeas.map(idea => {
                                        const lastActivity = idea.updated_at?.toDate?.() || idea.created_at?.toDate?.() || idea.updated_at || idea.created_at;
                                        const daysDormant = moment().diff(moment(lastActivity), 'days');

                                        // Find pillar color
                                        const pColor = settings?.content_pillars?.find(p => p.id === idea.pillar)?.color || '#666';

                                        return (
                                            <button
                                                key={idea.id}
                                                onClick={() => {
                                                    setEditingIdea(idea);
                                                    setEditorOpen(true);
                                                }}
                                                className="w-full flex items-center gap-3 bg-white/[0.02] border border-white/5 p-2 rounded-lg hover:bg-white/5 hover:border-white/10 transition-all group text-left"
                                            >
                                                <div className="w-1 h-8 rounded-full shrink-0" style={{ backgroundColor: pColor }} />

                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-[11px] font-bold text-white/90 truncate leading-tight group-hover:text-amber-400 transition-colors">
                                                        {idea.master_title}
                                                    </h4>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-[9px] font-medium text-muted-foreground uppercase truncate">
                                                            #{`IDEA-${idea.idea_number}`}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col items-end shrink-0">
                                                    <span className="text-[10px] font-black text-amber-500/80 bg-amber-500/10 px-1.5 py-0.5 rounded leading-none">
                                                        {daysDormant}d
                                                    </span>
                                                    <span className="text-[8px] font-bold text-muted-foreground uppercase mt-1">
                                                        Dormant
                                                    </span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Editor Modal */}
                        {editorOpen && (
                            <IdeaEditorModal
                                open={editorOpen}
                                idea={editingIdea}
                                onClose={() => {
                                    setEditorOpen(false);
                                    setEditingIdea(null);
                                }}
                                onSave={handleSaveIdea}
                            />
                        )}
                    </Card>

                    {/* Report 5: Missed Schedule Audit */}
                    <Card className="bg-slate-950/40 border-border p-5 shadow-2xl h-[300px] flex flex-col">
                        <div className="flex items-center gap-3 mb-4 shrink-0">
                            <div className="p-2 bg-red-500/10 rounded-lg shrink-0">
                                <Zap className="w-5 h-5 text-red-500" />
                            </div>
                            <div>
                                <h2 className="text-sm font-black uppercase tracking-tight">Schedule Audit</h2>
                                <p className="text-[9px] text-muted-foreground uppercase font-black">Overdue Multi-Platform Posts</p>
                            </div>
                        </div>

                        {overduePosts.length === 0 ? (
                            /* Healthy State */
                            <div className="flex-1 flex flex-col items-center justify-center bg-emerald-500/5 rounded-xl border border-emerald-500/10 border-dashed">
                                <div className="p-3 bg-emerald-500/20 rounded-full mb-2">
                                    <ShieldCheck className="w-6 h-6 text-emerald-400" />
                                </div>
                                <span className="text-xs font-black uppercase text-emerald-400">All Clear</span>
                                <span className="text-[9px] font-bold text-emerald-500/60 uppercase tracking-wider mt-0.5">No overdue posts</span>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col gap-2 min-h-0">
                                <div className="flex items-center justify-between px-1 mb-1 shrink-0">
                                    <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Overdue Posts</span>
                                    <span className="text-[9px] font-black text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded animate-pulse">{overduePosts.length} Overdue</span>
                                </div>

                                <div className="overflow-y-auto pr-2 -mr-2 space-y-2 custom-scrollbar">
                                    {overduePosts.map(post => {
                                        const pubDate = post.publish_date?.toDate?.() || post.publish_date;
                                        const timeAgo = moment(pubDate).fromNow();

                                        // Platform
                                        const PlatformIcon = PLATFORM_CONFIG[post.platform]?.icon || ActivitySquare;
                                        const pColor = PLATFORM_CONFIG[post.platform]?.color || '#666';

                                        return (
                                            <button
                                                key={post.id}
                                                onClick={() => {
                                                    setEditingPost(post);
                                                    setPostEditorOpen(true);
                                                }}
                                                className="w-full flex items-center gap-3 bg-white/[0.02] border border-white/5 p-2 rounded-lg hover:bg-white/5 hover:border-white/10 transition-all group text-left"
                                            >
                                                <div className="w-8 h-8 rounded-md shrink-0 flex items-center justify-center bg-white/5 group-hover:bg-white/10 transition-colors">
                                                    <PlatformIcon size={14} style={{ color: pColor }} />
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-[11px] font-bold text-white/90 truncate leading-tight group-hover:text-red-400 transition-colors">
                                                        {post.post_title}
                                                    </h4>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-[9px] font-medium text-muted-foreground uppercase truncate">
                                                            {(() => {
                                                                const parentIdea = ideas?.find(i => i.id === post.idea_id);
                                                                return formatPostId(post, parentIdea) || `#POST-${post.id.substring(0, 4).toUpperCase()}`;
                                                            })()}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col items-end shrink-0">
                                                    <span className="text-[10px] font-black text-red-500/80 bg-red-500/10 px-1.5 py-0.5 rounded leading-none">
                                                        {timeAgo}
                                                    </span>
                                                    <span className="text-[8px] font-bold text-muted-foreground uppercase mt-1">
                                                        Overdue
                                                    </span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Post Editor Modal */}
                        {postEditorOpen && (
                            <PostEditorModal
                                open={postEditorOpen}
                                post={editingPost}
                                onClose={() => {
                                    setPostEditorOpen(false);
                                    setEditingPost(null);
                                }}
                                onSave={handleSavePost}
                                pillars={settings?.content_pillars} // Pass pillars for dropdown if needed
                                settings={settings}
                            />
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
}
