import React, { useState, useEffect, useMemo } from 'react';

function BackgroundIngredients() {
    // 1. Track global cursor coordinates for the spotlight effect
    const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });

    useEffect(() => {
        const handleMouseMove = (e) => {
            setMousePos({ x: e.clientX, y: e.clientY });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, []);

    // 2. Generate randomized rising particles (sparks) memoized to avoid recalculations on coordinate shifts
    const sparks = useMemo(() => {
        return Array.from({ length: 18 }).map((_, i) => ({
            id: i,
            size: Math.floor(Math.random() * 4) + 2, // 2px to 5px
            left: `${Math.random() * 100}%`,
            delay: `-${Math.random() * 15}s`, // Negative delay starts them mid-animation for a natural feel
            duration: `${Math.random() * 16 + 14}s`, // 14s to 30s
            opacity: Math.round((Math.random() * 0.14 + 0.03) * 100) / 100
        }));
    }, []);

    // 3. Array of scattered food ingredients with positioning, SVG paths, colors, and animation types
    const ingredients = [
        // Tomato (Top Left)
        {
            id: 'tomato-1',
            color: '#ff4d4d',
            style: { top: '8%', left: '3%', width: '90px', height: '90px' },
            animation: 'animate-float',
            svg: (
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="13" r="8" />
                    <path d="M12 5c-.5 0-1 1-1 2h2c0-1-.5-2-1-2z" fill="#4caf50" />
                    <path d="M11.5 7.5L9 6m5 1.5L16 6" stroke="#4caf50" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
            )
        },
        // Basil Leaf (Top Right)
        {
            id: 'basil-1',
            color: '#4caf50',
            style: { top: '15%', right: '4%', width: '75px', height: '75px' },
            animation: 'animate-float-slow',
            svg: (
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12c0 5.52 4.48 10 10 10s10-4.48 10-10C22 6.48 17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8 0-3.5 2.25-6.5 5.39-7.58L12 11.23l2.61-6.81C17.75 5.5 20 8.5 20 12c0 4.41-3.59 8-8 8z" opacity="0.15" />
                    <path d="M12 3c-5 0-9 4-9 9 0 3 .8 5.7 2.2 7.8 1.8-3.8 5.8-6.8 9.8-7.8-1-2-1-5-3-9z" />
                </svg>
            )
        },
        // Chili Pepper (Middle Left)
        {
            id: 'chili-1',
            color: '#ff9f1c',
            style: { top: '42%', left: '2%', width: '85px', height: '85px' },
            animation: 'animate-float-spin',
            svg: (
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.66 4.34a1 1 0 00-1.41 0L15.3 7.29a7.94 7.94 0 00-4-.87c-3.79.25-6.9 3.25-7.26 7a8.07 8.07 0 005.15 8.35 15.82 15.82 0 009.68-1.57c2.81-1.61 4.49-4.83 4-8.08a7.84 7.84 0 00-2-4.14zm-3.5 12.39c-2 2.37-6.07 3-8.87 1.39A6.08 6.08 0 014.12 12a5.94 5.94 0 015.46-5.26c1.37-.08 2.62.35 3.59 1.13L10.3 10.7a1 1 0 101.41 1.41l2.88-2.88c.99 1.46.99 3.42.17 5.1-.38.8-.93 1.63-1.6 2.4z" />
                    <path d="M18.5 6.5l2-2" stroke="#4caf50" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
            )
        },
        // Mushroom (Middle Right)
        {
            id: 'mushroom-1',
            color: '#d4a373',
            style: { top: '55%', right: '3%', width: '80px', height: '80px' },
            animation: 'animate-float',
            svg: (
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V19c0 1.66 1.34 3 3 3h2c1.66 0 3-1.34 3-3v-4.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7zm2 17c0 .55-.45 1-1 1h-2c-.55 0-1-.45-1-1v-4h4v4z" />
                </svg>
            )
        },
        // Garlic (Bottom Left)
        {
            id: 'garlic-1',
            color: '#e2eafc',
            style: { bottom: '15%', left: '4%', width: '70px', height: '70px' },
            animation: 'animate-float-slow',
            svg: (
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2a1 1 0 00-1 .92C10.42 8.1 6 8.5 6 13.5a6 6 0 0012 0c0-5-4.42-5.4-5-10.58A1 1 0 0012 2zm3 16.5c-1 1-3.5 1.5-6 0s-2.5-3.5 0-4.5 5.5-1 6 1 1 2.5 0 3.5z" />
                </svg>
            )
        },
        // Lemon (Bottom Right)
        {
            id: 'lemon-1',
            color: '#ffeb3b',
            style: { bottom: '8%', right: '5%', width: '90px', height: '90px' },
            animation: 'animate-float-spin',
            svg: (
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="12" r="9" opacity="0.15" />
                    <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M12 4v16M4 12h16M6.34 6.34l11.32 11.32M6.34 17.66L17.66 6.34" stroke="currentColor" strokeWidth="1" />
                </svg>
            )
        }
    ];

    return (
        <div 
            className="fixed inset-0 w-full h-full pointer-events-none overflow-hidden z-0" 
            aria-hidden="true"
        >
            {/* 1. Dynamic Cursor Spotlight (Behind cards, illuminates as user moves cursor) */}
            <div 
                className="absolute inset-0 w-full h-full pointer-events-none z-0 transition-all duration-300 ease-out"
                style={{
                    background: `radial-gradient(circle 500px at ${mousePos.x}px ${mousePos.y}px, rgba(56, 224, 123, 0.12) 0%, rgba(6, 182, 212, 0.08) 45%, rgba(6, 182, 212, 0.04) 75%, transparent 100%)`
                }}
            />

            {/* 2. Shifting Liquid Color Orbs */}
            {/* Orb 1: Brand Emerald */}
            <div 
                className="absolute w-[60vw] h-[60vw] md:w-[45vw] md:h-[45vw] rounded-full bg-[#38e07b] opacity-[0.07] blur-[100px] md:blur-[140px] pointer-events-none animate-drift-one"
                style={{ top: '-10%', left: '-10%' }}
            />
            {/* Orb 2: Luminous Cyan */}
            <div 
                className="absolute w-[55vw] h-[55vw] md:w-[40vw] md:h-[40vw] rounded-full bg-[#06b6d4] opacity-[0.06] blur-[110px] md:blur-[150px] pointer-events-none animate-drift-two"
                style={{ bottom: '-15%', right: '-10%' }}
            />
            {/* Orb 3: Lime Green */}
            <div 
                className="absolute w-[45vw] h-[45vw] md:w-[35vw] md:h-[35vw] rounded-full bg-[#84cc16] opacity-[0.05] blur-[90px] md:blur-[130px] pointer-events-none animate-drift-three"
                style={{ top: '30%', right: '10%' }}
            />
            {/* Orb 4: Mint Green */}
            <div 
                className="absolute w-[40vw] h-[40vw] md:w-[28vw] md:h-[28vw] rounded-full bg-[#10b981] opacity-[0.04] blur-[100px] md:blur-[120px] pointer-events-none animate-drift-four"
                style={{ bottom: '25%', left: '15%' }}
            />

            {/* 3. Slow-Rotating Grid Matrix lines */}
            <div 
                className="absolute inset-0 w-full h-full opacity-[0.015] bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none animate-slow-rotate"
                style={{ transformOrigin: 'center center', scale: '1.6' }}
            />

            {/* 4. Rising Sparks Particle System (Star-like kitchen flares drifting upwards) */}
            {sparks.map(spark => (
                <div
                    key={spark.id}
                    className="absolute bg-white rounded-full animate-spark-rise pointer-events-none"
                    style={{
                        width: `${spark.size}px`,
                        height: `${spark.size}px`,
                        left: spark.left,
                        animationDelay: spark.delay,
                        animationDuration: spark.duration,
                        opacity: spark.opacity,
                        boxShadow: '0 0 8px #ffffff, 0 0 16px var(--primary)'
                    }}
                />
            ))}

            {/* 5. Food Ingredients SVGs (Interactive hover) */}
            {ingredients.map(item => (
                <div
                    key={item.id}
                    className={`absolute opacity-[0.05] hover:opacity-[0.25] hover:scale-110 transition-all duration-700 pointer-events-auto cursor-help ${item.animation} animate-fade-in-slow`}
                    style={{
                        ...item.style,
                        color: item.color,
                        transformOrigin: 'center center'
                    }}
                >
                    {item.svg}
                </div>
            ))}
        </div>
    );
}

export default BackgroundIngredients;
