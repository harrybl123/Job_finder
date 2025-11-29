'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SignInButton, SignUpButton, UserButton, useUser } from '@clerk/nextjs';
import { Sparkles, Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function Navbar() {
    const { isSignedIn, isLoaded } = useUser();
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const isDashboard = pathname?.startsWith('/dashboard');

    return (
        <nav className="fixed top-0 left-0 right-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-white/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 group">
                        <span className="font-bold text-2xl bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent group-hover:from-cyan-300 group-hover:to-purple-300 transition-all">
                            Jobsworth
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-8">
                        {!isDashboard && (
                            <>
                                <Link href="#features" className="text-sm text-slate-400 hover:text-white transition-colors">
                                    How it Works
                                </Link>
                            </>
                        )}

                        {isLoaded && (
                            <div className="flex items-center gap-4">
                                {isSignedIn ? (
                                    <>
                                        <Link
                                            href="/dashboard"
                                            className={`text-sm font-medium transition-colors ${isDashboard
                                                ? 'text-cyan-400'
                                                : 'text-slate-400 hover:text-white'
                                                }`}
                                        >
                                            Dashboard
                                        </Link>
                                        <UserButton
                                            afterSignOutUrl="/"
                                            appearance={{
                                                elements: {
                                                    avatarBox: "w-8 h-8 ring-2 ring-white/10 hover:ring-white/20 transition-all"
                                                }
                                            }}
                                        />
                                    </>
                                ) : (
                                    <>
                                        <SignInButton mode="modal">
                                            <button className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
                                                Sign In
                                            </button>
                                        </SignInButton>
                                        <SignUpButton mode="modal">
                                            <button className="text-sm font-medium bg-white text-slate-900 px-4 py-2 rounded-lg hover:bg-cyan-50 transition-colors">
                                                Get Started
                                            </button>
                                        </SignUpButton>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="md:hidden p-2 text-slate-400 hover:text-white"
                    >
                        {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="md:hidden bg-slate-900 border-b border-white/10">
                    <div className="px-4 pt-2 pb-4 space-y-2">
                        {!isDashboard && (
                            <>
                                <Link
                                    href="#features"
                                    className="block px-3 py-2 text-base font-medium text-slate-400 hover:text-white hover:bg-white/5 rounded-lg"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    How it Works
                                </Link>
                            </>
                        )}

                        {isLoaded && !isSignedIn && (
                            <div className="pt-4 mt-4 border-t border-white/10 flex flex-col gap-3">
                                <SignInButton mode="modal">
                                    <button className="w-full text-center py-2 text-slate-300 hover:text-white font-medium">
                                        Sign In
                                    </button>
                                </SignInButton>
                                <SignUpButton mode="modal">
                                    <button className="w-full text-center py-2 bg-white text-slate-900 rounded-lg font-medium">
                                        Get Started
                                    </button>
                                </SignUpButton>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
}
