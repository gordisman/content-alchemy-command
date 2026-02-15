import { db } from '../lib/firebase';
import { collection, getDocs, doc, writeBatch, Timestamp } from 'firebase/firestore';

/**
 * Exports all critical collections (ideas, posts, settings, pillars) to a JSON object.
 * This object can be downloaded as a file for backup.
 */
export const exportSystemData = async () => {
    try {
        const collectionsToExport = ['ideas', 'posts', 'settings', 'content_pillars', 'users'];
        const exportData = {
            metadata: {
                version: '1.0',
                exportDate: new Date().toISOString(),
                environment: 'production' // or dev
            },
            data: {}
        };

        for (const colName of collectionsToExport) {
            const querySnapshot = await getDocs(collection(db, colName));
            exportData.data[colName] = [];

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                // Convert Firestore Timestamps to ISO strings for JSON compatibility
                const serializableData = Object.keys(data).reduce((acc, key) => {
                    const value = data[key];
                    if (value instanceof Timestamp) {
                        acc[key] = { _type: 'timestamp', value: value.toDate().toISOString() };
                    } else if (value && typeof value === 'object' && value.seconds && value.nanoseconds) {
                        // Catch raw timestamp objects if not instance of class
                        acc[key] = { _type: 'timestamp', value: new Date(value.seconds * 1000).toISOString() };
                    } else {
                        acc[key] = value;
                    }
                    return acc;
                }, {});

                exportData.data[colName].push({
                    id: doc.id,
                    ...serializableData
                });
            });
        }

        return exportData;
    } catch (error) {
        console.error("Export failed:", error);
        throw new Error("Failed to export system data: " + error.message);
    }
};

/**
 * Restores system data from a JSON object.
 * WARNING: This can overwrite existing data depending on implementation.
 * Current strategy: Merge/Overwrite by ID.
 */
export const restoreSystemData = async (jsonData) => {
    try {
        if (!jsonData || !jsonData.data) throw new Error("Invalid backup file format");

        let batch = writeBatch(db);
        let opCount = 0;
        const BATCH_LIMIT = 450; // Firestore batch limit is 500

        for (const [colName, items] of Object.entries(jsonData.data)) {
            for (const item of items) {
                const ref = doc(db, colName, item.id);
                const { id, ...data } = item;

                // Rehydrate Timestamps (Basic check)
                // Note: For deep timestamp rehydration, a recursive function is better, 
                // but this top-level check is usually sufficient for our flat data.
                const rehydratedData = Object.keys(data).reduce((acc, key) => {
                    const value = data[key];
                    // Check specifically for our serialized format
                    if (value && typeof value === 'object' && value._type === 'timestamp') {
                        acc[key] = Timestamp.fromDate(new Date(value.value));
                    } else {
                        acc[key] = value;
                    }
                    return acc;
                }, {});

                batch.set(ref, rehydratedData, { merge: true });
                opCount++;

                // Commit if batch is full
                if (opCount >= BATCH_LIMIT) {
                    await batch.commit();
                    batch = writeBatch(db); // CRITICAL: Start a new batch
                    opCount = 0;
                }
            }
        }

        // Commit any remaining operations
        if (opCount > 0) {
            await batch.commit();
        }

        return { success: true, message: "Restoration complete." };
    } catch (error) {
        console.error("Restore failed:", error);
        return { success: false, error: error.message };
    }
};

/**
 * Exports a single post as a JSON file (Surgical Backup).
 * Wraps it in the standard 'posts' array structure so the Import tool works natively.
 */
export const exportSinglePost = (post) => {
    try {
        if (!post || !post.id) throw new Error("Invalid post data");

        // 1. Prepare the data wrapper (mimic full system export structure)
        const exportData = {
            metadata: {
                version: '1.0',
                exportDate: new Date().toISOString(),
                type: 'surgical_post_export',
                environment: 'production'
            },
            data: {
                posts: [] // The Import tool iterates over keys, so this matches 'posts' collection
            }
        };

        // 2. Serialize the single post (Handle Timestamps)
        const serializablePost = Object.keys(post).reduce((acc, key) => {
            const value = post[key];
            if (value instanceof Timestamp) {
                acc[key] = { _type: 'timestamp', value: value.toDate().toISOString() };
            } else if (value && typeof value === 'object' && value.seconds && value.nanoseconds) {
                acc[key] = { _type: 'timestamp', value: new Date(value.seconds * 1000).toISOString() };
            } else {
                acc[key] = value;
            }
            return acc;
        }, {});

        // 3. Add to wrapper
        exportData.data.posts.push({
            id: post.id,
            ...serializablePost
        });

        // 4. Trigger Download
        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `post_snapshot_${post.id}_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        return true;
    } catch (e) {
        console.error("Single Export Failed:", e);
        return false;
    }
};
