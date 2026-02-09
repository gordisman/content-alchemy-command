import React, { useState, useEffect } from 'react';
import { useSettings } from '../hooks/useSettings';
import { runSystemAudit } from '../utils/auditor';
import { seedDatabase } from '../utils/seeder';
import { auth, db, functions } from '../lib/firebase';
import { doc, updateDoc, collection, query, where, getDocs, setDoc, getDoc, onSnapshot, addDoc, deleteDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { Shield, Database, RefreshCw, AlertTriangle, Check, Grid3X3, User, Mail, Globe, Clock, FileText, Trash2, Plus, Pencil, X, Settings as SettingsIcon, Repeat } from 'lucide-react';
import { SORTED_PLATFORMS } from '../config/platforms';
import { ADMIN_WHITELIST } from '../config/admin_whitelist';
import { Button } from "@/components/ui/button";
import { auditDatabase } from '../utils/audit_db';
import { initializeSystemDefaults } from '../utils/master_seed';
import { clearPostData } from '../utils/cleanup_utility';
import { seedHighConfidenceData } from '../utils/high_confidence_seeder';
import { Switch } from "@/components/ui/switch";
import StrategyAllocationMatrix from '../components/settings/StrategyAllocationMatrix';
import AlertPreviewModal from '../components/settings/AlertPreviewModal';
import { toast } from "sonner";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Settings() {
    const { settings, loading, error } = useSettings();
    const [auditReport, setAuditReport] = useState(null);
    const [status, setStatus] = useState('');
    const [currentUser, setCurrentUser] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);

    // User Management State
    const [users, setUsers] = useState([]);
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserRole, setNewUserRole] = useState('user');

    // User Edit State
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ email: '', role: 'user' });

    // Deactivation Dialog State
    const [deactivateConfirmOpen, setDeactivateConfirmOpen] = useState(false);
    const [pendingPlatformId, setPendingPlatformId] = useState(null);
    const [publishedCount, setPublishedCount] = useState(0);

    // Generic Confirmation Dialog
    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        title: '',
        description: '',
        onConfirm: null,
        variant: 'default'
    });

    // Real-time Users Subscription
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
            const userList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setUsers(userList);
        });
        return () => unsubscribe();
    }, []);

    // ... new state for alerts
    const [alertConfig, setAlertConfig] = useState({
        recipients: '',
        time: '09:00',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        guide_url: '',
        app_url: ''
    });

    // Alert Preview State
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [previewHtml, setPreviewHtml] = useState('');
    const [previewStats, setPreviewStats] = useState(null);
    const [isSendingReal, setIsSendingReal] = useState(false);
    const [initLoading, setInitLoading] = useState(false);
    const [integrations, setIntegrations] = useState({
        automation_enabled: false,
        cloudinary_cloud_name: '',
        cloudinary_api_key: '',
        outstand_webhook_url: ''
    });

    const [storageConfig, setStorageConfig] = useState({
        retention_active: false,
        retention_days: 30
    });

    const [evergreenConfig, setEvergreenConfig] = useState({
        repurpose_cycle: 365,
        snooze_duration: 90
    });

    // Load Settings into Alert Config
    useEffect(() => {
        if (settings) {
            setAlertConfig({
                recipients: settings.alert_recipients || '',
                time: settings.alert_time || '09:00',
                timezone: settings.alert_timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
                guide_url: settings.report_guide_url || '',
                app_url: settings.app_url || window.location.origin
            });
            setStorageConfig({
                retention_active: settings.storage_controls?.retention_active || false,
                retention_days: settings.storage_controls?.retention_days || 30
            });
            setIntegrations({
                automation_enabled: settings.automation_enabled || false,
                cloudinary_cloud_name: settings.cloudinary_cloud_name || '',
                cloudinary_api_key: settings.cloudinary_api_key || '',
                outstand_webhook_url: settings.outstand_webhook_url || ''
            });
            setEvergreenConfig({
                repurpose_cycle: settings.repurpose_cycle || 365,
                snooze_duration: settings.snooze_duration || 90
            });
        }
    }, [settings]);

    // User & Admin Bootstrap Logic (Real-time & Auto-Claim)
    useEffect(() => {
        let unsubscribeUserDoc;

        const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
            if (user) {
                setCurrentUser(user);

                // Subscribe to User Doc for Role Changes
                unsubscribeUserDoc = onSnapshot(doc(db, 'users', user.uid), async (docSnap) => {
                    if (docSnap.exists()) {
                        const userData = docSnap.data();
                        setIsAdmin(userData.role === 'admin');
                    } else {
                        setIsAdmin(false);
                        // AUTO-BOOTSTRAP: Whitelist Check
                        const isWhitelisted = ADMIN_WHITELIST.map(e => e.toLowerCase()).includes(user.email?.toLowerCase());

                        if (isWhitelisted) {
                            try {
                                await setDoc(doc(db, 'users', user.uid), {
                                    email: user.email,
                                    role: 'admin',
                                    createdAt: new Date(), // Or preserve existing if merge
                                    promotedAt: new Date(),
                                    promotionReason: 'whitelist'
                                }, { merge: true });

                                toast.success("👑 Admin Access Granted", {
                                    description: "Your account has been recognized as a System Administrator."
                                });
                                // Local state update will happen via snapshot listener automatically
                            } catch (e) { console.error("Auto-claim failed", e); }
                        } else if (window.location.hostname === "localhost" && !docSnap.exists()) {
                            // Keep localhost fallback ONLY for totally new users on dev
                            // But Whitelist is preferred.
                        }
                    }
                });
            } else {
                setCurrentUser(null);
                setIsAdmin(false);
                if (unsubscribeUserDoc) unsubscribeUserDoc();
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeUserDoc) unsubscribeUserDoc();
        };
    }, []);

    const handleAddUser = async () => {
        if (!newUserEmail.trim()) {
            toast.error("Validation Error", { description: "Please enter an email address." });
            return;
        }

        // Check for duplicate
        if (users.some(u => u.email?.toLowerCase() === newUserEmail.trim().toLowerCase())) {
            toast.error("User already exists!");
            return;
        }

        try {
            await addDoc(collection(db, 'users'), {
                email: newUserEmail.trim(),
                role: newUserRole,
                createdAt: new Date(),
                createdBy: currentUser?.email || 'system'
            });
            setNewUserEmail('');
            toast.success("User Authorized", { description: `User ${newUserEmail} authorized as ${newUserRole}.` });
        } catch (e) {
            console.error("Error adding user:", e);
            toast.error("Failed to add user", { description: e.message });
        }
    };

    const handleRemoveUser = (userId, userEmail) => {
        setConfirmDialog({
            open: true,
            title: "Remove User Access",
            description: `Are you sure you want to remove access for ${userEmail}? This action cannot be undone.`,
            variant: "destructive",
            onConfirm: async () => {
                try {
                    await deleteDoc(doc(db, 'users', userId));
                    toast.success("User removed successfully.");
                } catch (e) {
                    console.error("Error removing user:", e);
                    toast.error("Failed to remove user", { description: e.message });
                }
            }
        });
    };

    const startEdit = (user) => {
        setEditingId(user.id);
        setEditForm({ email: user.email, role: user.role });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditForm({ email: '', role: 'user' });
    };

    const saveEdit = async () => {
        if (!editingId) return;
        try {
            await updateDoc(doc(db, 'users', editingId), {
                email: editForm.email,
                role: editForm.role
            });
            setEditingId(null);
        } catch (e) {
            console.error(e);
            toast.error("Failed to update user", { description: e.message });
        }
    };

    const handleBootstrapAdmin = async () => {
        if (!currentUser) return;
        try {
            await setDoc(doc(db, 'users', currentUser.uid), {
                email: currentUser.email,
                role: 'admin',
                createdAt: new Date()
            }, { merge: true });
            setIsAdmin(true);
            toast.success("👑 Admin Access Granted", { description: "You now have full administrative privileges." });
        } catch (e) {
            console.error(e);
            toast.error("Bootstrap Failed", { description: e.message });
        }
    };

    const handleInitializeSystem = () => {
        setConfirmDialog({
            open: true,
            title: "⛔ DANGER: SYSTEM RESET",
            description: "This will WIPE and RESET the entire system configuration to Golden Data defaults (Lanes, Pillars, Sets, Matrix). This cannot be undone.",
            variant: "destructive",
            onConfirm: async () => {
                setInitLoading(true);
                try {
                    const res = await initializeSystemDefaults();
                    if (res.success) {
                        toast.success("System Initialized", { description: "Golden Defaults have been restored." });
                        setTimeout(() => window.location.reload(), 1500);
                    } else {
                        toast.error("Initialization Failed", { description: res.error });
                    }
                } catch (err) {
                    toast.error("Initialization Failed", { description: err.message });
                } finally {
                    setInitLoading(false);
                }
            }
        });
    };

    const handleSaveAlerts = async () => {
        // Validation: Check recipients against Authorized Users
        const recipients = alertConfig.recipients.split(',').map(e => e.trim()).filter(e => e);
        const authorizedEmails = new Set(users.map(u => u.email?.toLowerCase()));

        const invalid = recipients.filter(email => !authorizedEmails.has(email.toLowerCase()));

        if (invalid.length > 0) {
            toast.error("Validation Failed", {
                description: `Authorized users only. Unauthorized: ${invalid.join(', ')}`
            });
            return;
        }

        await updateDoc(doc(db, 'settings', 'global'), {
            alert_recipients: alertConfig.recipients,
            alert_time: alertConfig.time,
            alert_timezone: alertConfig.timezone,
            report_guide_url: alertConfig.guide_url,
            app_url: alertConfig.app_url
        });
        toast.success("Alert Config Saved");
    };

    const handleSaveEvergreen = async () => {
        try {
            await updateDoc(doc(db, 'settings', 'global'), {
                repurpose_cycle: parseInt(evergreenConfig.repurpose_cycle) || 365,
                snooze_duration: parseInt(evergreenConfig.snooze_duration) || 90
            });
            toast.success("Evergreen Settings Saved");
        } catch (e) {
            console.error(e);
            toast.error("Failed to save settings");
        }
    };

    // TEST SEEDER FOR EVERGREEN
    const seedEvergreenTest = async () => {
        try {
            const today = new Date();
            const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
            const twoDaysAgo = new Date(today); twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

            // Fetch Current Counter for valid IDs
            const settingsRef = doc(db, 'settings', 'global');
            const settingsSnap = await getDoc(settingsRef);
            let startCounter = (settingsSnap.exists() ? settingsSnap.data().direct_entry_post_counter : 0) || 0;

            const testPosts = [
                {
                    post_title: "Evergreen Concept: The flywheel effect",
                    content: "This is a timeless principle about consistency.",
                    platform: "linkedin",
                    status: "published",
                    is_evergreen: true,
                    is_direct_entry: true,
                    direct_entry_sequence: startCounter + 1,
                    repurpose_date: yesterday, // Ready
                    created_at: new Date("2024-01-01"),
                    publish_date: new Date("2024-01-02"),
                    definitive_pillar: "pillar-1766-4115" // Workflow
                },
                {
                    post_title: "Tutorial: AI Video Editing",
                    content: "How to use the latest AI tools for production.",
                    platform: "youtube",
                    status: "published",
                    is_evergreen: true,
                    is_direct_entry: true,
                    direct_entry_sequence: startCounter + 2,
                    repurpose_date: today, // Ready
                    created_at: new Date("2024-03-01"),
                    publish_date: new Date("2024-03-05"),
                    definitive_pillar: "pillar-1766-4116" // AI Tools
                },
                {
                    post_title: "Mindset: Failure is fuel",
                    content: "Why you need to fail fast to succeed.",
                    platform: "x",
                    status: "published",
                    is_evergreen: true,
                    is_direct_entry: true,
                    direct_entry_sequence: startCounter + 3,
                    repurpose_date: twoDaysAgo, // Ready
                    created_at: new Date("2024-02-15"),
                    publish_date: new Date("2024-02-20"),
                    definitive_pillar: "pillar-1766-4118" // Mindset
                }
            ];

            const collectionRef = collection(db, "posts");
            for (const p of testPosts) {
                await addDoc(collectionRef, { ...p, updated_at: new Date() });
            }

            // Sync Counter Back
            await updateDoc(settingsRef, { direct_entry_post_counter: startCounter + 3 });

            toast.success("Created 3 Test Evergreen Posts", { description: "Check Horizon > Loading Dock > Resurface" });
        } catch (e) {
            console.error(e);
            toast.error("Failed to seed test data");
        }
    };


    const handleClearPosts = () => {
        setConfirmDialog({
            open: true,
            title: "🗑️ WIPE CONTENT DATA",
            description: "Are you sure? This will PERMANENTLY DELETE all Posts and Ideas, and reset your Post ID counters to zero. This does NOT affect your Pillars or Matrix Settings.",
            variant: "destructive",
            onConfirm: async () => {
                try {
                    toast.info("Clearing content...");
                    const res = await clearPostData();
                    if (res.success) {
                        toast.success("Content Wiped", { description: res.log });
                        setTimeout(() => window.location.reload(), 1500);
                    } else {
                        toast.error("Wipe Failed", { description: res.error });
                    }
                } catch (err) {
                    toast.error("Wipe Failed", { description: err.message });
                }
            }
        });
    };

    const handleSaveIntegrations = async () => {
        if (!isAdmin) return;
        try {
            await updateDoc(doc(db, 'settings', 'global'), integrations);
            toast.success("Automation & Integration settings saved");
        } catch (e) {
            toast.error("Save Failed", { description: e.message });
        }
    };

    /**
     * SIMULATED DAILY ACTION ALERT LOGIC
     * Ported from source-code/functions/dailyActionAlert.js for Frontend Testing
     */
    const handleTestAlert = async () => {
        setStatus('Generating Test Alert...');
        try {
            // 1. Fetch ALL posts (Client-side filtering for simulation)
            // In production, query would use indices.
            const querySnapshot = await getDocs(collection(db, 'posts'));
            const allPosts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // 2. Fetch Ideas for Reference
            const ideasSnapshot = await getDocs(collection(db, 'ideas'));
            const allIdeas = ideasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // 3. Filter for "Scheduled" posts (Simulating "Today" logic)
            // For TEST purposes, we will fetch ALL scheduled posts, or if none, maybe just open the modal with a message.
            const scheduledPosts = allPosts.filter(p => p.status === 'scheduled');

            // Sort by Date
            scheduledPosts.sort((a, b) => new Date(a.publish_date) - new Date(b.publish_date));

            // 4. Generate HTML (The core logic)
            const platformLabels = {
                instagram: 'Instagram',
                youtube: 'YouTube',
                fb_page: 'Facebook Profile',
                fb_group: 'Facebook Group',
                linkedin: 'LinkedIn',
                x: 'X (Twitter)',
                tiktok: 'TikTok',
                email: 'Email',
                substack: 'Substack',
                community: 'Community'
            };

            let emailBody = `
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <h2 style="color: #8B5CF6;">Daily Action Alert (TEST PREVIEW)</h2>
                ${scheduledPosts.length > 0
                    ? `<p>You have <strong>${scheduledPosts.length}</strong> scheduled post${scheduledPosts.length > 1 ? 's' : ''} in the queue:</p>`
                    : '<p>No scheduled posts found in the system. Create some in the Studio map to test this alert.</p>'
                }
            `;

            scheduledPosts.forEach(post => {
                let time = 'No Time';
                if (post.publish_date) {
                    // Try/Catch for date parsing
                    try {
                        time = post.publish_date.toDate
                            ? post.publish_date.toDate().toLocaleString()
                            : new Date(post.publish_date).toLocaleString();
                    } catch (e) { time = 'Invalid Date'; }
                }

                const platform = platformLabels[post.platform] || post.platform;

                // Get parent idea
                const parentIdea = allIdeas.find(i => i.id === post.idea_id);
                const postIdDisplay = post.post_sequence && parentIdea
                    ? `#POST-${parentIdea.idea_number}-${post.post_sequence}`
                    : parentIdea
                        ? `#IDEA-${parentIdea.idea_number}`
                        : post.direct_entry_sequence
                            ? `#DIRECT-${post.direct_entry_sequence}`
                            : 'N/A';

                emailBody += `
                <div style="border: 1px solid #ddd; padding: 15px; margin: 15px 0; border-radius: 8px; background-color: #f9f9f9;">
                    <p style="margin: 5px 0;"><strong>🔢 ID:</strong> <code style="background: #e0e0e0; padding: 2px 6px; border-radius: 3px; font-family: monospace;">${postIdDisplay}</code> <a href="${alertConfig.app_url || ''}/studio?focus=${post.id}" target="_blank" style="font-size: 11px; color: #8B5CF6; text-decoration: none; margin-left: 10px; font-weight: bold;">VIEW IN STUDIO &rarr;</a></p>
                    <p style="margin: 5px 0;"><strong>📅 Schedule:</strong> ${time}</p>
                    <p style="margin: 5px 0;"><strong>📱 Platform:</strong> ${platform}</p>
                    <p style="margin: 5px 0;"><strong>📝 Title:</strong> ${post.post_title || 'Untitled Post'}</p>
                    
                    ${post.action_notes ? `
                    <div style="margin-top: 10px; padding: 10px; background-color: #fff; border-left: 4px solid #8B5CF6;">
                        <p style="margin: 0;"><strong>⚡ Action Required:</strong></p>
                        <p style="margin: 5px 0 0 0; white-space: pre-wrap;">${post.action_notes}</p>
                    </div>` : ''}
                </div>
                `;
            });

            emailBody += `
                <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
                <p style="color: #666; font-size: 12px;">This is a simulation of the daily action alert.</p>
                </body>
                </html>
            `;

            setPreviewHtml(emailBody);
            setPreviewStats({
                count: scheduledPosts.length,
                time: new Date().toLocaleTimeString()
            });
            setIsPreviewOpen(true);
            setStatus('✅ Alert Generated');

        } catch (e) {
            console.error(e);
            toast.error("Failed to generate test alert", { description: e.message });
            setStatus('Error generating alert');
        }
    };

    /**
     * TRIGGER REAL BACKEND EMAIL
     */
    const handleSendReal = async () => {
        setConfirmDialog({
            open: true,
            title: "Simulate Real Email?",
            description: "This will send a REAL content alert email to the recipients defined in your settings via Gmail. Continue?",
            onConfirm: async () => {
                setIsSendingReal(true);
                setStatus('Sending Real Email...');

                try {
                    const sendTestAlert = httpsCallable(functions, 'sendTestAlert');
                    const result = await sendTestAlert();

                    if (result.data.success) {
                        toast.success("Email Sent Successfully", {
                            description: `Processed: ${result.data.count} posts.`
                        });
                        setIsPreviewOpen(false);
                    } else {
                        toast.error("Dispatch Failed", { description: result.data.message });
                    }
                } catch (error) {
                    console.error("Backend Error:", error);
                    toast.error("Server Error", { description: error.message });
                } finally {
                    setIsSendingReal(false);
                    setStatus('Idle');
                }
            }
        });
    };

    const handleAudit = async () => {
        setStatus('Running System Audit...');
        const report = await runSystemAudit(auth.currentUser);
        setAuditReport(report);
        setStatus('✅ Audit Complete');
    };

    const handleSeed = () => {
        setConfirmDialog({
            open: true,
            title: "Seed Database?",
            description: "⚠️ WARNING: This will OVERWRITE pillars and allocation sets with default seed data. Continue?",
            variant: "destructive",
            onConfirm: async () => {
                setStatus('Seeding database...');
                const result = await seedDatabase();
                if (result.success) {
                    toast.success("Database Seeded Successfully!");
                    setStatus('✅ Database Seeded');
                } else {
                    toast.error("Seeding Failed", { description: result.error });
                    setStatus('❌ Seeding Failed');
                }
            }
        });
    };

    const [localPillars, setLocalPillars] = useState([]);
    const [hasChanges, setHasChanges] = useState(false);
    const [saveStatus, setSaveStatus] = useState('idle');

    // Sync local state when settings load
    useEffect(() => {
        if (settings?.content_pillars) {
            setLocalPillars(settings.content_pillars);
            setHasChanges(false);
        }
    }, [settings]);

    // Handle Pillar Edits (Local State)
    const handlePillarChange = async (index, field, value) => {
        // Dependency Guard: Prevent deactivating used pillars
        if (field === 'active' && value === false) {
            const pillarToCheck = localPillars[index];
            try {
                // Check if any ideas use this pillar
                // Note: Assuming 'pillar' field in ideas collection stores the pillar ID
                const ideasRef = collection(db, 'ideas');
                const q = query(ideasRef, where('pillar', '==', pillarToCheck.id));
                const snapshot = await getDocs(q);

                if (!snapshot.empty) {
                    toast.error("Cannot deactivate Pillar", {
                        description: `This pillar is currently assigned to ${snapshot.size} Idea(s). Please reassign them first.`
                    });
                    return; // Block the change
                }
            } catch (err) {
                console.error("Error checking pillar usage:", err);
                toast.error("Error verifying pillar usage.");
                return;
            }
        }

        const newPillars = [...localPillars];

        let finalValue = value;

        // Logic: Enforce Prefix Rules
        if (field === 'name') {
            if (index === 0) {
                // Anchor: MUST start with !
                if (!value.startsWith('!')) {
                    finalValue = '!' + value.replace(/^!+/, '');
                }
            } else {
                // Others: Must NOT start with !
                if (value.startsWith('!')) {
                    finalValue = value.replace(/^!+/, '');
                }
            }
        }

        newPillars[index] = { ...newPillars[index], [field]: finalValue };
        setLocalPillars(newPillars);
        setHasChanges(true);
        setSaveStatus('idle');
    };

    // Save to Firestore
    const handleSavePillars = async () => {
        setSaveStatus('saving');
        try {
            await updateDoc(doc(db, 'settings', 'global'), {
                content_pillars: localPillars
            });

            setSaveStatus('success');
            setHasChanges(false);

            // Revert after delay
            setTimeout(() => {
                setSaveStatus('idle');
            }, 2000);

        } catch (err) {
            console.error("Failed to save pillars:", err);
            toast.error("Save Failed", { description: err.message });
            setSaveStatus('idle');
        }
    };



    const handleSaveStorage = async () => {
        try {
            await updateDoc(doc(db, 'settings', 'global'), {
                storage_controls: storageConfig
            });
            toast.success("Storage Settings Saved");
        } catch (err) {
            toast.error("Save Failed", { description: err.message });
        }
    };

    const handleLaneToggle = async (platformId, currentStatus) => {
        // Lane Deactivation Guard
        if (currentStatus === true) { // If currently ON, and we are turning it OFF
            try {
                const postsRef = collection(db, 'posts');
                const q = query(postsRef, where('platform', '==', platformId));
                const snapshot = await getDocs(q);

                if (!snapshot.empty) {
                    const posts = snapshot.docs.map(doc => doc.data());
                    const activePosts = posts.filter(p => p.status === 'draft' || p.status === 'scheduled');
                    const publishedPosts = posts.filter(p => p.status === 'published');

                    // Tier 1: Hard Block for Draft/Scheduled
                    if (activePosts.length > 0) {
                        toast.error("Cannot Deactivate Lane", {
                            description: `You have ${activePosts.length} active post(s) (Draft or Scheduled). Please reassign them first.`
                        });
                        return; // Block
                    }

                    // Tier 2: Warning for Published (Historical Data)
                    if (publishedPosts.length > 0) {
                        setPublishedCount(publishedPosts.length);
                        setPendingPlatformId(platformId);
                        setDeactivateConfirmOpen(true);
                        return; // Stop here, wait for dialog
                    }
                }
            } catch (err) {
                console.error("Error checking lane usage:", err);
                toast.error("Error verifying lane data.");
                return;
            }
        }

        performToggle(platformId, currentStatus);
    };

    const performToggle = async (platformId, currentStatus) => {
        try {
            const settingsRef = doc(db, 'settings', 'global');
            await updateDoc(settingsRef, {
                [`lane_visibility.${platformId}`]: !currentStatus
            });
            toast.success(`${currentStatus ? 'Disabled' : 'Enabled'} Lane Successfully`);
        } catch (error) {
            console.error("Error toggling lane:", error);
            toast.error("Failed to update lane visibility.");
        }
    };

    // Helper for Button Props
    const getSaveButtonProps = () => {
        switch (saveStatus) {
            case 'saving':
                return {
                    text: 'Syncing...',
                    icon: <RefreshCw className="w-4 h-4 mr-2 animate-spin" />,
                    className: "bg-primary text-primary-foreground opacity-80 cursor-wait"
                };
            case 'success':
                return {
                    text: 'All Changes Saved!',
                    icon: <Check className="w-4 h-4 mr-2" />,
                    className: "bg-green-600 hover:bg-green-700 text-white shadow-md transition-all ease-in-out duration-300 scale-105"
                };
            default: // idle
                return {
                    text: 'Save & Sync Changes',
                    icon: <RefreshCw className={`w-4 h-4 mr-2 ${hasChanges ? "" : "opacity-0"}`} />,
                    className: hasChanges
                        ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg animate-pulse"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                };
        }
    };

    const btnProps = getSaveButtonProps();

    const [dbAuditReport, setDbAuditReport] = useState(null);

    const handleDbAudit = async () => {
        setDbAuditReport("Scanning database...");
        const report = await auditDatabase();
        setDbAuditReport(report);
    };

    const handleReseedMatrix = () => {
        setConfirmDialog({
            open: true,
            title: "Refactor Matrix Structure?",
            description: "⚠️ REFACTOR ACTION: This will DELETE all current Pillar Targets and re-create a strict 21-record structure. Continue?",
            variant: "destructive",
            onConfirm: async () => {
                setStatus('Reseeding Matrix...');
                const result = await reseedMatrix();
                if (result.success) {
                    setStatus('✅ Matrix Refactored!');
                    toast.success("Matrix Refactored Successfully");
                } else {
                    setStatus(`❌ Refactor Failed: ${result.error}`);
                    toast.error("Refactor Failed", { description: result.error });
                }
            }
        });
    };

    if (error) {
        const isNotFound = error.includes("not found") || error.includes("Missing or insufficient permissions");

        return (
            <div className="p-8 max-w-2xl mx-auto mt-20 border border-red-200 bg-red-50 rounded-lg text-red-700">
                <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full bg-red-500 animate-pulse" />
                    {isNotFound ? "System Not Initialized" : "Error Loading Settings"}
                </h3>

                <p className="font-mono text-sm whitespace-pre-wrap mb-4">{error}</p>

                <div className="bg-white/50 p-4 rounded border border-red-100 mb-4">
                    <p className="text-sm font-semibold mb-2">It looks like the Firestore Emulator is empty.</p>
                    <Button
                        onClick={() => {
                            setConfirmDialog({
                                open: true,
                                title: "Initialize System?",
                                description: "This will populate the emulator with default system data. Proceed?",
                                onConfirm: async () => {
                                    setInitLoading(true);
                                    try {
                                        const res = await initializeSystemDefaults();
                                        if (res.success) {
                                            toast.success("System Initialized", { description: "Reloading content..." });
                                            setTimeout(() => window.location.reload(), 1500);
                                        } else {
                                            toast.error("Init Failed", { description: res.error });
                                        }
                                    } catch (err) {
                                        toast.error("Critical Error", { description: err.message });
                                    } finally {
                                        setInitLoading(false);
                                    }
                                }
                            });
                        }}
                        disabled={initLoading}
                        className="bg-red-600 hover:bg-red-700 text-white w-full"
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${initLoading ? 'animate-spin' : ''}`} />
                        {initLoading ? "Initializing..." : "Initialize System Defaults"}
                    </Button>
                </div>
                <div className="mt-4 text-xs text-red-600/80">
                    <p>Troubleshooting:</p>
                    <ul className="list-disc ml-5 mt-1 space-y-1">
                        <li>Is the Firestore Emulator running on port 8080?</li>
                        <li>Did you refresh the page after starting emulators?</li>
                    </ul>
                </div>

                <Button variant="outline" className="mt-4 border-red-300 text-red-700 hover:bg-red-100" onClick={() => window.location.reload()}>Retry / Reload</Button>
            </div>
        );
    }

    if (loading) return <div className="p-8 flex items-center gap-4 text-muted-foreground"><div className="h-4 w-4 bg-primary/50 animate-bounce rounded-full" /> Loading settings...</div>;

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl md:text-3xl font-bold tracking-tight mb-1 flex items-center gap-2">
                            <SettingsIcon className="text-primary w-6 h-6 md:w-8 md:h-8" />
                            Settings
                        </h1>
                        <p className="text-muted-foreground hidden md:block">Manage your application preferences and data.</p>
                    </div>
                    {/* System Actions - ADMIN ONLY */}
                    {isAdmin && (
                        <div className="flex flex-row flex-wrap gap-2 w-full lg:w-auto">
                            <Button variant="outline" onClick={handleDbAudit} title="Inspect Database State" className="flex-1 md:flex-none">
                                <Database className="w-4 h-4 mr-2" />
                                System Inspector
                            </Button>
                            <Button variant="outline" onClick={handleInitializeSystem} title="Restore Foundation Defaults (Pillars, Targets)" className="flex-1 md:flex-none">
                                <Shield className="w-4 h-4 mr-2" />
                                Initialize System Defaults
                            </Button>
                            <Button variant="destructive" onClick={handleClearPosts} title="Delete all Posts and Ideas (Reset Counters)" className="flex-1 md:flex-none">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Clear Content Data
                            </Button>
                        </div>
                    )}
                </div>

                {/* DB Audit Output Display */}
                {dbAuditReport && (
                    <div className="p-4 bg-slate-950 text-slate-100 rounded-md font-mono text-xs whitespace-pre-wrap overflow-auto max-h-96 border border-slate-800 shadow-inner">
                        <div className="flex justify-between items-center mb-2 border-b border-slate-800 pb-2">
                            <span className="font-bold text-emerald-400">System Inspector Report</span>
                            <button onClick={() => setDbAuditReport(null)} className="text-slate-400 hover:text-white">Close</button>
                        </div>
                        {dbAuditReport}
                    </div>
                )}
            </div>

            <hr className="border-border" />

            {/* --- SECTION 1: USER MANAGEMENT --- */}
            <div className="bg-card rounded-lg border shadow-sm p-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <User className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-semibold">User Management</h2>
                    </div>
                    {!isAdmin && currentUser && (
                        <Button onClick={handleBootstrapAdmin} variant="secondary" size="sm">
                            👑 Claim Admin Access
                        </Button>
                    )}
                </div>

                <div className="space-y-6">
                    {/* Authorized Users Table */}
                    <div className="rounded-md border">
                        <div className="grid grid-cols-12 bg-muted/40 p-2 text-xs font-semibold uppercase text-muted-foreground border-b">
                            <div className="col-span-6">User Email</div>
                            <div className="col-span-3">Role</div>
                            <div className="col-span-3 text-right">Actions</div>
                        </div>
                        <div className="divide-y max-h-[200px] overflow-y-auto">
                            {users.length === 0 ? (
                                <div className="p-4 text-center text-sm text-muted-foreground">No authorized users found.</div>
                            ) : (
                                users.map(user => {
                                    // Identify if this row represents the current user
                                    // NOTE: We check both UID (if bootstrap) and Email (if authorized)
                                    const isMe = (currentUser && user.id === currentUser.uid) || (currentUser && user.email === currentUser.email);
                                    const isEditing = editingId === user.id;

                                    return (
                                        <div key={user.id} className={`grid grid-cols-12 items-center p-2 text-sm ${isEditing ? 'bg-muted/30' : 'hover:bg-muted/10'}`}>
                                            <div className="col-span-6 font-medium flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs text-primary shrink-0">
                                                    {isEditing ? <User className="w-3 h-3" /> : user.email?.charAt(0).toUpperCase()}
                                                </div>

                                                {isEditing ? (
                                                    <input
                                                        type="email"
                                                        value={editForm.email}
                                                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                                        className="h-7 w-full rounded border border-input bg-background px-2 text-xs focus:ring-1 focus:ring-primary"
                                                    />
                                                ) : (
                                                    <>
                                                        <span className="truncate">{user.email}</span>
                                                        {isMe && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded ml-2 shrink-0">YOU</span>}
                                                    </>
                                                )}
                                            </div>

                                            <div className="col-span-3">
                                                {isEditing ? (
                                                    <select
                                                        value={editForm.role}
                                                        onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                                                        className="h-7 w-full rounded border border-input bg-background px-1 text-xs focus:ring-1 focus:ring-primary"
                                                    >
                                                        <option value="user">User</option>
                                                        <option value="admin">Admin</option>
                                                    </select>
                                                ) : (
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                                                        }`}>
                                                        {user.role}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="col-span-3 text-right flex justify-end gap-1">
                                                {isEditing ? (
                                                    <>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={saveEdit}
                                                            className="h-7 w-7 p-0 text-green-600 hover:bg-green-50"
                                                            title="Save Changes"
                                                        >
                                                            <Check className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={cancelEdit}
                                                            className="h-7 w-7 p-0 text-muted-foreground hover:bg-muted"
                                                            title="Cancel"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            disabled={!isAdmin}
                                                            onClick={() => startEdit(user)}
                                                            className="h-7 w-7 p-0 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                                                            title="Edit User Details"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            disabled={isMe || !isAdmin}
                                                            onClick={() => handleRemoveUser(user.id, user.email)}
                                                            className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                            title={isMe ? "Cannot remove yourself" : "Remove user access"}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Authorize New User - Admin Only */}
                    {isAdmin && (
                        <div className="bg-muted/30 p-4 rounded-md border border-dashed flex flex-col md:flex-row gap-4 items-end md:items-center">
                            <div className="flex-1 grid gap-2 w-full">
                                <label className="text-xs font-medium">Authorize Email</label>
                                <div className="flex gap-2">
                                    <Mail className="w-4 h-4 text-muted-foreground mt-3" />
                                    <input
                                        type="email"
                                        value={newUserEmail}
                                        onChange={(e) => setNewUserEmail(e.target.value)}
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                        placeholder="colleague@example.com"
                                    />
                                </div>
                            </div>

                            <div className="w-full md:w-40 grid gap-2">
                                <label className="text-xs font-medium">Role</label>
                                <select
                                    value={newUserRole}
                                    onChange={(e) => setNewUserRole(e.target.value)}
                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                >
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>

                            <Button onClick={handleAddUser} className="w-full md:w-auto h-9">
                                <Plus className="w-4 h-4 mr-2" />
                                Authorize User
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* --- SECTION 2: LANE VISIBILITY --- */}
            {/* Show only if Admin? Or allow Viewers to see? User requirement implies Access Control for Matrix/Init. 
                Implicitly, Settings usually requires Admin. But let's leave visibility open for now. */}
            <div className="bg-card rounded-lg border shadow-sm p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-semibold">Lane Governance</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {SORTED_PLATFORMS.map((platform) => {
                        const isVisible = settings?.lane_visibility?.[platform.id] ?? false;
                        return (
                            <div key={platform.id} className="flex items-center justify-between p-3 rounded-md border bg-muted/20 hover:bg-muted/40 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-md bg-background border border-border text-muted-foreground">
                                        <platform.icon size={16} style={{ color: platform.color }} />
                                    </div>
                                    <span className="font-medium text-sm">{platform.label}</span>
                                </div>
                                <Switch
                                    checked={isVisible}
                                    onCheckedChange={() => isAdmin && handleLaneToggle(platform.id, isVisible)} // Protected
                                    disabled={!isAdmin}
                                    className="scale-90"
                                />
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* --- SECTION 3: CONTENT PILLARS --- */}
            <div className="bg-card rounded-lg border shadow-sm p-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Database className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-semibold">Content Pillars</h2>
                    </div>
                    {isAdmin && (
                        <Button
                            onClick={handleSavePillars}
                            disabled={!hasChanges && saveStatus !== 'success'}
                            size="sm"
                            className={`min-w-[140px] transition-all duration-300 ${btnProps.className}`}
                        >
                            {btnProps.icon}
                            {btnProps.text}
                        </Button>
                    )}
                </div>

                <div className="grid gap-3">
                    {localPillars.map((pillar, index) => (
                        <div key={pillar.id} className="flex flex-col gap-2 p-3 rounded-md border bg-card hover:border-primary/30 transition-colors">
                            {/* Top Row */}
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-mono text-muted-foreground w-6">#{index + 1}</span>

                                <input
                                    type="color"
                                    value={pillar.color}
                                    onChange={(e) => isAdmin && handlePillarChange(index, 'color', e.target.value)}
                                    disabled={!isAdmin}
                                    className="w-5 h-5 rounded cursor-pointer border-none p-0 bg-transparent disabled:opacity-50"
                                />

                                <input
                                    type="text"
                                    value={pillar.name}
                                    onChange={(e) => isAdmin && handlePillarChange(index, 'name', e.target.value)}
                                    disabled={!isAdmin}
                                    className="flex-1 font-semibold text-sm bg-transparent border-none focus:ring-0 p-0 disabled:text-muted-foreground"
                                    placeholder="Pillar Name"
                                />

                                {index === 0 ? (
                                    <div className="text-[10px] uppercase font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded">Anchor</div>
                                ) : (
                                    <Switch
                                        checked={pillar.active !== false}
                                        onCheckedChange={(checked) => isAdmin && handlePillarChange(index, 'active', checked)}
                                        disabled={!isAdmin}
                                        className="scale-75 origin-right"
                                    />
                                )}
                            </div>

                            <div className="pl-9 mr-1">
                                <textarea
                                    value={pillar.description || ''}
                                    onChange={(e) => isAdmin && handlePillarChange(index, 'description', e.target.value)}
                                    disabled={!isAdmin}
                                    className="w-full bg-muted/40 text-xs text-muted-foreground border-none rounded px-2 py-1 resize-none focus:ring-1 focus:ring-primary/20 focus:bg-background min-h-[2.5rem] disabled:cursor-not-allowed"
                                    placeholder="Strategy description..."
                                    rows={2}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* --- SECTION 3.5: EVERGREEN / REPURPOSING SETTINGS --- */}
            <div className="bg-card rounded-lg border shadow-sm p-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Repeat className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-semibold">Evergreen Engine</h2>
                    </div>
                    {isAdmin && (
                        <div className="flex gap-2">
                            <Button size="sm" variant="secondary" onClick={handleSaveEvergreen}>
                                Save Cycles
                            </Button>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <RefreshCw className="w-4 h-4 text-muted-foreground" />
                                Repurpose Cycle (Days)
                            </label>
                            <p className="text-xs text-muted-foreground">How long after publishing should a post resurface for repurposing?</p>
                            <div className="flex items-center gap-3">
                                <input
                                    type="number"
                                    min="1"
                                    value={evergreenConfig.repurpose_cycle}
                                    onChange={(e) => isAdmin && setEvergreenConfig({ ...evergreenConfig, repurpose_cycle: e.target.value })}
                                    disabled={!isAdmin}
                                    className="flex h-10 w-24 rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 disabled:opacity-50"
                                />
                                <span className="text-sm text-muted-foreground">days</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <Clock className="w-4 h-4 text-muted-foreground" />
                                Snooze Duration (Days)
                            </label>
                            <p className="text-xs text-muted-foreground">How long to hide a post when you click "Snooze"?</p>
                            <div className="flex items-center gap-3">
                                <input
                                    type="number"
                                    min="1"
                                    value={evergreenConfig.snooze_duration}
                                    onChange={(e) => isAdmin && setEvergreenConfig({ ...evergreenConfig, snooze_duration: e.target.value })}
                                    disabled={!isAdmin}
                                    className="flex h-10 w-24 rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 disabled:opacity-50"
                                />
                                <span className="text-sm text-muted-foreground">days</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- SECTION 4: STRATEGY MATRIX (ADMIN ONLY) --- */}
            {
                isAdmin && (
                    <div className="bg-card rounded-lg border shadow-sm p-4">
                        <StrategyAllocationMatrix pillars={localPillars} />
                    </div>
                )
            }

            {/* --- SECTION 5: ACTION ALERTS --- */}
            <div className="bg-card rounded-lg border shadow-sm p-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-2">
                        <Mail className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-semibold">Action Alerts & Guidance</h2>
                    </div>
                    {isAdmin ? (
                        <div className="flex flex-row gap-2 w-full lg:w-auto">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleTestAlert}
                                className="text-purple-600 border-purple-200 hover:bg-purple-50 hover:text-purple-700 flex-1 md:flex-none"
                            >
                                <Mail className="w-4 h-4 mr-2" />
                                Send Test Alert (Preview)
                            </Button>
                            <Button size="sm" variant="secondary" onClick={handleSaveAlerts} className="flex-1 md:flex-none">
                                Save Configuration
                            </Button>
                        </div>
                    ) : (
                        <Button onClick={handleBootstrapAdmin} variant="secondary" size="sm" className="bg-amber-100 text-amber-900 hover:bg-amber-200 w-full lg:w-auto">
                            👑 Claim Admin Access to Configure
                        </Button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <Mail className="w-4 h-4 text-muted-foreground" />
                                Recipients (Comma-separated)
                            </label>
                            <input
                                type="text"
                                value={alertConfig.recipients}
                                onChange={(e) => isAdmin && setAlertConfig({ ...alertConfig, recipients: e.target.value })}
                                disabled={!isAdmin}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 disabled:opacity-50"
                                placeholder="editor@example.com, manager@example.com"
                            />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <Globe className="w-4 h-4 text-muted-foreground" />
                                Production App URL (for email links)
                            </label>
                            <input
                                type="url"
                                value={alertConfig.app_url}
                                onChange={(e) => isAdmin && setAlertConfig({ ...alertConfig, app_url: e.target.value })}
                                disabled={!isAdmin}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 disabled:opacity-50"
                                placeholder="https://content-alchemy.web.app"
                            />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <FileText className="w-4 h-4 text-muted-foreground" />
                                Report Interpretation Guide URL
                            </label>
                            <input
                                type="url"
                                value={alertConfig.guide_url}
                                onChange={(e) => isAdmin && setAlertConfig({ ...alertConfig, guide_url: e.target.value })}
                                disabled={!isAdmin}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 disabled:opacity-50"
                                placeholder="https://notion.so/..."
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <label className="text-sm font-medium flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-muted-foreground" />
                                    Alert Time
                                </label>
                                <select
                                    value={alertConfig.time}
                                    onChange={(e) => isAdmin && setAlertConfig({ ...alertConfig, time: e.target.value })}
                                    disabled={!isAdmin}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary disabled:opacity-50"
                                >
                                    {Array.from({ length: 24 }).map((_, i) => {
                                        const hour24 = i.toString().padStart(2, '0');
                                        const value = `${hour24}:00`;

                                        // Human Label (12-hour format)
                                        const hour12 = i % 12 || 12;
                                        const ampm = i < 12 ? 'AM' : 'PM';
                                        const label = `${hour12}:00 ${ampm}`;

                                        return (
                                            <option key={value} value={value}>
                                                {label}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium flex items-center gap-2">
                                    <Globe className="w-4 h-4 text-muted-foreground" />
                                    Timezone
                                </label>
                                <input
                                    type="text"
                                    value={alertConfig.timezone}
                                    onChange={(e) => isAdmin && setAlertConfig({ ...alertConfig, timezone: e.target.value })}
                                    disabled={!isAdmin}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- SECTION 5.5: STORAGE MANAGEMENT --- */}
            <div className="bg-card rounded-lg border shadow-sm p-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Trash2 className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-semibold">Storage Management</h2>
                    </div>
                    {isAdmin && (
                        <Button size="sm" variant="secondary" onClick={handleSaveStorage}>
                            Save Storage Settings
                        </Button>
                    )}
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-md border bg-muted/20">
                        <div className="space-y-0.5">
                            <label className="text-sm font-medium flex items-center gap-2">
                                Auto-Purge Old Videos
                                {storageConfig.retention_active && <span className="text-[10px] bg-green-500/10 text-green-500 px-1.5 rounded uppercase font-bold">Active</span>}
                            </label>
                            <p className="text-xs text-muted-foreground">Automatically delete video files from storage while keeping the post record.</p>
                        </div>
                        <Switch
                            checked={storageConfig.retention_active}
                            onCheckedChange={(val) => isAdmin && setStorageConfig(p => ({ ...p, retention_active: val }))}
                            disabled={!isAdmin}
                        />
                    </div>

                    <div className="grid gap-2 max-w-xs">
                        <label className="text-sm font-medium">Retention Period (Days)</label>
                        <div className="flex items-center gap-3">
                            <input
                                type="number"
                                min="1"
                                value={storageConfig.retention_days}
                                onChange={(e) => isAdmin && setStorageConfig(p => ({ ...p, retention_days: parseInt(e.target.value) || 30 }))}
                                disabled={!isAdmin || !storageConfig.retention_active}
                                className="flex h-10 w-24 rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 disabled:opacity-50"
                            />
                            <span className="text-sm text-muted-foreground">days</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- SECTION 6: INTEGRATIONS & AUTOMATION (PHASE II - HIDDEN) --- */}
            {/* Feature Flag: Set to true when ready to release Outstand/Cloudinary integrations */}
            {
                false && (
                    <div className="bg-card rounded-lg border shadow-sm p-4">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Globe className="w-5 h-5 text-primary" />
                                <h2 className="text-lg font-semibold">Post Automations & Integrations</h2>
                            </div>
                            {isAdmin && (
                                <Button size="sm" onClick={handleSaveIntegrations}>
                                    Save Integrations
                                </Button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Master Switch */}
                            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <label className="text-sm font-bold flex items-center gap-2 text-primary">
                                            <RefreshCw className={`w-4 h-4 ${integrations.automation_enabled ? 'animate-spin-slow' : ''}`} />
                                            Master Automation Switch
                                        </label>
                                        <p className="text-xs text-muted-foreground">Enable direct posting to Outstand/APIs from the Studio.</p>
                                    </div>
                                    <Switch
                                        checked={integrations.automation_enabled}
                                        onCheckedChange={(val) => isAdmin && setIntegrations(p => ({ ...p, automation_enabled: val }))}
                                        disabled={!isAdmin}
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="grid gap-2">
                                    <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Cloudinary Cloud Name</label>
                                    <input
                                        type="text"
                                        value={integrations.cloudinary_cloud_name}
                                        onChange={(e) => isAdmin && setIntegrations({ ...integrations, cloudinary_cloud_name: e.target.value })}
                                        disabled={!isAdmin}
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                                        placeholder="e.g. outstand-media"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Outstand Webhook / API Token</label>
                                    <input
                                        type="password"
                                        value={integrations.outstand_webhook_url}
                                        onChange={(e) => isAdmin && setIntegrations({ ...integrations, outstand_webhook_url: e.target.value })}
                                        disabled={!isAdmin}
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                                        placeholder="••••••••••••••••"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Preview Modal */}
            <AlertPreviewModal
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                htmlContent={previewHtml}
                stats={previewStats}
                onSendReal={handleSendReal}
                isSending={isSendingReal}
            />

            {/* Deactivation Safeguard Dialog */}
            <AlertDialog open={deactivateConfirmOpen} onOpenChange={setDeactivateConfirmOpen}>
                <AlertDialogContent className="bg-[#0f1115] border-border text-white shadow-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-amber-400">
                            <AlertTriangle className="w-5 h-5" />
                            Historical Data Alert
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-400">
                            This lane contains <span className="text-white font-bold">{publishedCount} published post(s)</span>.
                            Deactivating this lane will hide this history from the Omnichannel Velocity Map and other reports.
                            <br /><br />
                            Are you sure you want to proceed?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-white/5 border-white/10 hover:bg-white/10 text-white">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                performToggle(pendingPlatformId, true);
                                setDeactivateConfirmOpen(false);
                            }}
                            className="bg-amber-600 hover:bg-amber-700 text-white border-none"
                        >
                            Proceed with Deactivation
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Unified Confirmation Dialog */}
            <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}>
                <AlertDialogContent className="bg-[#0f1115] border-border text-white shadow-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className={confirmDialog.variant === 'destructive' ? 'text-red-500 font-bold' : 'text-primary font-bold'}>
                            {confirmDialog.title}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-400 whitespace-pre-wrap">
                            {confirmDialog.description}
                        </AlertDialogDescription>
                        {confirmDialog.confirmKeyword && (
                            <div className="mt-4">
                                <label className="text-xs text-muted-foreground uppercase font-bold">Type "{confirmDialog.confirmKeyword}" to confirm:</label>
                                <input
                                    className="flex h-9 w-full rounded-md border border-input bg-background/50 px-3 py-1 text-sm shadow-sm mt-1 focus:ring-1 focus:ring-red-500"
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        // Store match status in a data attribute or temporary state? 
                                        // Easier to strict check in the button, but we need state to re-render.
                                        // Quick fix: Add specific state for this input or modify confirmDialog to hold the input value.
                                        // Let's use a ref or just simpler: 
                                        // We can't introduce new state easily inside this return without re-rendering the whole component.
                                        // Actually, let's just use the `confirmDialog` state itself to store the input.
                                        setConfirmDialog(prev => ({ ...prev, currentInput: val }));
                                    }}
                                />
                            </div>
                        )}
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-white/5 border-white/10 hover:bg-white/10 text-white">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={confirmDialog.confirmKeyword && confirmDialog.currentInput !== confirmDialog.confirmKeyword}
                            onClick={async () => {
                                if (confirmDialog.onConfirm) await confirmDialog.onConfirm();
                                setConfirmDialog(prev => ({ ...prev, open: false, currentInput: '' }));
                            }}
                            className={confirmDialog.variant === 'destructive' ? 'bg-red-600 hover:bg-red-700 text-white border-none disabled:opacity-50 disabled:cursor-not-allowed' : 'bg-primary hover:bg-primary/90 text-white border-none'}
                        >
                            Proceed
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

        </div >
    );
}
