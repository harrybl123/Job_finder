import React, { useState } from 'react';
import { X, Briefcase, Star, ExternalLink, Search } from 'lucide-react';

interface JobListPanelProps {
    isOpen: boolean;
    onClose: () => void;
    jobTitle: string;
    reasoning?: string;
    keyStrengths?: string[];
    potentialGaps?: string[];
    loading?: boolean;
    userLevel?: number;
    userLocation?: string;
}

export default function JobListPanel({
    isOpen,
    onClose,
    jobTitle,
    reasoning,
    keyStrengths,
    potentialGaps,
    loading = false,
    userLevel,
    userLocation = 'London'
}: JobListPanelProps) {

    const [activeCategory, setActiveCategory] = useState<'startups' | 'corporate' | 'all'>('startups');

    if (!isOpen) return null;

    // Slugify helper for URL-safe strings
    const slugify = (text: string): string => {
        return text.toLowerCase().trim()
            .replace(/\s+/g, '-')       // Replace spaces with -
            .replace(/[^\w-]+/g, '')   // Remove all non-word chars
            .replace(/--+/g, '-')      // Replace multiple - with single -
            .replace(/^-+|-+$/g, '');  // Trim dashes from start/end
    };

    // Helper to get level keyword
    const getLevelKeyword = (level?: number) => {
        if (!level) return '';
        if (level <= 2) return 'Junior ';
        if (level <= 5) return 'Mid-Level ';
        return 'Senior ';
    };

    const levelKeyword = getLevelKeyword(userLevel);
    const searchTitle = `${levelKeyword}${jobTitle}`;

    // Slugified versions for path-based URLs
    const titleSlug = slugify(searchTitle);
    const locationSlug = slugify(userLocation);

    // Wellfound role mapping - they only support specific predefined categories
    const wellfoundRoles: Record<string, string> = {
        'software engineer': 'software-engineer',
        'engineer': 'software-engineer',
        'engineering manager': 'engineering-manager',
        'ai engineer': 'artificial-intelligence-engineer-ai',
        'machine learning engineer': 'machine-learning-engineer',
        'ml engineer': 'machine-learning-engineer',
        'product manager': 'product-manager',
        'backend engineer': 'backend-engineer',
        'mobile engineer': 'mobile-engineer',
        'product designer': 'product-designer',
        'frontend engineer': 'frontend-engineer',
        'full stack engineer': 'full-stack-engineer',
        'fullstack engineer': 'full-stack-engineer',
        'data scientist': 'data-scientist',
        'designer': 'designer',
        'software architect': 'software-architect',
        'devops engineer': 'devops-engineer'
    };

    // Find matching Wellfound role
    const getWellfoundRole = (title: string): string | null => {
        const lowerTitle = title.toLowerCase();
        for (const [key, slug] of Object.entries(wellfoundRoles)) {
            if (lowerTitle.includes(key)) {
                return slug;
            }
        }
        return null;
    };

    const wellfoundRole = getWellfoundRole(searchTitle);

    // URL builders for each board (custom logic per platform)
    const boardUrls = {
        // Standard query-based boards
        indeed: `https://uk.indeed.com/jobs?q=${encodeURIComponent(searchTitle)}&l=${encodeURIComponent(userLocation)}`,
        linkedin: `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(searchTitle)}&location=${encodeURIComponent(userLocation)}`,
        reed: `https://www.reed.co.uk/jobs/${titleSlug}-jobs-in-${locationSlug}`,

        // Niche startup boards with custom URL patterns
        wellfound: wellfoundRole ? `https://wellfound.com/role/l/${wellfoundRole}/${locationSlug}` : null,
        welcomeToJungle: `https://www.welcometothejungle.com/en/jobs?query=${encodeURIComponent(searchTitle)}&refinementList%5Boffices.country_code%5D%5B%5D=GB&refinementList%5Boffices.city%5D%5B%5D=${encodeURIComponent(userLocation)}`,
        workInStartups: `https://workinstartups.com/job-board/jobs/search/?keywords=${encodeURIComponent(searchTitle)}&location=${encodeURIComponent(userLocation)}` // UK startup jobs with reliable search
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-fade-in"
                onClick={onClose}
            />

            {/* Panel */}
            <div
                className="fixed right-0 top-0 h-full w-full max-w-2xl bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 shadow-2xl z-50 overflow-y-auto overscroll-contain animate-slide-in-right"
                onWheel={(e) => e.stopPropagation()}
            >

                {/* Header */}
                <div className="sticky top-0 bg-slate-900/95 backdrop-blur-lg border-b border-white/10 p-6 flex items-start justify-between z-10">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-1">{jobTitle}</h2>
                        <p className="text-cyan-300 text-sm">
                            Search for jobs on major UK job boards
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X className="w-6 h-6 text-white" />
                    </button>
                </div>

                <div className="p-6 space-y-6">

                    {/* AI Reasoning Card */}
                    {reasoning && (
                        <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 backdrop-blur-lg border border-purple-400/30 rounded-2xl p-5">
                            <div className="flex items-start gap-3 mb-3">
                                <Star className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="text-white font-semibold mb-1">Why this role fits you</h3>
                                    <p className="text-purple-100 text-sm leading-relaxed">{reasoning}</p>
                                </div>
                            </div>

                            {keyStrengths && keyStrengths.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-purple-400/20">
                                    <p className="text-purple-200 text-xs font-medium mb-2">Your Strengths:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {keyStrengths.map((strength, i) => (
                                            <span key={i} className="px-3 py-1 bg-purple-500/30 text-purple-100 rounded-full text-xs">
                                                {strength}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Loading State */}
                    {loading && (
                        <div className="space-y-4">
                            <div className="bg-white/5 rounded-xl p-5 animate-pulse">
                                <div className="h-5 bg-white/10 rounded w-3/4 mb-3" />
                                <div className="h-4 bg-white/10 rounded w-1/2" />
                            </div>
                        </div>
                    )}

                    {/* Job Board Search Links */}
                    {!loading && (
                        <div className="space-y-4">
                            <div className="mb-4">
                                <h3 className="text-white font-semibold flex items-center gap-2 mb-2">
                                    <Search className="w-5 h-5 text-cyan-400" />
                                    Search on Job Boards
                                </h3>
                                <p className="text-cyan-300 text-sm">
                                    Searching for: <span className="font-semibold text-white">{searchTitle}</span> in <span className="font-semibold text-white">{userLocation}</span>
                                </p>
                            </div>

                            {/* Category Tabs */}
                            <div className="flex gap-2 border-b border-white/10 pb-3">
                                <button
                                    onClick={() => setActiveCategory('startups')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeCategory === 'startups'
                                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                                        : 'text-cyan-200 hover:bg-white/10'
                                        }`}
                                >
                                    🚀 Startups
                                </button>
                                <button
                                    onClick={() => setActiveCategory('corporate')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeCategory === 'corporate'
                                        ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
                                        : 'text-cyan-200 hover:bg-white/10'
                                        }`}
                                >
                                    🏢 Corporate
                                </button>
                                <button
                                    onClick={() => setActiveCategory('all')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeCategory === 'all'
                                        ? 'bg-gradient-to-r from-orange-500 to-blue-500 text-white shadow-lg'
                                        : 'text-cyan-200 hover:bg-white/10'
                                        }`}
                                >
                                    🌎 All
                                </button>
                            </div>

                            {/* Board Listings */}
                            <div className="space-y-3">
                                {(activeCategory === 'startups' || activeCategory === 'all') && (
                                    <>
                                        {/* Wellfound (AngelList) - only show if role matches their categories */}
                                        {boardUrls.wellfound && (
                                            <a
                                                href={boardUrls.wellfound}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block bg-white/5 hover:bg-white/10 backdrop-blur-lg border border-white/10 rounded-xl p-4 transition-all hover:scale-[1.02] hover:shadow-xl group"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex-1">
                                                        <h4 className="text-white font-semibold text-base mb-1 group-hover:text-cyan-300 transition-colors flex items-center gap-2">
                                                            Wellfound (AngelList)
                                                            <span className="text-xs bg-purple-500/30 text-purple-200 px-2 py-0.5 rounded">Startups</span>
                                                        </h4>
                                                        <p className="text-cyan-200 text-xs">Premier platform for startup jobs & equity</p>
                                                    </div>
                                                    <ExternalLink className="w-4 h-4 text-cyan-400 ml-3" />
                                                </div>
                                            </a>
                                        )}

                                        {/* Otta */}
                                        <a
                                            href={boardUrls.welcomeToJungle}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block bg-white/5 hover:bg-white/10 backdrop-blur-lg border border-white/10 rounded-xl p-4 transition-all hover:scale-[1.02] hover:shadow-xl group"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <h4 className="text-white font-semibold text-base mb-1 group-hover:text-cyan-300 transition-colors flex items-center gap-2">
                                                        Welcome to the Jungle
                                                        <span className="text-xs bg-purple-500/30 text-purple-200 px-2 py-0.5 rounded">Startups</span>
                                                    </h4>
                                                    <p className="text-cyan-200 text-xs">Otta rebranded - top UK & EU startups</p>
                                                </div>
                                                <ExternalLink className="w-4 h-4 text-cyan-400 ml-3" />
                                            </div>
                                        </a>

                                        {/* WorkInStartups */}
                                        <a
                                            href={boardUrls.workInStartups}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block bg-white/5 hover:bg-white/10 backdrop-blur-lg border border-white/10 rounded-xl p-4 transition-all hover:scale-[1.02] hover:shadow-xl group"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <h4 className="text-white font-semibold text-base mb-1 group-hover:text-cyan-300 transition-colors flex items-center gap-2">
                                                        WorkInStartups
                                                        <span className="text-xs bg-purple-500/30 text-purple-200 px-2 py-0.5 rounded">Startups</span>
                                                    </h4>
                                                    <p className="text-cyan-200 text-xs">UK's largest startup job board with 1000s+ roles</p>
                                                </div>
                                                <ExternalLink className="w-4 h-4 text-cyan-400 ml-3" />
                                            </div>
                                        </a>
                                    </>
                                )}

                                {(activeCategory === 'corporate' || activeCategory === 'all') && (
                                    <>
                                        {/* Indeed */}
                                        <a
                                            href={boardUrls.indeed}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block bg-white/5 hover:bg-white/10 backdrop-blur-lg border border-white/10 rounded-xl p-4 transition-all hover:scale-[1.02] hover:shadow-xl group"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <h4 className="text-white font-semibold text-base mb-1 group-hover:text-cyan-300 transition-colors flex items-center gap-2">
                                                        Indeed UK
                                                        <span className="text-xs bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded">Corporate</span>
                                                    </h4>
                                                    <p className="text-cyan-200 text-xs">UK's #1 job site with thousands of listings</p>
                                                </div>
                                                <ExternalLink className="w-4 h-4 text-cyan-400 ml-3" />
                                            </div>
                                        </a>

                                        {/* LinkedIn */}
                                        <a
                                            href={boardUrls.linkedin}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block bg-white/5 hover:bg-white/10 backdrop-blur-lg border border-white/10 rounded-xl p-4 transition-all hover:scale-[1.02] hover:shadow-xl group"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <h4 className="text-white font-semibold text-base mb-1 group-hover:text-cyan-300 transition-colors flex items-center gap-2">
                                                        LinkedIn Jobs
                                                        <span className="text-xs bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded">Corporate</span>
                                                    </h4>
                                                    <p className="text-cyan-200 text-xs">Professional network with curated opportunities</p>
                                                </div>
                                                <ExternalLink className="w-4 h-4 text-cyan-400 ml-3" />
                                            </div>
                                        </a>

                                        {/* Reed */}
                                        <a
                                            href={boardUrls.reed}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block bg-white/5 hover:bg-white/10 backdrop-blur-lg border border-white/10 rounded-xl p-4 transition-all hover:scale-[1.02] hover:shadow-xl group"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <h4 className="text-white font-semibold text-base mb-1 group-hover:text-cyan-300 transition-colors flex items-center gap-2">
                                                        Reed.co.uk
                                                        <span className="text-xs bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded">Corporate</span>
                                                    </h4>
                                                    <p className="text-cyan-200 text-xs">Specialist UK recruitment with quality listings</p>
                                                </div>
                                                <ExternalLink className="w-4 h-4 text-cyan-400 ml-3" />
                                            </div>
                                        </a>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
