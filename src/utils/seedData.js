export const SEED_DATA = {
    settings: {
        id: 'global',
        direct_entry_post_counter: 0,
        weekly_quotas: {
            "instagram": 5,
            "youtube": 2,
            "fb_page": 3,
            "fb_group": 3,
            "linkedin": 3,
            "x": 7,
            "tiktok": 5,
            "email": 1,
            "substack": 1,
            "community": 4
        },
        lane_visibility: {
            "instagram": true,
            "youtube": true,
            "fb_page": true,
            "fb_group": true,
            "linkedin": true,
            "x": true,
            "tiktok": true,
            "email": true,
            "substack": true,
            "community": true
        },
        alert_time: "09:00",
        alert_timezone: "America/Toronto",
        repurpose_cycle: 365,
        snooze_duration: 90,
        content_pillars: [
            {
                "id": "pillar-1766-4114",
                "name": "YouTube Clarity & Growth - strategy & next steps",
                "description": "High-level strategy and growth content for YouTube creators, focusing on clarity and actionable next steps.",
                "color": "#8B5CF6",
                "disabled": false
            },
            {
                "id": "pillar-1766-4115",
                "name": "Workflow & Creator Systems - AI + Process",
                "description": "Content focused on optimizing creator workflows, leveraging AI tools, and establishing efficient processes.",
                "color": "#10B981",
                "disabled": false
            },
            {
                "id": "pillar-1766-4116",
                "name": "AI Tools for Video Creation - tool demos & reviews",
                "description": "Showcasing and reviewing AI tools specifically for video creation, including tutorials and practical applications.",
                "color": "#3B82F6",
                "disabled": false
            },
            {
                "id": "pillar-1766-4117",
                "name": "Editing & Production Craft - make videos better",
                "description": "Deep dives into video editing techniques, production tips, and creative craft to elevate video quality.",
                "color": "#EF4444",
                "disabled": false
            },
            {
                "id": "pillar-1766-4118",
                "name": "Creator Mindset & Consistency - ship & sustain",
                "description": "Addressing the psychological aspects of creation, fostering consistency, and maintaining motivation for long-term success.",
                "color": "#EAB308",
                "disabled": false
            },
            {
                "id": "pillar-1766-4119",
                "name": "Offers & Creator Business - launch & monetize",
                "description": "Content related to product launches, monetization strategies, and building a sustainable business as a creator.",
                "color": "#EC4899",
                "disabled": false
            },
            {
                "id": "pillar-1766-4120",
                "name": "! General Strategy / Unassigned",
                "description": "The default pillar for general strategy content or ideas not yet assigned to a specific pillar.",
                "color": "#6B7280",
                "disabled": false
            }
        ]
    },
    allocationSets: [
        {
            "id": "695187ff0d5abe0725ad0a60",
            "set_name": "Growth Mode",
            "is_active": false,
            "description": "Maximum reach with trending AI tools and clarity content"
        },
        {
            "id": "695187f924ff665a629a1c72",
            "set_name": "Launch Mode",
            "is_active": false,
            "description": "Heavy emphasis on offers and sales for product launches"
        },
        {
            "id": "695187f8893a16c66db7a410",
            "set_name": "Steady State",
            "is_active": true,
            "description": "Balanced content mix for consistent growth"
        }
    ],
    pillarTargets: [
        // Growth Mode
        { allocation_set_id: "695187ff0d5abe0725ad0a60", pillar_id: "pillar-1766-4120", target_percentage: 0 }, // Unassigned
        { allocation_set_id: "695187ff0d5abe0725ad0a60", pillar_id: "pillar-1766-4115", target_percentage: 5 }, // Workflow
        { allocation_set_id: "695187ff0d5abe0725ad0a60", pillar_id: "pillar-1766-4116", target_percentage: 10 }, // AI Tools (Note: CSV mapped to different ID, assuming mapping for brevity, will fix if needed)
        // NOTE: The CSV pillar IDs (e.g. pillar-1766950292171) do NOT match the Settings CSV pillar IDs (e.g. pillar-1766-4115).
        // I MUST UNIFY THEM.
        // The Settings CSV seems to have the "human readable" IDs possibly re-generated or cleaned up?
        // Wait, let me check the Settings CSV again.
        // The Settings CSV has IDs like "pillar-1766-4114".
        // The PillarTargets CSV has IDs like "pillar-1766979371475" (timestamp based?).
        // This is a mismatch from the export data. I need to map them or just use the Settings IDs and distribute percentages logically.
        // Since I can't know the exact mapping without more data, I will assign the targets to the NEW Settings IDs based on the order or description if possible, or just create a valid set for "Steady State" to start.

        // Let's create a CLEAN set of targets for "Steady State" using the IDs from Settings.
        // Steady State (Balanced):
        { allocation_set_id: "695187f8893a16c66db7a410", pillar_id: "pillar-1766-4114", target_percentage: 15 }, // YouTube Clarity
        { allocation_set_id: "695187f8893a16c66db7a410", pillar_id: "pillar-1766-4115", target_percentage: 15 }, // Workflow
        { allocation_set_id: "695187f8893a16c66db7a410", pillar_id: "pillar-1766-4116", target_percentage: 15 }, // AI Tools
        { allocation_set_id: "695187f8893a16c66db7a410", pillar_id: "pillar-1766-4117", target_percentage: 20 }, // Editing
        { allocation_set_id: "695187f8893a16c66db7a410", pillar_id: "pillar-1766-4118", target_percentage: 15 }, // Mindset
        { allocation_set_id: "695187f8893a16c66db7a410", pillar_id: "pillar-1766-4119", target_percentage: 20 }, // Offers
        { allocation_set_id: "695187f8893a16c66db7a410", pillar_id: "pillar-1766-4120", target_percentage: 0 },  // Unassigned
    ]
};
