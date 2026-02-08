import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { toast } from 'sonner';

export const fixPillars = async () => {
    console.log("Starting One-Time Pillar Fix...");
    try {
        const docRef = doc(db, 'settings', 'global');
        const snap = await getDoc(docRef);

        if (!snap.exists()) {
            console.error("Settings document not found!");
            return;
        }

        const data = snap.data();
        let pillars = data.content_pillars || [];

        console.log("Current Pillars:", pillars);

        // 1. Find or Create Anchor
        let anchorIndex = pillars.findIndex(p => p.name.startsWith('!'));
        let anchor;

        if (anchorIndex !== -1) {
            anchor = pillars[anchorIndex];
            // Remove it from array to re-insert at top
            pillars.splice(anchorIndex, 1);
        } else {
            // Create default if missing (fallback)
            anchor = {
                id: `pillar-${Date.now()}`,
                name: '! General Strategy / Unassigned',
                color: '#8b5cf6', // Violet
                active: true,
                description: 'Default bucket for ideas that need sorting.'
            };
        }

        // Ensure Anchor is strictly named
        if (!anchor.name.startsWith('!')) {
            anchor.name = '!' + anchor.name;
        }
        anchor.active = true; // Force active

        // 2. Process Remainder
        // Remove '!' from others if present
        pillars = pillars.map(p => ({
            ...p,
            name: p.name.startsWith('!') ? p.name.substring(1).replace(/^ +/, '') : p.name
        }));

        // 3. Reassemble
        const finalPillars = [anchor, ...pillars];

        // Ensure we have exactly 7 slots (optional, but good for "Command Center" feel)
        // If user wants strict 1-7, ensure we don't have too many or too few?
        // For now, just keeping existing + anchor.

        // 4. Write back
        await updateDoc(docRef, {
            content_pillars: finalPillars
        });

        console.log("Pillars Fixed and Saved:", finalPillars);
        console.log("Pillars Fixed and Saved:", finalPillars);
        toast.success("Pillars Cleaned", { description: "Re-indexing and formatting complete." });
        setTimeout(() => window.location.reload(), 1500);

    } catch (error) {
        console.error("Fix failed:", error);
        toast.error("Cleanup Failed", { description: error.message });
    }
};
