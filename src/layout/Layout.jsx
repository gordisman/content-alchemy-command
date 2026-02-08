import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Calendar, Settings, Database, LogOut, Menu, X, Zap, HeartPulse } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import ContentAlchemyLogo from '../components/ContentAlchemyLogo';

export default function Layout() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const navigate = useNavigate();

    // Check Admin Role & Auto-Promote
    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
            if (user) {
                // 1. Check/Create User Doc
                const userRef = doc(db, 'users', user.uid);
                const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());
                const isWhitelisted = ADMIN_EMAILS.includes(user.email?.toLowerCase());

                try {
                    // Auto-Promote Logic
                    if (isWhitelisted) {
                        const { getDoc, setDoc } = await import('firebase/firestore');
                        const docSnap = await getDoc(userRef);

                        if (!docSnap.exists() || docSnap.data().role !== 'admin') {
                            console.log("⚡ Auto-Promoting User to Admin:", user.email);
                            await setDoc(userRef, {
                                email: user.email,
                                role: 'admin',
                                displayName: user.displayName,
                                photoURL: user.photoURL,
                                lastLogin: new Date()
                            }, { merge: true });
                        }
                    }
                } catch (e) {
                    console.error("Auto-Admin check failed:", e);
                }

                // 2. Listen for Role Changes (Real-time UI update)
                const unsubDoc = onSnapshot(userRef, (docSnap) => {
                    if (docSnap.exists()) {
                        setIsAdmin(docSnap.data().role === 'admin');
                    } else {
                        setIsAdmin(false);
                    }
                });
                return () => unsubDoc();
            } else {
                setIsAdmin(false);
            }
        });
        return () => unsubscribeAuth();
    }, []);

    const handleSignOut = async () => {
        await signOut(auth);
        navigate('/');
    };

    const navItems = [
        { to: '/studio', icon: LayoutDashboard, label: 'Studio' },
        { to: '/vault', icon: Database, label: 'Idea Vault' },
        { to: '/horizon', icon: Calendar, label: 'Horizon' },
        { to: '/health', icon: HeartPulse, label: 'System Health' },
        ...(isAdmin ? [{ to: '/settings', icon: Settings, label: 'Settings' }] : []),
    ];

    return (
        <div className="flex flex-col md:flex-row h-screen h-[100dvh] bg-background text-foreground overflow-hidden">
            {/* Desktop Sidebar (Hidden on Mobile) */}
            <aside
                className={`${isSidebarOpen ? 'w-64' : 'w-20'
                    } hidden md:flex bg-card border-r border-border transition-all duration-300 flex-col relative`}
            >
                <div className="px-4 flex items-center justify-between border-b border-border h-14 shrink-0">
                    {isSidebarOpen ? (
                        <div className="flex items-center gap-2 whitespace-nowrap">
                            <ContentAlchemyLogo size={32} />
                            <div className="flex flex-col justify-center select-none space-y-0.5">
                                <span className="font-black text-xs tracking-[0.2em] text-foreground block">CONTENT ALCHEMY</span>
                                <span className="text-[9px] font-bold text-muted-foreground/60 tracking-[0.3em] block">COMMAND</span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex justify-center w-full">
                            <ContentAlchemyLogo size={32} />
                        </div>
                    )}
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className={`p-1 rounded-md hover:bg-muted text-muted-foreground ${!isSidebarOpen && 'absolute -right-3 top-4 bg-card border border-border rounded-full z-50 p-0.5'}`}
                    >
                        {isSidebarOpen ? <X size={16} /> : <Menu size={16} />}
                    </button>
                </div>

                <nav className="flex-1 p-3 space-y-1">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) =>
                                `flex items-center gap-3 p-2.5 rounded-md transition-all duration-200 ${isActive
                                    ? 'bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(var(--primary),0.1)]'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                }`
                            }
                        >
                            <item.icon size={18} />
                            {isSidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
                        </NavLink>
                    ))}
                </nav>

                <div className="p-3 border-t border-border">
                    <button
                        onClick={handleSignOut}
                        className="flex items-center gap-3 p-2.5 w-full rounded-md text-destructive hover:bg-destructive/10 transition-colors"
                    >
                        <LogOut size={18} />
                        {isSidebarOpen && <span className="text-sm font-medium">Sign Out</span>}
                    </button>
                </div>
            </aside>

            {/* Mobile Header (Visible on Mobile) */}
            <header className="flex md:hidden h-14 border-b border-border items-center px-4 bg-card/30 backdrop-blur-md justify-between shrink-0">
                <div className="flex items-center gap-2 whitespace-nowrap overflow-visible">
                    <div className="shrink-0 w-8 h-8 flex items-center justify-center">
                        <ContentAlchemyLogo size={32} />
                    </div>
                    <div className="flex flex-col leading-normal py-1">
                        <span className="font-black text-[10px] tracking-[0.1em] text-foreground uppercase block">CONTENT ALCHEMY</span>
                    </div>
                </div>
                <button onClick={handleSignOut} className="p-2 text-destructive">
                    <LogOut size={18} />
                </button>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col overflow-hidden bg-background pb-32 md:pb-0">
                <header className="hidden md:flex h-14 border-b border-border items-center px-4 bg-card/30 backdrop-blur-md">
                    <div className="flex-1"></div>
                </header>
                <div className="flex-1 overflow-auto p-2 md:p-4 relative">
                    <Outlet />
                </div>
            </main>

            {/* Bottom Navigation (Visible on Mobile) */}
            <nav className="md:hidden fixed bottom-10 left-0 right-0 h-16 bg-card/80 backdrop-blur-xl border-t border-border flex items-center justify-around px-2 z-50">
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                            `flex flex-col items-center justify-center gap-1 px-3 py-1 rounded-lg transition-all ${isActive
                                ? 'text-primary'
                                : 'text-muted-foreground'
                            }`
                        }
                    >
                        <item.icon size={20} className={({ isActive }) => isActive ? 'scale-110' : ''} />
                        <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span>
                    </NavLink>
                ))}
            </nav>
        </div>
    );
}
