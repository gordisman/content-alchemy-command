import { format } from 'date-fns';

const PLATFORM_LABELS = {
    instagram: 'Instagram',
    youtube: 'YouTube',
    fb_page: 'Facebook Profile',
    fb_group: 'Facebook Group',
    linkedin: 'LinkedIn',
    x: 'X (Twitter)',
    tiktok: 'TikTok',
    email: 'Email',
    substack: 'Substack',
    community: 'Community'
};

/**
 * Generates a comprehensive text summary of a post, including all metadata,
 * platform fields, and resource references.
 */
export const generateReviewText = ({ formData, idea, postId, postAudioURL, postAudioDuration }) => {
    let text = '';
    const platform = formData.platform;
    const formattedId = postId;
    const getField = (field) => formData.platform_fields?.[field] || 'N/A';

    // POST HEADER
    text += `═══════════════════════════════════════════════\n`;
    text += `POST HEADER\n`;
    text += `═══════════════════════════════════════════════\n`;
    text += `Post ID: ${formattedId}\n`;
    text += `Platform: ${PLATFORM_LABELS[platform] || platform}\n`;
    text += `Content Pillar: ${formData.pillarName || 'N/A'}\n`;
    text += `\n`;

    // CONTENT
    text += `═══════════════════════════════════════════════\n`;
    text += `CONTENT\n`;
    text += `═══════════════════════════════════════════════\n`;
    text += `Post Title:\n${formData.post_title || 'N/A'}\n\n`;
    text += `Body:\n${formData.content_text || 'N/A'}\n\n`;
    text += `Call to Action:\n${formData.post_cta || 'N/A'}\n\n`;
    text += `Action Notes:\n${formData.action_notes || 'N/A'}\n`;
    text += `\n`;

    // PLATFORM SPECIFIC
    text += `═══════════════════════════════════════════════\n`;
    text += `PLATFORM SPECIFIC (${PLATFORM_LABELS[platform] || platform})\n`;
    text += `═══════════════════════════════════════════════\n`;

    if (platform === 'youtube') {
        text += `YouTube Type: ${getField('yt_type')}\n`;
        text += `SEO Title: ${getField('youtube_seo_title')}\n`;
        text += `SEO Description: ${getField('youtube_seo_description')}\n`;
        text += `SEO Tags: ${getField('youtube_seo_tags')}\n`;
        text += `Thumbnail Brief: ${getField('yt_thumbnail_brief')}\n`;
        text += `Pinned Comment: ${getField('yt_pinned_comment')}\n`;
        text += `Related Video Link: ${getField('yt_related_video_link')}\n`;
        text += `Audio Notes: ${getField('yt_audio_notes')}\n`;
        text += `Output Notes: ${getField('yt_output_notes')}\n`;
    } else if (platform === 'x') {
        text += `Hook: ${getField('x_hook')}\n`;
        text += `Post Format: ${getField('x_post_format')}\n`;
        text += `Thread Blueprint: ${getField('x_thread_blueprint')}\n`;
        text += `Follow-up Link: ${getField('x_follow_up_link')}\n`;
    } else if (platform === 'instagram') {
        text += `Format: ${getField('ig_format')}\n`;
        text += `First Comment: ${getField('ig_first_comment')}\n`;
        text += `Location: ${getField('ig_location')}\n`;
        text += `Audio Notes: ${getField('ig_audio_notes')}\n`;
        text += `Cover Notes: ${getField('ig_cover_notes')}\n`;
        text += `Story Link: ${getField('ig_story_link')}\n`;
    } else if (platform === 'linkedin') {
        text += `Scroll-Stopper: ${getField('linkedin_scroll_stopper')}\n`;
        text += `Presentation Format: ${getField('linkedin_presentation_format')}\n`;
        text += `Proof & Insight: ${getField('linkedin_proof_insight')}\n`;
        text += `Primary CTA: ${getField('linkedin_primary_cta')}\n`;
        text += `First Comment: ${getField('linkedin_first_comment')}\n`;
        text += `Headline: ${getField('linkedin_headline')}\n`;
    } else if (platform === 'email') {
        text += `From Name: ${getField('email_from_name')}\n`;
        text += `Subject: ${getField('email_subject')}\n`;
        text += `Preheader: ${getField('email_preheader')}\n`;
        text += `Primary CTA: ${getField('email_primary_cta')}\n`;
    } else if (platform === 'tiktok') {
        text += `3-Second Hook: ${getField('tiktok_three_second_hook')}\n`;
        text += `Post Type: ${getField('tiktok_post_type')}\n`;
        text += `Search Keywords: ${getField('tiktok_search_keywords')}\n`;
        text += `SEO Caption: ${getField('tiktok_seo_caption')}\n`;
    } else if (platform === 'fb_page') {
        text += `Engagement Question: ${getField('fb_engagement_question')}\n`;
        text += `Privacy/Audience: ${getField('fb_privacy_audience')}\n`;
        text += `Life Event: ${getField('fb_life_event') === true ? 'Yes' : 'No'}\n`;
        text += `Comment Strategy: ${getField('fb_comment_strategy')}\n`;
    } else if (platform === 'fb_group') {
        text += `Community Theme: ${getField('fb_group_community_theme')}\n`;
        text += `Inside Angle: ${getField('fb_group_inside_angle')}\n`;
        text += `Member Prompt: ${getField('fb_group_member_prompt')}\n`;
        text += `Admin Action: ${getField('fb_group_admin_action')}\n`;
    } else if (platform === 'community') {
        text += `Target Space: ${getField('community_target_space')}\n`;
        text += `Topics: ${getField('community_topics')}\n`;
        text += `Format: ${getField('community_format')}\n`;
    } else if (platform === 'substack') {
        text += `Section: ${getField('substack_section')}\n`;
        text += `Audience: ${getField('substack_audience')}\n`;
        text += `Email Subject: ${getField('substack_email_subject')}\n`;
    }
    text += `\n`;

    // RESOURCES
    text += `═══════════════════════════════════════════════\n`;
    text += `RESOURCES (IDEA & POST)\n`;
    text += `═══════════════════════════════════════════════\n`;

    const ideaResources = idea?.resources || [];
    const postResources = Array.isArray(formData.resources) ? formData.resources : (formData.resources?.links || []);
    const allResources = [...postResources, ...ideaResources].filter((item, index, self) =>
        index === self.findIndex((t) => (t.uri === item.uri && t.label === item.label))
    );

    if (allResources.length > 0 || postAudioURL || idea?.idea_audio_memo) {
        if (postAudioURL) {
            text += `[AUDIO MEMO (POST)] Duration: ${Math.round(postAudioDuration || 0)}s\n`;
            text += `URL: ${postAudioURL}\n\n`;
        }

        if (idea?.idea_audio_memo) {
            text += `[AUDIO MEMO (IDEA)] Duration: ${Math.round(idea.idea_audio_memo_duration || 0)}s\n`;
            text += `URL: ${idea.idea_audio_memo}\n\n`;
        }

        allResources.forEach((resource, index) => {
            const isPostRes = postResources.some(pr => pr.uri === resource.uri && pr.label === resource.label);
            const sourceLabel = isPostRes ? (idea?.id ? '[POST]' : '[DIRECT]') : '[INHERITED]';
            const typeLabel = resource.type === 'gdrive' ? 'GDrive' : resource.type === 'local_file' ? 'File' : 'Link';

            text += `${sourceLabel} ${typeLabel}: ${resource.label || 'Untitled'}\n`;
            text += `  ${resource.uri || 'No URL'}\n`;
        });
    } else {
        text += `No resources attached\n`;
    }
    text += `\n`;

    // POST METADATA
    text += `═══════════════════════════════════════════════\n`;
    text += `POST METADATA\n`;
    text += `═══════════════════════════════════════════════\n`;
    text += `Media Type: ${(formData.media?.type || 'image').toUpperCase()}\n`;
    text += `Media Source: ${(formData.media?.source || 'external').toUpperCase()}\n`;
    text += `Media URL: ${formData.media?.url || 'N/A'}\n`;
    text += `Alt Text: ${formData.media?.alt_text || 'N/A'}\n`;
    text += `\n`;

    // SCHEDULE
    text += `═══════════════════════════════════════════════\n`;
    text += `SCHEDULE\n`;
    text += `═══════════════════════════════════════════════\n`;
    text += `Status: ${formData.status || 'N/A'}\n`;
    text += `Date & Time: ${formData.publish_date ? format(new Date(formData.publish_date), 'MMM d, yyyy') + ' at ' + (formData.publish_time || '00:00') : 'Not scheduled'}\n`;

    return text;
};
