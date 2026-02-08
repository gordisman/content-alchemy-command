import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, ArrowLeft, Image as ImageIcon, Link as LinkIcon, Mic, FileText, ExternalLink, Play } from 'lucide-react';
import { toast } from "sonner";
import { format } from 'date-fns';
import { generateReviewText } from '../../utils/postReviewFormatter';
import { PLATFORM_CONFIG } from '../../config/platforms';

export default function PostReviewOverlay({ open, onClose, formData, idea, settings, pillars = [], postId, postAudioURL, postAudioDuration }) {
    if (!open) return null;

    // Helper to safely get field or N/A
    const getField = (key) => {
        const val = formData[key];
        if (!val) return <span className="italic text-slate-500">N/A</span>;
        return val;
    };

    const handleCopyAll = () => {
        const reviewText = generateReviewText({
            formData: { ...formData, pillarName: selectedPillar?.name },
            idea,
            postId,
            postAudioURL,
            postAudioDuration
        });
        navigator.clipboard.writeText(reviewText);
        toast.success('Full post assembly copied to clipboard!');
    };

    const platform = formData.platform;
    const platformConfig = PLATFORM_CONFIG[platform] || {};
    const platformLabel = platformConfig.label || platform;

    // Resolve Pillar Color
    const selectedPillar = pillars.find(p => p.id === (formData.definitive_pillar || formData.pillar));
    const pillarColor = selectedPillar?.color || '#ffffff'; // Fallback to white

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="bg-[#0f0f0f] border-white/10 text-white max-w-3xl h-[85vh] overflow-hidden flex flex-col p-6">
                <DialogHeader className="flex-shrink-0 mb-4">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-white text-xl font-bold flex items-center gap-2">
                            Post Review
                        </DialogTitle>
                        <Button
                            onClick={handleCopyAll}
                            className="bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-500/20 transition-all active:scale-95"
                        >
                            <Copy className="w-4 h-4 mr-2" />
                            Copy All to Clipboard
                        </Button>
                    </div>
                </DialogHeader>

                <ScrollArea className="flex-1 pr-4">
                    <div className="space-y-8">
                        {/* POST HEADER */}
                        <div>
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 border-b border-white/10 pb-2">
                                POST HEADER
                            </h3>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-slate-400">Post ID: </span>
                                    <div
                                        className="font-mono px-2 py-0.5 rounded border text-xs font-bold"
                                        style={{
                                            color: 'white',
                                            borderColor: pillarColor,
                                            backgroundColor: `${pillarColor}10`
                                        }}
                                    >
                                        {postId}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-slate-400">Platform: </span>
                                    <span className="text-sm font-medium">{platformLabel}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-slate-400">Content Pillar: </span>
                                    <span className="text-sm font-medium flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: pillarColor }} />
                                        {selectedPillar?.name || 'None'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* CONTENT */}
                        <div>
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 border-b border-white/10 pb-2">
                                CONTENT
                            </h3>
                            <div className="space-y-6">
                                <div>
                                    <p className="text-xs font-semibold text-slate-400 mb-1.5">Post Title:</p>
                                    <p className="text-sm text-slate-200 bg-white/5 p-3 rounded-md border border-white/5 leading-relaxed">
                                        {formData.post_title || <span className="italic text-slate-500">N/A</span>}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-slate-400 mb-1.5">Body:</p>
                                    <p className="text-sm text-slate-200 bg-white/5 p-3 rounded-md border border-white/5 leading-relaxed whitespace-pre-wrap min-h-[60px]">
                                        {formData.content_text || <span className="italic text-slate-500">N/A</span>}
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs font-semibold text-slate-400 mb-1.5">Call to Action:</p>
                                        <p className="text-sm text-slate-200 bg-white/5 p-3 rounded-md border border-white/5 truncate">
                                            {formData.post_cta || <span className="italic text-slate-500">N/A</span>}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-slate-400 mb-1.5">Action Notes:</p>
                                        <p className="text-sm text-slate-200 bg-amber-500/5 p-3 rounded-md border border-amber-500/10 truncate">
                                            {formData.action_notes || <span className="italic text-slate-500">N/A</span>}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* POST METADATA */}
                        <div>
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 border-b border-white/10 pb-2">
                                UNIVERSAL MEDIA METADATA
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs font-semibold text-slate-400 mb-1.5 text-[10px] uppercase tracking-wider">Asset Type & Source:</p>
                                    <div className="flex gap-2 mb-3">
                                        <Badge variant="outline" className="bg-purple-500/10 border-purple-500/30 text-purple-400 text-[10px] uppercase font-mono">
                                            {formData.media?.type || 'image'}
                                        </Badge>
                                        <Badge variant="outline" className="bg-blue-500/10 border-blue-500/30 text-blue-400 text-[10px] uppercase font-mono">
                                            {formData.media?.source || 'external'}
                                        </Badge>
                                    </div>
                                    <p className="text-xs font-semibold text-slate-400 mb-1.5">Media URL:</p>
                                    <div className="bg-white/5 p-3 rounded-md border border-white/5 flex items-center justify-between group">
                                        <p className="text-sm text-slate-200 truncate pr-2">
                                            {formData.media?.url || <span className="italic text-slate-500">N/A</span>}
                                        </p>
                                        {formData.media?.url && (
                                            <a
                                                href={formData.media.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-slate-500 hover:text-indigo-400 transition-colors shrink-0"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5" />
                                            </a>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-slate-400 mb-1.5">Alt Text:</p>
                                    <p className="text-sm text-slate-200 bg-white/5 p-3 rounded-md border border-white/5 min-h-[44px] leading-relaxed">
                                        {formData.media?.alt_text || <span className="italic text-slate-500">N/A</span>}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* PLATFORM SPECIFIC */}
                        <div>
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 border-b border-white/10 pb-2">
                                PLATFORM SPECIFIC ({platformLabel})
                            </h3>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-4 bg-white/5 p-4 rounded-lg border border-white/5">
                                {platform === 'youtube' && (
                                    <>
                                        <div className="text-sm"><span className="text-slate-400 block text-xs mb-1">YouTube Type:</span> {getField('yt_type')}</div>
                                        <div className="text-sm"><span className="text-slate-400 block text-xs mb-1">SEO Title:</span> {getField('youtube_seo_title')}</div>
                                        <div className="text-sm col-span-2"><span className="text-slate-400 block text-xs mb-1">SEO Description:</span> <p className="text-slate-200 whitespace-pre-wrap">{getField('youtube_seo_description')}</p></div>
                                        <div className="text-sm"><span className="text-slate-400 block text-xs mb-1">SEO Tags:</span> {getField('youtube_seo_tags')}</div>
                                        <div className="text-sm col-span-2"><span className="text-slate-400 block text-xs mb-1">Thumbnail Brief:</span> <p className="text-slate-200 whitespace-pre-wrap">{getField('yt_thumbnail_brief')}</p></div>
                                        <div className="text-sm col-span-2"><span className="text-slate-400 block text-xs mb-1">Pinned Comment:</span> {getField('yt_pinned_comment')}</div>
                                        <div className="text-sm"><span className="text-slate-400 block text-xs mb-1">Related Video Link:</span> {getField('yt_related_video_link')}</div>
                                        <div className="text-sm col-span-2"><span className="text-slate-400 block text-xs mb-1">Audio/Output Notes:</span> {getField('yt_audio_notes')}</div>
                                    </>
                                )}

                                {platform === 'x' && (
                                    <>
                                        <div className="text-sm col-span-2"><span className="text-slate-400 block text-xs mb-1">Hook:</span> {getField('x_hook')}</div>
                                        <div className="text-sm"><span className="text-slate-400 block text-xs mb-1">Post Format:</span> {getField('x_post_format')}</div>
                                        <div className="text-sm col-span-2"><span className="text-slate-400 block text-xs mb-1">Thread Blueprint:</span> <p className="text-slate-200 whitespace-pre-wrap">{getField('x_thread_blueprint')}</p></div>
                                        <div className="text-sm"><span className="text-slate-400 block text-xs mb-1">Follow-up Link:</span> {getField('x_follow_up_link')}</div>
                                    </>
                                )}

                                {platform === 'instagram' && (
                                    <>
                                        <div className="text-sm"><span className="text-slate-400 block text-xs mb-1">Format:</span> {getField('ig_format')}</div>
                                        <div className="text-sm"><span className="text-slate-400 block text-xs mb-1">Location:</span> {getField('ig_location')}</div>
                                        <div className="text-sm col-span-2"><span className="text-slate-400 block text-xs mb-1">First Comment:</span> <p className="text-slate-200 whitespace-pre-wrap">{getField('ig_first_comment')}</p></div>
                                        <div className="text-sm"><span className="text-slate-400 block text-xs mb-1">Audio Notes:</span> {getField('ig_audio_notes')}</div>
                                        <div className="text-sm"><span className="text-slate-400 block text-xs mb-1">Cover Notes:</span> {getField('ig_cover_notes')}</div>
                                        <div className="text-sm col-span-2"><span className="text-slate-400 block text-xs mb-1">Story Link:</span> {getField('ig_story_link')}</div>
                                    </>
                                )}

                                {platform === 'linkedin' && (
                                    <>
                                        <div className="text-sm col-span-2"><span className="text-slate-400 block text-xs mb-1">Headline:</span> {getField('linkedin_headline')}</div>
                                        <div className="text-sm"><span className="text-slate-400 block text-xs mb-1">Presentation Format:</span> {getField('linkedin_presentation_format')}</div>
                                        <div className="text-sm col-span-2"><span className="text-slate-400 block text-xs mb-1">Scroll-Stopper:</span> {getField('linkedin_scroll_stopper')}</div>
                                        <div className="text-sm"><span className="text-slate-400 block text-xs mb-1">Primary CTA:</span> {getField('linkedin_primary_cta')}</div>
                                        <div className="text-sm col-span-2"><span className="text-slate-400 block text-xs mb-1">First Comment:</span> {getField('linkedin_first_comment')}</div>
                                    </>
                                )}

                                {platform === 'email' && (
                                    <>
                                        <div className="text-sm"><span className="text-slate-400 block text-xs mb-1">From Name:</span> {getField('email_from_name')}</div>
                                        <div className="text-sm"><span className="text-slate-400 block text-xs mb-1">Subject:</span> {getField('email_subject')}</div>
                                        <div className="text-sm col-span-2"><span className="text-slate-400 block text-xs mb-1">Preheader:</span> {getField('email_preheader')}</div>
                                        <div className="text-sm"><span className="text-slate-400 block text-xs mb-1">Primary CTA:</span> {getField('email_primary_cta')}</div>
                                    </>
                                )}

                                {platform === 'tiktok' && (
                                    <>
                                        <div className="text-sm"><span className="text-slate-400 block text-xs mb-1">3-Second Hook:</span> {getField('tiktok_three_second_hook')}</div>
                                        <div className="text-sm"><span className="text-slate-400 block text-xs mb-1">Post Type:</span> {getField('tiktok_post_type')}</div>
                                        <div className="text-sm col-span-2"><span className="text-slate-400 block text-xs mb-1">SEO Caption:</span> {getField('tiktok_seo_caption')}</div>
                                    </>
                                )}

                                {/* Default N/A for other platforms if not explicitly handled */}
                                {(!['youtube', 'x', 'instagram', 'linkedin', 'email', 'tiktok'].includes(platform)) && (
                                    <div className="col-span-2 italic text-slate-500 text-xs">No platform-specific fields defined for this layout.</div>
                                )}
                            </div>
                        </div>

                        {/* RESOURCES (IDEA & POST) */}
                        <div>
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 border-b border-white/10 pb-2">
                                RESOURCES (MEMOS & ASSETS)
                            </h3>
                            <div className="space-y-3">
                                {/* Post Audio Memo Indicator */}
                                {postAudioURL && (
                                    <div className="flex items-center gap-3 p-3 bg-indigo-500/5 rounded-md border border-indigo-500/10 group hover:bg-indigo-500/10 transition-colors">
                                        <div className="p-2 bg-indigo-500/10 rounded-full text-indigo-400 shrink-0">
                                            <Mic className="w-4 h-4" />
                                        </div>
                                        <div className="flex flex-col min-w-0 flex-1">
                                            <span className="text-sm font-semibold text-slate-200">Audio Memo (Post) ({Math.round(postAudioDuration || 0)}s)</span>
                                            <a
                                                href={postAudioURL}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-[10px] text-slate-500 hover:text-indigo-400 hover:underline truncate transition-colors"
                                            >
                                                {postAudioURL}
                                            </a>
                                        </div>
                                        <a href={postAudioURL} target="_blank" rel="noreferrer" className="text-slate-600 hover:text-indigo-400 transition-colors">
                                            <ExternalLink className="w-3.5 h-3.5" />
                                        </a>
                                    </div>
                                )}

                                {/* Idea Audio Memo Indicator */}
                                {idea?.idea_audio_memo && (
                                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-md border border-white/5 group hover:bg-white/10 transition-colors">
                                        <div className="p-2 bg-purple-500/10 rounded-full text-purple-600 dark:text-purple-500 shrink-0">
                                            <Mic className="w-4 h-4" />
                                        </div>
                                        <div className="flex flex-col min-w-0 flex-1">
                                            <span className="text-sm font-semibold text-slate-200">Audio Memo (Idea) ({Math.round(idea.idea_audio_memo_duration || 0)}s)</span>
                                            <a
                                                href={idea.idea_audio_memo}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-[10px] text-slate-500 hover:text-indigo-400 hover:underline truncate transition-colors"
                                            >
                                                {idea.idea_audio_memo}
                                            </a>
                                        </div>
                                        <a href={idea.idea_audio_memo} target="_blank" rel="noreferrer" className="text-slate-600 hover:text-indigo-400 transition-colors">
                                            <ExternalLink className="w-3.5 h-3.5" />
                                        </a>
                                    </div>
                                )}

                                {/* Other Resources */}
                                {idea?.resources && idea.resources.length > 0 ? (
                                    <div className="grid grid-cols-1 gap-2">
                                        {idea.resources.map((resource, index) => (
                                            <div key={index} className="flex items-center gap-3 p-3 bg-white/5 rounded-md border border-white/5 hover:bg-white/10 transition-colors group">
                                                <div className={`p-2 rounded-full shrink-0 transition-colors ${(resource.type === 'gdrive' || resource.type === 'local_file') ? 'bg-blue-500/10 text-blue-600 dark:text-blue-500' : 'bg-slate-500/10 text-slate-400'
                                                    }`}>
                                                    {resource.type === 'gdrive' ? <ImageIcon className="w-4 h-4" /> : resource.type === 'local_file' ? <FileText className="w-4 h-4" /> : <LinkIcon className="w-4 h-4" />}
                                                </div>
                                                <div className="flex flex-col min-w-0 flex-1">
                                                    <p className="text-sm font-semibold text-slate-200 truncate">{resource.label || 'Untitled'}</p>
                                                    <div className="flex items-center gap-1">
                                                        <a
                                                            href={resource.uri}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="text-[10px] text-slate-500 hover:text-indigo-400 hover:underline truncate max-w-[300px] transition-colors"
                                                        >
                                                            {resource.uri || 'No URL'}
                                                        </a>
                                                        {resource.uri && <ExternalLink className="w-2.5 h-2.5 text-slate-600" />}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    !idea?.idea_audio_memo && <p className="text-sm text-slate-500 italic">No resources attached</p>
                                )}
                            </div>
                        </div>

                        {/* SCHEDULE */}
                        <div>
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 border-b border-white/10 pb-2">
                                SCHEDULE
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-slate-400">Status: </span>
                                    <Badge variant="secondary" className="capitalize bg-slate-800 text-slate-300 border-slate-700">
                                        {formData.status || 'draft'}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-slate-400">Published: </span>
                                    <span className="text-sm font-medium">
                                        {formData.publish_date ? format(formData.publish_date, 'MMM d, yyyy') + ' at ' + (formData.publish_time || '00:00') : 'Not scheduled'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </ScrollArea>

                <div className="flex-shrink-0 pt-6 mt-4 border-t border-white/10">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className="text-slate-400 hover:text-white hover:bg-white/5 gap-2 px-0"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Edit
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
