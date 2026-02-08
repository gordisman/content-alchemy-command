import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function useAllocationData() {
    const [sets, setSets] = useState([]);
    const [targets, setTargets] = useState({}); // Map: "setId_pillarId" -> target object
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);

        // 1. Listen to Allocation Sets
        const unsubSets = onSnapshot(collection(db, 'allocationsets'), (snapshot) => {
            const setsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            // Optional: Sort sets if needed (e.g. Steady, Growth, Launch) 
            // relying on client sort or order field if added later.
            // For now, sorting by name or just letting them be.
            // Explicit sort for known IDs
            const order = { 'steady_state': 1, 'growth_mode': 2, 'launch_mode': 3 };
            setsData.sort((a, b) => (order[a.id] || 99) - (order[b.id] || 99));

            setSets(setsData);
        });

        // 2. Listen to Pillar Targets
        const unsubTargets = onSnapshot(collection(db, 'pillartargets'), (snapshot) => {
            const tMap = {};
            snapshot.docs.forEach(d => {
                const data = d.data();
                // Key by composite ID or just use doc ID (which IS composite now)
                tMap[d.id] = { id: d.id, ...data };
            });
            setTargets(tMap);
            setLoading(false);
        });

        return () => {
            unsubSets();
            unsubTargets();
        };
    }, []);

    // Update Function
    const updateTarget = async (setId, pillarId, newValue) => {
        // Enforce composite ID
        const compositeId = `${setId}_${pillarId}`;
        const batch = writeBatch(db);
        const ref = doc(db, 'pillartargets', compositeId);

        batch.set(ref, {
            allocation_set_id: setId,
            pillar_id: pillarId,
            target_percentage: Number(newValue) // Ensure number
        }, { merge: true });

        await batch.commit();
    };

    // Batch Save Function (Manual Commit)
    const saveTargets = async (newTargetsMap) => {
        const batch = writeBatch(db);

        Object.values(newTargetsMap).forEach(target => {
            // Ensure we use the strict composite ID
            const compositeId = `${target.allocation_set_id}_${target.pillar_id}`;
            const ref = doc(db, 'pillartargets', compositeId);

            batch.set(ref, {
                allocation_set_id: target.allocation_set_id,
                pillar_id: target.pillar_id,
                target_percentage: Number(target.target_percentage),
                updatedAt: new Date()
            }, { merge: true });
        });

        await batch.commit();
    };

    // Switch active set
    const setActiveSet = async (setId) => {
        const batch = writeBatch(db);

        sets.forEach(set => {
            const ref = doc(db, 'allocationsets', set.id);
            batch.update(ref, {
                is_active: set.id === setId,
                updatedAt: new Date()
            });
        });

        await batch.commit();
    };

    return { sets, targets, loading, updateTarget, saveTargets, setActiveSet };
}
