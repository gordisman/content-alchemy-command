import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function useSettings() {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const settingsRef = doc(db, 'settings', 'global');

        const unsubscribe = onSnapshot(settingsRef, (doc) => {
            if (doc.exists()) {
                setSettings(doc.data());
            } else {
                setError('Global settings not found');
            }
            setLoading(false);
        }, (err) => {
            console.error("Error fetching settings:", err);
            setError(err.message);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Timeout Fallback
    useEffect(() => {
        const timer = setTimeout(() => {
            if (loading) {
                console.warn("Settings loading timed out. Check Emulator connection.");
                setError("Connection Timeout: Could not reach Firestore Emulators. Ensure they are running and ports match (8080).");
                setLoading(false);
            }
        }, 5000);
        return () => clearTimeout(timer);
    }, [loading]);

    return { settings, loading, error };
}
