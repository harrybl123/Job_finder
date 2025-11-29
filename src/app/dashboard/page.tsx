'use client';

import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { Sparkles, Map, FileText, TrendingUp, ArrowRight, Mic } from 'lucide-react';
import Navbar from '@/components/Navbar';

export default function DashboardHome() {
    const { user, isLoaded } = useUser();

    if (!isLoaded) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
                <div className="text-white text-lg">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
            <Navbar />

            {/* Background Effects */}
            <div className="absolute top-0 -left-4 w-72 h-72 bg-orange-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
            <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-8 left-20 w-72 h-72 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
                {/* Welcome Header */}
                <div className="mb-12">
                    <h1 className="text-4xl lg:text-5xl font-bold mb-4 bg-gradient-to-r from-orange-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                        Welcome back, {user?.firstName || 'there'}! 👋
                    </h1>
                    <p className="text-xl text-blue-200">
                        Your AI-powered career toolkit
                    </p>
                </div>

                {/* Quick Actions Grid */}
                <div className="grid md:grid-cols-2 gap-6 mb-12">
                    {/* Career Galaxy Card */}
                    <Link href="/dashboard/explore">
                        <div className="group bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 hover:border-cyan-400/50 transition-all duration-300 hover:scale-[1.02] cursor-pointer">
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-2xl">
                                    <Map className="w-8 h-8 text-cyan-400" />
                                </div>
                                <ArrowRight className="w-6 h-6 text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <h2 className="text-2xl font-bold mb-2 text-white">Career Galaxy</h2>
                            <p className="text-blue-200 mb-4">
                                Explore AI-recommended career paths and discover your potential
                            </p>
                            <div className="text-sm text-cyan-400 font-medium">
                                Start exploring →
                            </div>
                        </div>
                    </Link>

                    {/* Cover Letter Generator Card */}
                    <Link href="/dashboard/cover-letter">
                        <div className="group bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 hover:border-purple-400/50 transition-all duration-300 hover:scale-[1.02] cursor-pointer">
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl">
                                    <FileText className="w-8 h-8 text-purple-400" />
                                </div>
                                <ArrowRight className="w-6 h-6 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <h2 className="text-2xl font-bold mb-2 text-white">Cover Letter Creator</h2>
                            <p className="text-blue-200 mb-4">
                                Generate tailored cover letters powered by AI
                            </p>
                            <div className="text-sm text-purple-400 font-medium">
                                Create letter →
                            </div>
                        </div>
                    </Link>

                    {/* Interview Coach Card */}
                    <Link href="/dashboard/interview">
                        <div className="group bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 hover:border-green-400/50 transition-all duration-300 hover:scale-[1.02] cursor-pointer">
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-2xl">
                                    <Mic className="w-8 h-8 text-green-400" />
                                </div>
                                <ArrowRight className="w-6 h-6 text-green-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <h2 className="text-2xl font-bold mb-2 text-white">Interview Coach</h2>
                            <p className="text-blue-200 mb-4">
                                Practice with an AI interviewer using voice
                            </p>
                            <div className="text-sm text-green-400 font-medium">
                                Start practicing →
                            </div>
                        </div>
                    </Link>
                </div>

                {/* Coming Soon */}
                <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10">
                    <div className="flex items-center gap-3 mb-4">
                        <TrendingUp className="w-6 h-6 text-orange-400" />
                        <h3 className="text-xl font-bold">Coming Soon</h3>
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                        <div className="p-4 bg-white/5 rounded-xl">
                            <p className="text-sm font-medium text-blue-200">📊 Application Tracker</p>
                        </div>
                        <div className="p-4 bg-white/5 rounded-xl">
                            <p className="text-sm font-medium text-blue-200">💼 Saved Searches</p>
                        </div>
                        <div className="p-4 bg-white/5 rounded-xl">
                            <p className="text-sm font-medium text-blue-200">🎯 Interview Prep</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
