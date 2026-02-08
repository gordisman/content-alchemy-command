import { db } from '../lib/firebase';
import { doc, setDoc, writeBatch, collection } from 'firebase/firestore';
import { SEED_DATA } from './seedData';

export const seedDatabase = async () => {
    const batch = writeBatch(db);
    const log = [];

    try {
        // 1. Seed Settings (Singleton)
        const settingsRef = doc(db, 'settings', 'global');
        batch.set(settingsRef, SEED_DATA.settings);
        log.push(`Scheduled write: Settings 'global'`);

        // 2. Seed Allocation Sets
        SEED_DATA.allocationSets.forEach(set => {
            const setRef = doc(db, 'allocationsets', set.id);
            batch.set(setRef, set);
            log.push(`Scheduled write: AllocationSet '${set.set_name}'`);
        });

        // 3. Seed Pillar Targets
        SEED_DATA.pillarTargets.forEach((target, index) => {
            // Create a composite ID for the target
            const targetId = `${target.allocation_set_id}_${target.pillar_id}`;
            const targetRef = doc(db, 'pillartargets', targetId);
            batch.set(targetRef, target);
            // log.push(`Scheduled write: PillarTarget ${targetId}`); // Verbose
        });
        log.push(`Scheduled write: ${SEED_DATA.pillarTargets.length} Pillar Targets`);

        await batch.commit();
        return { success: true, log };
    } catch (error) {
        console.error("Seeding failed:", error);
        return { success: false, error: error.message };
    }
};
