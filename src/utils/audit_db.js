import { db } from '../lib/firebase';
import { collection, getDocs, query, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { formatPostId } from './postIdFormatter';

export const auditDatabase = async () => {
    let report = "--- SYSTEM INSPECTOR REPORT ---\n";
    const runTime = new Date().toLocaleString();
    report += `Generated: ${runTime}\n`;
    report += `NOTE: Displaying details for the most recent 50 records per entity.\n`;

    // 1. Audit Ideas (Top Priority)
    report += "\n[IDEAS - RECENT 50]\n";
    try {
        // Fetch Global Counters
        const ideaCounterSnap = await getDoc(doc(db, 'counters', 'idea'));
        const nextIdeaNum = ideaCounterSnap.exists() ? ideaCounterSnap.data().current + 1 : '100 (Default)';

        // Fetch Total Count (Lightweight)
        const allIdeasSnap = await getDocs(query(collection(db, 'ideas')));
        report += `  TOTAL COUNT: ${allIdeasSnap.size}\n`;
        report += `  NEXT SEQUENTIAL ID: ${nextIdeaNum}\n`;
        report += `  ----------------------------------------\n`;

        // Simple limit to avoid index requirements for now
        // If an index exists on 'updatedAt', we could sort, but default to natural order/limit for safety
        const q = query(collection(db, 'ideas'), limit(50));
        const ideasSnap = await getDocs(q);

        if (ideasSnap.empty) {
            report += "  (Empty)\n";
        } else {
            report += `  Found ${ideasSnap.size} recent records:\n`;

            // Print Details
            ideasSnap.docs.forEach(doc => {
                const d = doc.data();
                const id = d.idea_number ? `#IDEA-${d.idea_number}` : doc.id;
                const title = d.master_title || '(No Title)';
                const status = d.status || 'unknown';
                const pillar = d.pillar || 'none';
                report += `  • ${id.padEnd(10)} | ${status.padEnd(12)} | ${title.substring(0, 50)}\n`;
            });

            report += `\n  Status Breakdown: \n`;
            const counts = {};
            ideasSnap.docs.forEach(d => {
                const s = d.data().status || 'unknown';
                counts[s] = (counts[s] || 0) + 1;
            });
            Object.entries(counts).forEach(([k, v]) => report += `    - ${k}: ${v}\n`);
        }
    } catch (e) {
        report += `  Error: ${e.message}\n`;
    }

    // 2. Audit Posts
    report += "\n[POSTS - RECENT 50]\n";
    try {
        // Fetch Global Counters
        // Fetch Global Counters
        const postCounterSnap = await getDoc(doc(db, 'counters', 'd_post'));
        const currentDirectPostNum = postCounterSnap.exists() ? (postCounterSnap.data().current || 0) : 0;
        const nextDirectPostNum = Number(currentDirectPostNum) + 1;

        // Fetch Total Count
        const allPostsSnap = await getDocs(query(collection(db, 'posts')));
        report += `  TOTAL COUNT: ${allPostsSnap.size}\n`;
        report += `  NEXT DIRECT POST (#D) SEQUENTIAL ID: ${nextDirectPostNum}\n`;
        report += `  ----------------------------------------\n`;

        const q = query(collection(db, 'posts'), limit(50));
        const postsSnap = await getDocs(q);

        if (postsSnap.empty) {
            report += "  (Empty)\n";
        } else {
            report += `  Found ${postsSnap.size} recent records:\n`;

            // PRE-FETCH: Get unique Idea IDs to resolve Post IDs
            const ideaIds = new Set();
            postsSnap.docs.forEach(d => {
                const pd = d.data();
                if (pd.idea_id) ideaIds.add(pd.idea_id);
            });

            // Fetch Ideas in Map
            const ideaMap = new Map();
            if (ideaIds.size > 0) {
                try {
                    // Using Promise.all for simplicity (Firestore 'in' limit is 10, so batching is complex)
                    const promises = Array.from(ideaIds).map(id => getDoc(doc(db, 'ideas', id)));
                    const ideaDocs = await Promise.all(promises);
                    ideaDocs.forEach(d => {
                        if (d.exists()) ideaMap.set(d.id, d.data());
                    });
                } catch (err) {
                    report += `  (Warning: Failed to resolve some parent ideas: ${err.message})\n`;
                }
            }

            // Print Details
            postsSnap.docs.forEach(doc => {
                const d = doc.data();
                const idea = d.idea_id ? ideaMap.get(d.idea_id) : null;

                // Use Formatter or Fallback
                const formattedId = formatPostId(d, idea);
                const id = formattedId || doc.id; // Fallback to doc ID if format returns null (e.g. no idea found)

                const title = d.post_title || '(No Title)';
                const platform = d.platform || 'unknown';
                const status = d.status || 'unknown';
                // Format: #POST-123 | twitter    | scheduled | Title...
                // Increase pad for ID since formatted IDs can be longer (#POST-1234-1)
                report += `  • ${id.padEnd(15)} | ${platform.padEnd(10)} | ${status.padEnd(10)} | ${title.substring(0, 40)}\n`;
            });

            const drafts = postsSnap.docs.filter(d => d.data().status === 'draft').length;
            if (drafts > 0) report += `\n  (Note: ${drafts} drafts in this batch)\n`;
        }
    } catch (e) {
        report += `  Error: ${e.message}\n`;
    }

    // 3. Global Settings (Full Dump)
    report += "\n[GLOBAL SETTINGS]\n";
    try {
        const settingsSnap = await getDoc(doc(db, 'settings', 'global'));
        if (!settingsSnap.exists()) {
            report += "  (Settings Document Missing)\n";
        } else {
            const data = settingsSnap.data();
            // Filter out large arrays like content_pillars / lane_visibility for readability if needed,
            // but user asked for "all setting values". We'll print primitives and simplify arrays.
            Object.entries(data).forEach(([key, value]) => {
                if (key === 'content_pillars') {
                    report += `  ${key}: [Array of ${value.length} pillars]\n`;
                    // Optional: Print pillar names
                    value.forEach(p => report += `    - ${p.name} (${p.id})\n`);
                } else if (typeof value === 'object' && value !== null) {
                    report += `  ${key}: ${JSON.stringify(value)}\n`;
                } else {
                    report += `  ${key}: ${value}\n`;
                }
            });
        }
    } catch (e) {
        report += `  Error: ${e.message}\n`;
    }

    // 4. Allocation Sets
    report += "\n[ALLOCATION SETS]\n";
    try {
        const setsSnap = await getDocs(collection(db, 'allocationsets'));
        if (setsSnap.empty) {
            report += "  (Empty)\n";
        } else {
            setsSnap.forEach(doc => {
                const d = doc.data();
                report += `  • ${d.set_name} | ID: ${doc.id} | Active: ${d.is_active}\n`;
            });
        }
    } catch (e) {
        report += `  Error: ${e.message}\n`;
    }

    // 5. Pillar Targets (FULL)
    report += "\n[PILLAR MATRIX TARGETS]\n";
    try {
        const targetsSnap = await getDocs(collection(db, 'pillartargets'));
        if (targetsSnap.empty) {
            report += "  (Empty)\n";
        } else {
            report += `  Count: ${targetsSnap.size} records (Full List).\n`;
            // Sort by Set ID then Pillar ID for readability
            const sortedDocs = targetsSnap.docs.map(d => d.data()).sort((a, b) => {
                if (a.allocation_set_id !== b.allocation_set_id) return a.allocation_set_id.localeCompare(b.allocation_set_id);
                return a.pillar_id.localeCompare(b.pillar_id);
            });

            sortedDocs.forEach(d => {
                report += `  • ${d.allocation_set_id.padEnd(15)} > ${d.pillar_id.padEnd(10)}: ${d.target_percentage}%\n`;
            });
        }
    } catch (e) {
        report += `  Error: ${e.message}\n`;
    }

    report += "\n--- END REPORT ---";
    return report;
};
