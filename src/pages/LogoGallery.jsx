import React, { useId } from 'react';
import ContentAlchemyLogo from '../components/ContentAlchemyLogo';

const Concept1 = ({ size = 150 }) => {
    const id = useId();
    const gId = `g1-${id.replace(/:/g, '')}`;
    return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
            <defs>
                <linearGradient id={gId} x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#FF1CF7" /><stop offset="60%" stopColor="#7000FF" /><stop offset="100%" stopColor="#00E5FF" />
                </linearGradient>
                <filter id="glow1"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            </defs>
            <path d="M50 90 C 45 85, 20 60, 20 40 C 20 20, 50 10, 50 10 C 50 10, 80 20, 80 40 C 80 60, 55 85, 50 90 Z" fill={`url(#${gId})`} filter="url(#glow1)" fillOpacity="0.9" />
            <path d="M50 90 L 50 10" stroke="white" strokeWidth="2" strokeOpacity="0.8" strokeLinecap="round" filter="url(#glow1)" />
            <circle cx="50" cy="30" r="1.5" fill="white" /><circle cx="40" cy="45" r="1" fill="white" strokeOpacity="0.6" /><circle cx="60" cy="55" r="1" fill="white" strokeOpacity="0.6" /><circle cx="50" cy="70" r="1.5" fill="white" />
        </svg>
    );
};

const Concept2 = ({ size = 150 }) => {
    const id = useId();
    const gId = `g2-${id.replace(/:/g, '')}`;
    return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
            <defs>
                <linearGradient id={gId} x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#FF1CF7" /><stop offset="50%" stopColor="#7000FF" /><stop offset="100%" stopColor="#00E5FF" />
                </linearGradient>
            </defs>
            <path d="M35 85 C 20 65, 30 30, 50 15 C 70 30, 80 65, 65 85 L 50 78 L 35 85 Z" fill={`url(#${gId})`} fillOpacity="0.1" stroke="#00E5FF" strokeWidth="4" strokeLinejoin="round" />
            <path d="M50 15 L 50 78" stroke="#00E5FF" strokeWidth="2" />
            <path d="M35 60 L 50 50 M 65 60 L 50 50 M 40 40 L 50 35 M 60 40 L 50 35" stroke="#00E5FF" strokeWidth="2" strokeLinecap="round" />
            <rect x="48" y="48" width="4" height="4" fill="#00E5FF" /><rect x="58" y="38" width="3" height="3" fill="#00E5FF" /><rect x="39" y="58" width="3" height="3" fill="#00E5FF" />
        </svg>
    );
};

const Concept3 = ({ size = 150 }) => {
    return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
            <path d="M50 15 L 75 45 L 65 85 L 35 85 L 25 45 Z" fill="#7000FF" fillOpacity="0.2" stroke="#FF1CF7" strokeWidth="3" />
            <path d="M50 15 L 50 85" stroke="#FF1CF7" strokeWidth="1.5" />
            <path d="M50 15 L 25 45 M 50 15 L 75 45 M 50 50 L 25 45 M 50 50 L 75 45" stroke="#00E5FF" strokeWidth="2" />
            <circle cx="50" cy="15" r="4" fill="#00E5FF" style={{ filter: 'blur(2px)' }} />
            <circle cx="50" cy="15" r="2" fill="white" />
        </svg>
    );
};

const Concept4 = ({ size = 150 }) => {
    return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
            <path d="M50 90 C 20 70, 20 40, 50 10 C 80 40, 80 70, 50 90 C 50 90, 50 40, 50 10" stroke="#00E5FF" strokeWidth="4" strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 5px #00E5FF)' }} />
            <circle cx="50" cy="90" r="3" fill="#00E5FF" />
        </svg>
    );
};

const Concept5 = ({ size = 150 }) => {
    return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
            <g fill="#7000FF" fillOpacity="0.8">
                <rect x="45" y="10" width="10" height="10" rx="1" />
                <rect x="35" y="20" width="30" height="10" rx="1" />
                <rect x="25" y="30" width="50" height="20" rx="1" />
                <rect x="35" y="50" width="30" height="15" rx="1" />
                <rect x="45" y="65" width="10" height="15" rx="1" />
            </g>
            <rect x="48" y="10" width="4" height="70" fill="#00E5FF" />
            <g fill="#00E5FF" style={{ filter: 'blur(4px)' }}>
                <circle cx="50" cy="15" r="4" /><circle cx="50" cy="40" r="6" /><circle cx="50" cy="70" r="4" />
            </g>
        </svg>
    );
};

const Concept6 = ({ size = 150 }) => {
    return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
            <path d="M50 85 C 30 70, 30 30, 50 15 C 70 30, 70 70, 50 85" fill="#FF1CF7" fillOpacity="0.4" transform="rotate(-15 50 50)" />
            <path d="M50 85 C 30 70, 30 30, 50 15 C 70 30, 70 70, 50 85" fill="#00E5FF" fillOpacity="0.4" transform="rotate(15 50 50)" />
            <path d="M50 85 Q 50 50 50 15" stroke="white" strokeWidth="3" strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 5px white)' }} />
        </svg>
    );
};

export default function LogoGallery() {
    return (
        <div className="min-h-screen bg-slate-950 text-white p-8 flex flex-col items-center">
            <h1 className="text-3xl font-black mb-12 tracking-tighter">LOGO GALLERY</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-6xl w-full mb-12">
                <div className="bg-slate-900/50 p-8 rounded-2xl border border-slate-800 flex flex-col items-center text-center">
                    <div className="mb-6 bg-slate-950 p-6 rounded-xl border border-slate-800 shadow-2xl">
                        <Concept1 size={100} />
                    </div>
                    <h2 className="text-xl font-bold text-cyan-400 mb-2">1. Organic Symmetrist</h2>
                    <p className="text-slate-400 text-sm">Pure organic leaf shape with stardust veins.</p>
                </div>

                <div className="bg-slate-900/50 p-8 rounded-2xl border border-slate-800 flex flex-col items-center text-center">
                    <div className="mb-6 bg-slate-950 p-6 rounded-xl border border-slate-800 shadow-2xl">
                        <Concept2 size={100} />
                    </div>
                    <h2 className="text-xl font-bold text-cyan-400 mb-2">2. Data-Vein Leaf</h2>
                    <p className="text-slate-400 text-sm">Smooth edges with internal 'circuitboard' geometry.</p>
                </div>

                <div className="bg-slate-900/50 p-8 rounded-2xl border border-slate-800 flex flex-col items-center text-center">
                    <div className="mb-6 bg-slate-950 p-6 rounded-xl border border-slate-800 shadow-2xl">
                        <Concept3 size={100} />
                    </div>
                    <h2 className="text-xl font-bold text-cyan-400 mb-2">3. Alchemical Crystal</h2>
                    <p className="text-slate-400 text-sm">Sharp geometric shards forming a leaf silhouette.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-6xl w-full">
                <div className="bg-slate-900/50 p-8 rounded-2xl border border-slate-800 flex flex-col items-center text-center">
                    <div className="mb-6 bg-slate-950 p-6 rounded-xl border border-slate-800 shadow-2xl">
                        <Concept4 size={100} />
                    </div>
                    <h2 className="text-xl font-bold text-purple-400 mb-2">4. Infinity Stroke</h2>
                    <p className="text-slate-400 text-sm">A single-line continuous loop. Minimalist Zen.</p>
                </div>

                <div className="bg-slate-900/50 p-8 rounded-2xl border border-slate-800 flex flex-col items-center text-center">
                    <div className="mb-6 bg-slate-950 p-6 rounded-xl border border-slate-800 shadow-2xl">
                        <Concept5 size={100} />
                    </div>
                    <h2 className="text-xl font-bold text-purple-400 mb-2">5. Pixel Bloom</h2>
                    <p className="text-slate-400 text-sm">Retro-digital alchemical leaf. Computer-born.</p>
                </div>

                <div className="bg-slate-900/50 p-8 rounded-2xl border border-slate-800 flex flex-col items-center text-center">
                    <div className="mb-6 bg-slate-950 p-6 rounded-xl border border-slate-800 shadow-2xl">
                        <Concept6 size={100} />
                    </div>
                    <h2 className="text-xl font-bold text-purple-400 mb-2">6. Prism Layer</h2>
                    <p className="text-slate-400 text-sm">Overlapping vibrant translucent segments.</p>
                </div>
            </div>

            <div className="mt-16 p-6 bg-primary/10 border border-primary/20 rounded-xl max-w-2xl text-center">
                <p className="text-sm text-primary">Batch #2 is live! Which one hits the 'Cool' factor you are looking for?</p>
            </div>
        </div>
    );
}
