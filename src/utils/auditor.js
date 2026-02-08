import { db } from '../lib/firebase';
import { doc, getDoc, getDocs, collection } from 'firebase/firestore';

export const runSystemAudit = async (user) => {
    const report = {
        timestamp: new Date().toISOString(),
        authStatus: user ? `Authenticated as ${user.email}` : 'Not Authenticated',
        collections: {},
        integrity: {
            settings: false,
            pillars: { count: 0, status: 'Unknown' },
            allocationSets: { count: 0, status: 'Unknown' },
            pillarTargets: { count: 0, status: 'Unknown' }
        },
        errors: []
    };

    try {
        // 1. Check Settings (Global Singleton)
        const settingsRef = doc(db, 'settings', 'global');
        const settingsSnap = await getDoc(settingsRef);

        if (settingsSnap.exists()) {
            report.collections.settings = 1;
            report.integrity.settings = true;

            const settingsData = settingsSnap.data();
            const pillars = settingsData.content_pillars || [];
            report.integrity.pillars.count = pillars.length;
            report.integrity.pillars.status = pillars.length === 7 ? '✅ Correct (7)' : `❌ Expected 7, found ${pillars.length}`;

        } else {
            report.collections.settings = 0;
            report.integrity.settings = false;
            report.errors.push("Accidental Singleton: 'settings/global' document missing.");
        }

        // 2. Check Allocation Sets
        const allocSnap = await getDocs(collection(db, 'allocationsets'));
        report.collections.allocationsets = allocSnap.size;
        report.integrity.allocationSets.count = allocSnap.size;
        report.integrity.allocationSets.status = allocSnap.size === 3 ? '✅ Correct (3)' : `❌ Expected 3, found ${allocSnap.size}`;

        // 3. Check Pillar Targets
        const targetsSnap = await getDocs(collection(db, 'pillartargets'));
        report.collections.pillartargets = targetsSnap.size;
        report.integrity.pillarTargets.count = targetsSnap.size;
        report.integrity.pillarTargets.status = `Found ${targetsSnap.size} targets`;

    } catch (error) {
        report.errors.push(error.message);
    }

    return report;
};
