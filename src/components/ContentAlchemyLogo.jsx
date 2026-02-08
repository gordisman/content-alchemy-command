import React, { useId } from 'react';

const ContentAlchemyLogo = ({ size = 150, className = "" }) => {
    const id = useId();
    const glowId = `glow-${id.replace(/:/g, '')}`;
    const isSmall = size <= 48;

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <defs>
                <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation={isSmall ? "1" : "2.5"} result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            {/* DISTRIBUTION ARROWS (Magenta Neon) */}
            <g stroke="#FF1CF7" strokeWidth={isSmall ? "5" : "3.5"} strokeLinecap="round" strokeLinejoin="round" filter={`url(#${glowId})`}>
                {/* UP ARROW */}
                <path d="M50 35 L 50 15 M 42 22 L 50 14 L 58 22" strokeOpacity="1" />

                {/* LEFT ARROW (Dashed) */}
                <path d="M35 48 L 22 35 M 22 43 L 20 33 L 30 35" strokeOpacity="0.8" strokeDasharray={isSmall ? "0" : "4 4"} />

                {/* RIGHT ARROW (Dashed) */}
                <path d="M65 48 L 78 35 M 70 35 L 80 33 L 78 43" strokeOpacity="0.8" strokeDasharray={isSmall ? "0" : "4 4"} />
            </g>

            {/* DATA HUB (Isometric Blocks - Cyan Neon) */}
            <g transform="translate(0, 10)">
                {/* BASE BLOCK */}
                <path
                    d="M50 75 L 25 65 L 50 55 L 75 65 Z"
                    fill="#00E5FF"
                    fillOpacity="0.1"
                    stroke="#00E5FF"
                    strokeWidth={isSmall ? "4" : "3"}
                    strokeLinejoin="round"
                    filter={`url(#${glowId})`}
                />
                <path d="M25 65 L 25 75 L 50 85 L 75 75 L 75 65" stroke="#00E5FF" strokeWidth={isSmall ? "4" : "3"} strokeLinejoin="round" filter={`url(#${glowId})`} />

                {/* STACKED CORE BLOCKS */}
                <g filter={`url(#${glowId})`}>
                    {/* Top Surface of Top Block */}
                    <path d="M50 40 L 35 46 L 50 52 L 65 46 Z" fill="#00E5FF" fillOpacity="0.9" />

                    {/* Block 1 (Top) */}
                    <path d="M35 46 L 35 54 L 50 60 L 65 54 L 65 46" stroke="#00E5FF" strokeWidth="2" strokeLinejoin="round" />
                    <path d="M50 63 L 35 57 M 50 63 L 65 57" stroke="#00E5FF" strokeWidth="1" strokeOpacity="0.5" />

                    {/* Block 2 (Middle) */}
                    <path d="M35 56 L 35 64 L 50 70 L 65 64 L 65 56" stroke="#00E5FF" strokeWidth="2" strokeLinejoin="round" />
                </g>

                {/* Internal Details (Larger only) */}
                {!isSmall && (
                    <g stroke="#00E5FF" strokeWidth="1" strokeOpacity="0.6">
                        <path d="M68 68 L 72 68" />
                        <circle cx="65" cy="72" r="1.5" fill="#00E5FF" />
                    </g>
                )}
            </g>
        </svg>
    );
};

export default ContentAlchemyLogo;
