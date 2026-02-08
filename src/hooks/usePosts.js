import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc, runTransaction } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function usePosts() {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Determine query: for Studio, we probably want all non-archived posts? 
        // Or just fetch all and filter client side for now since volume is low.
        const postsRef = collection(db, 'posts');
        const q = query(postsRef, orderBy('updated_at', 'desc')); // Standardized to updated_at

        // If schema doesn't have updated_date yet (might be missing in initial seed/manual entry), 
        // we might need to be careful. The scaffolded schema had 'display_order'.
        // Let's just fetch all for now.

        const unsubscribe = onSnapshot(collection(db, 'posts'), (snapshot) => {
            const loadedPosts = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setPosts(loadedPosts);
            setLoading(false);
        }, (err) => {
            console.error("Error fetching posts:", err);
            setError(err.message);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const addPost = async (postData) => {
        try {
            if (postData.is_direct_entry) {
                // Direct Entry: Use Transaction to get unique D-Sequence
                const result = await runTransaction(db, async (transaction) => {
                    const settingsRef = doc(db, 'settings', 'global'); // Corrected from 'general' to 'global'
                    const settingsDoc = await transaction.get(settingsRef);

                    let currentCounter = 0;
                    if (settingsDoc.exists()) {
                        currentCounter = settingsDoc.data().direct_entry_post_counter || 0;
                    }

                    const newCounter = currentCounter + 1;

                    // 1. Update Counter (Set merge: true ensures doc creation if missing)
                    transaction.set(settingsRef, { direct_entry_post_counter: newCounter }, { merge: true });

                    // 2. Create Post with new Sequence
                    const newPostRef = doc(collection(db, 'posts'));
                    transaction.set(newPostRef, {
                        ...postData,
                        direct_entry_sequence: newCounter,
                        created_at: new Date(),
                        updated_at: new Date()
                    });
                    return newPostRef.id;
                });
                return result; // result is newPostRef.id
            } else {
                // Standard Idea-Linked Post (Sequence handled by frontend or irrelevant for now)
                const docRef = await addDoc(collection(db, 'posts'), {
                    ...postData,
                    created_at: new Date(),
                    updated_at: new Date()
                });
                return docRef.id;
            }
        } catch (err) {
            console.error("Error adding post:", err);
            throw err;
        }
    };

    const updatePost = async (id, data) => {
        try {
            // Check if we need to assign a Direct Entry Sequence (Transition logic)
            if (data.is_direct_entry) {
                await runTransaction(db, async (transaction) => {
                    const postRef = doc(db, 'posts', id);
                    const postDoc = await transaction.get(postRef);
                    if (!postDoc.exists()) throw "Post does not exist!";

                    const existingPost = postDoc.data();

                    // Specifically check if we are MISSING a sequence for a Direct Entry
                    if (!existingPost.direct_entry_sequence && !data.direct_entry_sequence) {
                        const settingsRef = doc(db, 'settings', 'global');
                        const settingsDoc = await transaction.get(settingsRef);

                        let currentCounter = 0;
                        if (settingsDoc.exists()) {
                            currentCounter = settingsDoc.data().direct_entry_post_counter || 0;
                        }

                        const newCounter = currentCounter + 1;

                        // 1. Update Counter
                        transaction.set(settingsRef, { direct_entry_post_counter: newCounter }, { merge: true });

                        // 2. Update Post with new Sequence AND Data
                        transaction.update(postRef, {
                            ...data,
                            direct_entry_sequence: newCounter,
                            updated_at: new Date()
                        });
                    } else {
                        // Already has sequence, just update data
                        transaction.update(postRef, {
                            ...data,
                            updated_at: new Date()
                        });
                    }
                });
            } else {
                // Standard Update
                const postRef = doc(db, 'posts', id);
                await updateDoc(postRef, {
                    ...data,
                    updated_at: new Date()
                });
            }
        } catch (err) {
            console.error("Error updating post:", err);
            throw err;
        }
    };

    const deletePost = async (id) => {
        try {
            await deleteDoc(doc(db, 'posts', id));
        } catch (err) {
            console.error("Error deleting post:", err);
            throw err;
        }
    };

    return { posts, loading, error, addPost, updatePost, deletePost };
}
