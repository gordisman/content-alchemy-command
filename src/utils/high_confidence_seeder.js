import { db } from '../lib/firebase';
import { collection, doc, writeBatch, updateDoc, increment } from 'firebase/firestore';
import { addDays, subDays } from 'date-fns';

/**
 * HIGH-CONFIDENCE SEEDER
 * 
 * Generates realistic content to verify:
 * 1. D-XXX (Direct Entry) IDs and sequences
 * 2. P.I.P (Pillar.Idea.Post) hierarchical IDs
 * 3. Evergreen Resurface Logic (Posts in the past)
 */

export const seedHighConfidenceData = async () => {
    const batch = writeBatch(db);
    const log = [];

    // Helper to get random item from array
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

    try {
        // --- 1. SEED IDEAS (The 'I' in P.I.P) ---
        const ideas = [
            { id: 'idea-creative-blocks', idea_number: 101, master_title: 'Overcoming Creative Blocks in 2026', pillar_id: 'pillar-6', sequence: 1 },
            { id: 'idea-ai-workflow', idea_number: 102, master_title: 'My 10-Min AI Video Workflow', pillar_id: 'pillar-3', sequence: 2 },
            { id: 'idea-youtube-clari-01', idea_number: 103, master_title: 'Defining Your YouTube North Star', pillar_id: 'pillar-2', sequence: 1 }
        ];

        ideas.forEach(idea => {
            batch.set(doc(db, 'ideas', idea.id), {
                ...idea,
                createdAt: new Date(),
                status: 'active'
            });
            log.push(`📝 Created Idea: ${idea.master_title}`);
        });

        // --- 2. SEED POSTS (The 'P' in P.I.P) ---
        const pipPosts = [
            {
                id: 'post-pip-1',
                post_title: 'Creative Blocks: The Journal Method',
                idea_id: 'idea-creative-blocks',
                definitive_pillar: 'pillar-6',
                sequence: 1, // First post for this idea
                platform: 'linkedin',
                status: 'scheduled',
                publish_date: addDays(new Date(), 2),
                publish_time: '12:00',
                content: 'Journaling is the ultimate weapon against resistance...',
                is_direct_entry: false
            },
            {
                id: 'post-pip-2',
                post_title: 'AI Workflow: Quick Reel Demo',
                idea_id: 'idea-ai-workflow',
                definitive_pillar: 'pillar-3',
                sequence: 1,
                platform: 'instagram',
                status: 'draft',
                publish_date: null,
                publish_time: '00:00',
                content: 'Watch me edit a reel in 10 minutes using the new AI workflow.',
                is_direct_entry: false
            }
        ];

        pipPosts.forEach(post => {
            batch.set(doc(db, 'posts', post.id), {
                ...post,
                createdAt: new Date(),
                is_evergreen: false,
                repurpose_date: null
            });
            log.push(`📦 Created P.I.P Post: ${post.post_title}`);
        });

        // --- 3. SEED DIRECT ENTRY POSTS (D-XXX) ---
        const directPosts = [
            {
                id: 'post-direct-1',
                post_title: 'Just a Quick Morning Update',
                direct_entry_sequence: 1,
                definitive_pillar: 'pillar-1',
                platform: 'x',
                status: 'published',
                publish_date: subDays(new Date(), 1),
                publish_time: '08:00',
                content: 'Good morning Content Alchemists! Just hit 100 posts.',
                is_direct_entry: true
            },
            {
                id: 'post-direct-2',
                post_title: 'Why I Use This Tool Instead of X',
                direct_entry_sequence: 2,
                definitive_pillar: 'pillar-4',
                platform: 'youtube',
                status: 'scheduled',
                publish_date: addDays(new Date(), 5),
                publish_time: '10:00',
                content: 'The specific AI tool I use for video generation...',
                is_direct_entry: true
            }
        ];

        directPosts.forEach(post => {
            batch.set(doc(db, 'posts', post.id), {
                ...post,
                createdAt: new Date(),
                is_evergreen: false,
                repurpose_date: null
            });
            log.push(`📌 Created Direct Post: ${post.post_title} (D-${post.direct_entry_sequence.toString().padStart(3, '0')})`);
        });

        // Sync Settings Counter
        const settingsRef = doc(db, 'settings', 'global');
        batch.update(settingsRef, { direct_entry_post_counter: 2 });

        // --- 4. SEED EVERGREEN POSTS (For Resurface Test) ---
        const evergreenPosts = [
            {
                id: 'post-evergreen-1',
                post_title: 'The Alchemist\'s Manifesto',
                direct_entry_sequence: 3,
                definitive_pillar: 'pillar-1',
                platform: 'linkedin',
                status: 'published',
                publish_date: subDays(new Date(), 366),
                publish_time: '12:00',
                content: 'Creation is alchemy. We transform thoughts into digital gold.',
                is_direct_entry: true,
                is_evergreen: true,
                repurpose_date: subDays(new Date(), 1)
            },
            {
                id: 'post-evergreen-2',
                post_title: '10 Tools That Changed My Life',
                direct_entry_sequence: 4,
                definitive_pillar: 'pillar-4',
                platform: 'youtube',
                status: 'published',
                publish_date: subDays(new Date(), 400),
                publish_time: '09:00',
                content: 'From Notion to Canva, these are the essentials.',
                is_direct_entry: true,
                is_evergreen: true,
                repurpose_date: subDays(new Date(), 5)
            },
            {
                id: 'post-evergreen-3',
                post_title: 'How to Scale Without Burning Out',
                direct_entry_sequence: 5,
                definitive_pillar: 'pillar-6',
                platform: 'x',
                status: 'published',
                publish_date: subDays(new Date(), 500),
                publish_time: '12:00',
                content: 'Consistency is better than speed.',
                is_direct_entry: true,
                is_evergreen: true,
                repurpose_date: subDays(new Date(), 2)
            }
        ];

        evergreenPosts.forEach(post => {
            batch.set(doc(db, 'posts', post.id), {
                ...post,
                createdAt: subDays(new Date(), 500)
            });
            log.push(`🔥 Created EVERGREEN Post: ${post.post_title}`);
        });

        // Final Counter Sync
        batch.update(settingsRef, { direct_entry_post_counter: 5 });

        await batch.commit();
        return { success: true, log: log.join('\n') };

    } catch (e) {
        console.error("High Confidence Seed Error:", e);
        return { success: false, error: e.message };
    }
};
