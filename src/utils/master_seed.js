import { db } from '../lib/firebase';
import { collection, doc, writeBatch, getDocs, getDoc } from 'firebase/firestore';

/**
 * MASTER SYSTEM SEED
 * 
 * This file contains the 'Golden Data' for the entire application foundation:
 * 1. Settings (Global configuration)
 * 2. Allocation Sets (3 Core Modes)
 * 3. Pillar Targets (21 Strict Matrix Records)
 */

export const initializeSystemDefaults = async () => {
    console.log("Starting Master System Initialization...");
    const batch = writeBatch(db);
    const log = [];

    try {
        // --- 1. SETTINGS & PILLARS ---
        const pillars = [
            { id: 'pillar-1', name: '! General Strategy / Unassigned', description: 'The default pillar for general strategy content or ideas not yet assigned to a specific pillar.', color: '#f59e0b', active: true },
            { id: 'pillar-2', name: 'YouTube Clarity & Growth - strategy & next steps', description: 'High-level strategy and growth content for YouTube creators, focusing on clarity and actionable next steps.', color: '#ef4444', active: true },
            { id: 'pillar-3', name: 'Workflow & Creator Systems - AI + Process', description: 'Content focused on optimizing creator workflows, leveraging AI tools, and establishing efficient processes.', color: '#3b82f6', active: true },
            { id: 'pillar-4', name: 'AI Tools for Video Creation - bool demos & reviews', description: 'Showcasing and reviewing AI tools specifically for video creation, including tutorials and practical applications.', color: '#8b5cf6', active: true },
            { id: 'pillar-5', name: 'Editing & Production Craft - make videos better', description: 'Deep dives into video editing techniques, production tips, and creative craft to elevate video quality.', color: '#10b981', active: true },
            { id: 'pillar-6', name: 'Creator Mindset & Consistency - ship & sustain', description: 'Addressing the psychological aspects of creation, fostering consistency, and maintaining motivation for long-term success.', color: '#ec4899', active: true },
            { id: 'pillar-7', name: 'Offers & Creator Business - launch & monetize', description: 'Content related to product launches, monetization strategies, and building a sustainable business as a creator.', color: '#6366f1', active: true }
        ];

        const settingsRef = doc(db, 'settings', 'global');

        // Safety Check: Preserve Counter if exists
        let currentCounter = 0;
        try {
            const snap = await getDoc(settingsRef);
            if (snap.exists() && snap.data().direct_entry_post_counter !== undefined) {
                currentCounter = snap.data().direct_entry_post_counter;
                log.push(`ℹ️ Preserving existing Post Counter: ${currentCounter}`);
            }
        } catch (err) {
            console.warn("Could not read existing settings, defaulting counter to 0");
        }

        batch.set(settingsRef, {
            content_pillars: pillars,
            direct_entry_post_counter: currentCounter, // Preserved value or 0
            lane_visibility: {
                youtube: true,
                instagram: true,
                linkedin: true,
                tiktok: true,
                x: true,
                fb_page: true,
                fb_group: true,
                email: true,
                substack: true,
                community: true
            },
            repurpose_cycle: 365,
            snooze_duration: 90,
            initializedAt: new Date()
        }, { merge: true });
        log.push('✅ Settings & Pillars Configured');

        // --- 2. ALLOCATION SETS ---
        const allocationSets = [
            { id: 'steady_state', name: 'Steady State', order: 1, description: 'Balanced content mix for consistent growth', is_active: true },
            { id: 'growth_mode', name: 'Growth Mode', order: 2, description: 'Maximum reach with trending AI tools', is_active: false },
            { id: 'launch_mode', name: 'Launch Mode', order: 3, description: 'Heavy emphasis on offers and sales', is_active: false }
        ];

        // Clean existing sets first (Separate read/delete step usually needed, but batch set overwrites if ID matches. 
        // To be safe and "purge", we really should delete others, but given strict IDs, we just execute sets.)
        // Ideally we wipe the collection, but for this "Reset" button logic, overwriting strict IDs is the core requirement.

        allocationSets.forEach(set => {
            batch.set(doc(db, 'allocationsets', set.id), set);
        });
        log.push('✅ Allocation Sets (3) Reset');

        // --- 3. PILLAR TARGETS (Matrix) ---

        // Matrix Definition [Steady, Growth, Launch]
        const matrix = {
            'pillar-1': [0, 0, 0],   // Anchor
            'pillar-2': [20, 25, 20], // YouTube
            'pillar-3': [15, 10, 10], // Workflow
            'pillar-4': [20, 35, 10], // AI
            'pillar-5': [15, 15, 5],  // Editing
            'pillar-6': [15, 10, 15], // Mindset
            'pillar-7': [15, 5, 40]   // Business
        };
        const setIds = ['steady_state', 'growth_mode', 'launch_mode'];

        // We should clear old targets to ensure no junk remains
        // Since we can't query inside a write function easily without making it mixed usage, 
        // we will assume the caller understands this writes the strict 21. 
        // For a true "Purge", we'd need to delete the collection first.
        // Let's do a quick fetch-delete for safety if this is an "Initialize" action.
        const targetsSnap = await getDocs(collection(db, 'pillartargets'));
        targetsSnap.forEach(d => batch.delete(d.ref));
        log.push(`🗑️ Purged ${targetsSnap.size} old matrix records.`);

        let targetCount = 0;
        Object.entries(matrix).forEach(([pillarId, rates]) => {
            setIds.forEach((setId, index) => {
                const compositeId = `${setId}_${pillarId}`;
                batch.set(doc(db, 'pillartargets', compositeId), {
                    allocation_set_id: setId,
                    pillar_id: pillarId,
                    target_percentage: rates[index],
                    updatedAt: new Date()
                });
                targetCount++;
            });
        });
        log.push(`✅ Created ${targetCount} Strict Matrix Targets`);

        // --- COMMIT ---
        await batch.commit();
        return { success: true, log: log.join('\n') };

    } catch (e) {
        console.error("Master Seed Error:", e);
        return { success: false, error: e.message };
    }
};
