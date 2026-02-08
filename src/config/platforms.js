import {
    Instagram,
    Youtube,
    Facebook,
    Linkedin,
    X, // Lucide X icon
    Music2,
    Mail,
    Newspaper,
    Users,
    MessageSquare
} from 'lucide-react';

export const PLATFORM_CONFIG = {
    instagram: {
        id: 'instagram',
        label: 'Instagram',
        color: '#E1306C',
        icon: Instagram,
        order: 1,
        capability: 'manual'
    },
    youtube: {
        id: 'youtube',
        label: 'YouTube',
        color: '#FF0000',
        icon: Youtube,
        order: 2,
        capability: 'automation'
    },
    fb_page: {
        id: 'fb_page',
        label: 'Facebook Profile',
        color: '#1877F2',
        icon: Facebook,
        order: 3,
        capability: 'manual'
    },
    fb_group: {
        id: 'fb_group',
        label: 'Facebook Group',
        color: '#1877F2',
        icon: Users,
        order: 4,
        capability: 'automation'
    },
    linkedin: {
        id: 'linkedin',
        label: 'LinkedIn',
        color: '#0077B5',
        icon: Linkedin,
        order: 5,
        capability: 'automation'
    },
    x: {
        id: 'x',
        label: 'X (Twitter)',
        color: '#000000',
        icon: X,
        order: 6,
        capability: 'automation'
    },
    tiktok: {
        id: 'tiktok',
        label: 'TikTok',
        color: '#000000',
        icon: Music2,
        order: 7,
        capability: 'manual'
    },
    email: {
        id: 'email',
        label: 'Email',
        color: '#EA4335',
        icon: Mail,
        order: 8,
        capability: 'automation'
    },
    substack: {
        id: 'substack',
        label: 'Substack',
        color: '#FF6719',
        icon: Newspaper,
        order: 9,
        capability: 'manual'
    },
    community: {
        id: 'community',
        label: 'Community',
        color: '#5865F2',
        icon: MessageSquare,
        order: 10,
        capability: 'manual'
    }
};

export const SORTED_PLATFORMS = Object.values(PLATFORM_CONFIG).sort((a, b) => a.order - b.order);
export const PLATFORM_KEYS = SORTED_PLATFORMS.map(p => p.id);
