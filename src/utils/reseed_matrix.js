import { db } from '../lib/firebase';
import { collection, getDocs, doc, writeBatch, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

export const reseedMatrix = async () => {
    console.log("Starting Strict Matrix Refactor...");
    const batch = writeBatch(db);
    const log = [];

    try {
        // --- STEP 1: NORMALIZE PILLARS (pillar-1 to pillar-7) ---
        const settingsRef = doc(db, 'settings', 'global');
        const settingsSnap = await getDoc(settingsRef);
        if (!settingsSnap.exists()) throw new Error("Settings not found");

        let pillars = settingsSnap.data().content_pillars || [];

        // Define standard map based on User Spec
        const pillarSpecs = [
            { id: 'pillar-1', search: 'General Strategy' },
            { id: 'pillar-2', search: 'YouTube Clarity' },
            { id: 'pillar-3', search: 'Workflow' },
            { id: 'pillar-4', search: 'AI Tools' },
            { id: 'pillar-5', search: 'Editing' },
            { id: 'pillar-6', search: 'Mindset' },
            { id: 'pillar-7', search: 'Offers' }
        ];

        // Remap existing pillars to new IDs
        const newPillars = pillarSpecs.map(spec => {
            const found = pillars.find(p => p.name.toLowerCase().includes(spec.search.toLowerCase()));
            if (!found) {
                // Should not happen if seeded correctly, but fallback to create if missing?
                // For strict integrity, we want to know if it fails.
                log.push(`⚠️ Warning: Could not find existing pillar for '${spec.search}'.Preserving placeholder.`);
                return {
                    id: spec.id,
                    name: spec.search,
                    color: '#000000',
                    active: true,
                    description: 'Refactored Placeholder'
                };
            }
            // Return with NEW ID but keep other props
            return {
                ...found,
                id: spec.id
            };
        });

        // Update Settings with new Pillar IDs
        batch.update(settingsRef, { content_pillars: newPillars });
        log.push(`Updated Pillar IDs to strict pillar-1...pillar-7 format.`);


        // --- STEP 2: RE-CREATE ALLOCATION SETS (Slug IDs) ---

        // First, fetch and delete ALL existing sets to ensure we don't have dupes
        const setsCollection = collection(db, 'allocationsets');
        const existingSets = await getDocs(setsCollection);
        existingSets.forEach(d => batch.delete(d.ref));

        const allocationSets = [
            { id: 'steady_state', name: 'Steady State', order: 1, description: 'Balanced content mix for consistent growth' },
            { id: 'growth_mode', name: 'Growth Mode', order: 2, description: 'Maximum reach with trending AI tools' },
            { id: 'launch_mode', name: 'Launch Mode', order: 3, description: 'Heavy emphasis on offers and sales' }
        ];

        allocationSets.forEach(set => {
            const ref = doc(db, 'allocationsets', set.id);
            batch.set(ref, {
                set_name: set.name,
                description: set.description,
                is_active: set.id === 'steady_state' // Default active
            });
        });
        log.push(`Re-created 3 Allocation Sets with strict slugs.`);


        // --- STEP 3: RE-CREATE PILLAR TARGETS (Composite IDs) ---

        // Delete ALL existing targets
        const targetsCollection = collection(db, 'pillartargets');
        const existingTargets = await getDocs(targetsCollection);
        existingTargets.forEach(d => batch.delete(d.ref));

        // Define matrix values [Steady, Growth, Launch]
        const matrix = {
            'pillar-1': [0, 0, 0],
            'pillar-2': [20, 25, 20],
            'pillar-3': [15, 10, 10],
            'pillar-4': [20, 35, 10],
            'pillar-5': [15, 15, 5],
            'pillar-6': [15, 10, 15],
            'pillar-7': [15, 5, 40]
        };

        const setIds = ['steady_state', 'growth_mode', 'launch_mode'];

        let targetCount = 0;
        Object.entries(matrix).forEach(([pillarId, rates]) => {
            setIds.forEach((setId, index) => {
                const compositeId = `${setId}_${pillarId}`;
                const ref = doc(db, 'pillartargets', compositeId);

                batch.set(ref, {
                    allocation_set_id: setId,
                    pillar_id: pillarId,
                    target_percentage: rates[index],
                    updatedAt: new Date()
                });
                targetCount++;
            });
        });

        log.push(`Created ${targetCount} strict PillarTarget records.`);

        // --- COMMIT ---
        await batch.commit();

        return { success: true, log: log.join('\n') };

    } catch (e) {
        console.error(e);
        return { success: false, error: e.message };
    }
};
