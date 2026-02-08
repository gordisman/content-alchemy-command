import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { auth } from './lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth'; // Import everything we need
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import ContentAlchemyLogo from './components/ContentAlchemyLogo';

// Layout & Pages
import Layout from './layout/Layout';
import Studio from './pages/Studio';
import IdeaVault from './pages/IdeaVault';
import Horizon from './pages/Horizon';
import Settings from './pages/Settings';
import SystemHealth from './pages/SystemHealth';

class GlobalErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        console.error("Global Error:", error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="h-screen w-screen flex flex-col items-center justify-center bg-destructive/10 text-destructive p-8 text-center">
                    <h1 className="text-4xl font-bold mb-4">Something went wrong.</h1>
                    <p className="max-w-md bg-background p-4 rounded border text-left font-mono text-sm overflow-auto">
                        {this.state.error?.toString()}
                    </p>
                    <button onClick={() => window.location.reload()} className="mt-6 px-4 py-2 bg-primary text-primary-foreground rounded">
                        Reload Application
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLogin, setIsLogin] = useState(true); // Toggle state

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });

        // Safety Timeout for Auth Connection (Prevents infinite loading)
        const timer = setTimeout(() => {
            if (loading) {
                console.warn("Auth check timed out. Defaulting to logged out.");
                setLoading(false);
            }
        }, 4000);

        return () => {
            unsubscribe();
            clearTimeout(timer);
        };
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                await createUserWithEmailAndPassword(auth, email, password);
            }
        } catch (error) {
            toast.error("Auth Error", { description: error.message });
        }
    };

    const handleGoogleLogin = async () => {
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error(error);
            toast.error("Google Sign-In Failed", { description: error.message });
        }
    };

    if (loading) return <div className="h-screen flex items-center justify-center">Loading...</div>;

    if (!user) {
        return (
            <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
                <div className="h-screen flex items-center justify-center bg-background text-foreground dark">
                    <div className="w-full max-w-md p-8 border border-border rounded-lg bg-card shadow-lg">
                        <div className="flex flex-col items-center mb-8">
                            <div className="w-20 h-20 mb-4 animate-in fade-in zoom-in duration-500">
                                <ContentAlchemyLogo size={80} />
                            </div>
                            <h1 className="text-2xl font-bold">Content Alchemy Command</h1>
                            <p className="text-muted-foreground text-sm mt-2">
                                {isLogin ? "Welcome back, Alchemist." : "Begin your transformation."}
                            </p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full p-2 rounded bg-input text-foreground border border-border focus:ring-2 focus:ring-primary"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full p-2 rounded bg-input text-foreground border border-border focus:ring-2 focus:ring-primary"
                                    required
                                />
                            </div>
                            <button type="submit" className="w-full py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors">
                                {isLogin ? 'Sign In' : 'Create Account'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsLogin(!isLogin)}
                                className="w-full text-sm text-muted-foreground hover:text-foreground underline"
                            >
                                {isLogin ? "Need an account? Sign Up" : "Already have an account? Sign In"}
                            </button>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t border-muted"></span>
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={handleGoogleLogin}
                                className="w-full flex items-center justify-center gap-2 py-2 bg-white text-gray-900 border border-gray-300 rounded hover:bg-gray-50 transition-colors font-medium"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                        fill="#4285F4"
                                    />
                                    <path
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        fill="#34A853"
                                    />
                                    <path
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                        fill="#FBBC05"
                                    />
                                    <path
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                        fill="#EA4335"
                                    />
                                </svg>
                                Sign in with Google
                            </button>
                        </form>
                    </div>
                </div>
                <Toaster />
            </ThemeProvider>
        );
    }

    return (
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
            <Router>
                <GlobalErrorBoundary>
                    <Routes>
                        <Route path="/" element={<Layout />}>
                            <Route index element={<Navigate to="/studio" replace />} />
                            <Route path="studio" element={<Studio />} />
                            <Route path="vault" element={<IdeaVault />} />
                            <Route path="horizon" element={<Horizon />} />
                            <Route path="health" element={<SystemHealth />} />
                            <Route path="settings" element={<Settings />} />
                        </Route>
                    </Routes>
                </GlobalErrorBoundary>
            </Router>
            <Toaster />
        </ThemeProvider>
    );
}

export default App;
