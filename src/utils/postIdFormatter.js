/**
 * Universal Post ID Formatter
 * Central utility for consistent post ID generation across the app
 * 
 * Direct Entry Format: #POST-D{sequence} (e.g., #POST-D001)
 * Idea-Linked Format: #POST-{ideaNumber}-{sequence} (e.g., #POST-101-1)
 */

export function formatPostId(post, idea = null) {
    if (!post) return null;

    // Direct entry post
    if (post.is_direct_entry || (!post.idea_id && post.direct_entry_sequence)) {
        if (post.direct_entry_sequence !== null && post.direct_entry_sequence !== undefined) {
            return `#POST-D${String(post.direct_entry_sequence).padStart(3, '0')}`;
        }
        // New or pending direct entry
        return `#POST-D-PENDING`;
    }

    // Idea-linked post
    if (post.idea_id) {
        if (idea) {
            const ideaNum = idea.idea_number || '???';
            if (post.sequence !== null && post.sequence !== undefined) {
                return `#POST-${ideaNum}-${post.sequence}`;
            }
            return `#POST-${ideaNum}-PENDING`;
        }
        // Orphaned Post (Has ID but no Idea object found)
        return `#POST-ORPHAN-${post.sequence || '?'}`;
    }

    // Fallback
    return null;
}

/**
 * Check if a post is a direct entry
 */
export function isDirectEntry(post) {
    return post?.is_direct_entry === true;
}

/**
 * Get the display label for a post type
 */
export function getPostTypeLabel(post) {
    if (isDirectEntry(post)) {
        return 'Direct Entry';
    }
    return 'Idea-Linked';
}
