import { useState, useEffect } from 'react';
import {
    collection,
    onSnapshot,
    query,
    orderBy,
    addDoc,
    updateDoc,
    deleteDoc,
    doc
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export function useIdeas() {
    const [ideas, setIdeas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        setLoading(true);
        // Subscribe to ideas collection, ordered by creation date (newest first)
        const q = query(collection(db, 'ideas'), orderBy('created_date', 'desc'));

        const unsubscribe = onSnapshot(q,
            (snapshot) => {
                const ideasList = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setIdeas(ideasList);
                setLoading(false);
            },
            (err) => {
                console.error("Error fetching ideas:", err);
                setError(err.message);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    const addIdea = async (ideaData) => {
        try {
            // Auto-increment logic should ideally be server-side or transactional, 
            // but for simple MVP client-side, we get max number from existing list.
            // Safest is to let user/UI handle default numbers or use a transaction.
            // Here, we just add the doc.
            await addDoc(collection(db, 'ideas'), {
                ...ideaData,
                created_date: new Date().toISOString()
            });
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    const updateIdea = async (id, data) => {
        try {
            const ideaRef = doc(db, 'ideas', id);
            await updateDoc(ideaRef, data);
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    const deleteIdea = async (id) => {
        try {
            await deleteDoc(doc(db, 'ideas', id));
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    return {
        ideas,
        loading,
        error,
        addIdea,
        updateIdea,
        deleteIdea
    };
}
