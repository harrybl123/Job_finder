'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles, Target, Zap, Globe, Shield } from 'lucide-react';
import Navbar from '@/components/Navbar';

export default function LandingPage() {
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [sparkles, setSparkles] = useState<Array<{ id: number; x: number; y: number }>>([]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setMousePos({ x: e.clientX, y: e.clientY });

            // Add sparkle particles
            if (Math.random() > 0.7) { // 30% chance to spawn sparkle
                const newSparkle = {
                    id: Date.now() + Math.random(),
                    x: e.clientX + (Math.random() - 0.5) * 100,
                    y: e.clientY + (Math.random() - 0.5) * 100,
                };
                setSparkles(prev => [...prev.slice(-10), newSparkle]); // Keep last 10 sparkles
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    return (
        <main className="min-h-screen bg-slate-950 text-white selection:bg-cyan-500/30">
            <Navbar />

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
                {/* Cursor spotlight and sparkles */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {/* Smooth cursor spotlight */}
                    <div
                        className="absolute w-[500px] h-[500px] rounded-full transition-all duration-200 ease-out"
                        style={{
                            left: `${mousePos.x}px`,
                            top: `${mousePos.y}px`,
                            transform: 'translate(-50%, -50%)',
                            background: 'radial-gradient(circle, rgba(34, 211, 238, 0.2) 0%, rgba(168, 85, 247, 0.15) 40%, transparent 70%)',
                            filter: 'blur(60px)',
                            mixBlendMode: 'screen'
                        }}
                    />

                    {/* Sparkle particles */}
                    {sparkles.map(sparkle => (
                        <div
                            key={sparkle.id}
                            className="absolute w-1 h-1 bg-cyan-400 rounded-full animate-sparkle"
                            style={{
                                left: `${sparkle.x}px`,
                                top: `${sparkle.y}px`,
                                boxShadow: '0 0 10px 2px rgba(34, 211, 238, 0.8)',
                            }}
                        />
                    ))}
                </div>

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-8 animate-fade-in">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                        </span>
                        <span className="text-sm text-cyan-200 font-medium">AI-Powered Career Navigation</span>
                    </div>

                    <h1 className="text-5xl lg:text-7xl font-bold tracking-tight mb-8 bg-gradient-to-b from-white via-white to-slate-400 bg-clip-text text-transparent">
                        Navigate Your <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">Career Galaxy</span>
                    </h1>

                    <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                        Stop searching blindly. Let AI analyze your skills, map your potential paths, and guide you to the perfect role with precision.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link
                            href="/dashboard"
                            className="group relative px-8 py-4 bg-white text-slate-900 rounded-xl font-semibold text-lg hover:bg-cyan-50 transition-all hover:scale-105 hover:shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)]"
                        >
                            Start Your Journey
                            <ArrowRight className="inline-block ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <Link
                            href="#features"
                            className="px-8 py-4 bg-white/5 text-white rounded-xl font-semibold text-lg hover:bg-white/10 transition-all border border-white/10"
                        >
                            How it Works
                        </Link>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section id="features" className="py-24 bg-slate-900/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold mb-4">Why Choose Career Navigator?</h2>
                        <p className="text-slate-400 max-w-2xl mx-auto">
                            Traditional job boards are broken. We use advanced AI to match you based on skills, potential, and cultural fit—not just keywords.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: <Sparkles className="w-6 h-6 text-purple-400" />,
                                title: "AI Skill Analysis",
                                description: "Upload your CV and let our AI decode your true potential, identifying transferable skills you didn't know you had."
                            },
                            {
                                icon: <Target className="w-6 h-6 text-cyan-400" />,
                                title: "Smart Matching",
                                description: "Get matched with roles that fit your experience level and career goals, filtering out noise automatically."
                            },
                            {
                                icon: <Globe className="w-6 h-6 text-emerald-400" />,
                                title: "Visual Career Galaxy",
                                description: "Explore your career possibilities in an interactive 3D map. See where you are and where you could go."
                            }
                        ].map((feature, idx) => (
                            <div key={idx} className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                                <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center mb-6 border border-white/10">
                                    {feature.icon}
                                </div>
                                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                                <p className="text-slate-400 leading-relaxed">
                                    {feature.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 border-t border-white/10 bg-slate-950">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-cyan-500" />
                        <span className="font-semibold">Jobsworth</span>
                    </div>
                    <p className="text-slate-500 text-sm">
                        © {new Date().getFullYear()} Jobsworth. All rights reserved.
                    </p>
                </div>
            </footer>
        </main>
    );
}
