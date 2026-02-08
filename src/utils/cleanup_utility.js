import { db } from '../lib/firebase';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';

/**
 * CLEANUP UTILITY
 * 
 * Safely wipes specific collections to clear "crap data".
 */

export const clearPostData = async () => {
    const batch = writeBatch(db);
    const log = [];

    try {
        // 1. Clear Posts
        const postsSnap = await getDocs(collection(db, 'posts'));
        postsSnap.forEach(d => batch.delete(d.ref));
        log.push(`🗑️ Deleted ${postsSnap.size} Posts`);

        // 2. Clear Ideas
        const ideasSnap = await getDocs(collection(db, 'ideas'));
        ideasSnap.forEach(d => batch.delete(d.ref));
        log.push(`🗑️ Deleted ${ideasSnap.size} Ideas`);

        // 3. Optional: Reset Post Counter in Settings
        const settingsRef = doc(db, 'settings', 'global');
        batch.update(settingsRef, { direct_entry_post_counter: 0 });
        log.push(`✅ Reset Direct Entry Counter to 0`);

        await batch.commit();
        return { success: true, log: log.join('\n') };
    } catch (e) {
        console.error("Cleanup Error:", e);
        return { success: false, error: e.message };
    }
};
