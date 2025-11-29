import React, { useState } from 'react';
import { X, Briefcase, Star, ExternalLink, Search, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';

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

    // Helper to get level keyword for job searches
    const getLevelKeyword = (level?: number) => {
        if (!level) return '';
        if (level <= 2) return 'Entry Level ';      // Levels 1-2: Entry/Junior
        if (level <= 5) return 'Mid Level ';        // Levels 3-5: Mid-level
        return 'Senior ';                           // Levels 6+: Senior
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
        adzuna: `https://www.adzuna.co.uk/jobs/search?q=${encodeURIComponent(searchTitle)}&w=${encodeURIComponent(userLocation)}&ac_where=1` // Adzuna job aggregator
    };

    const router = useRouter();

    const handleWriteCoverLetter = () => {
        // Filter out null values and create a clean object
        const activeLinks = Object.fromEntries(
            Object.entries(boardUrls).filter(([_, url]) => url !== null)
        );

        const params = new URLSearchParams({
            jobTitle: searchTitle, // Use the level-aware title
            jobLinks: JSON.stringify(activeLinks)
        });
        router.push(`/dashboard/cover-letter?${params.toString()}`);
    };

    const handleTestInterview = () => {
        const params = new URLSearchParams({
            jobTitle: searchTitle, // Use the level-aware title
            company: 'Target Company',
            jobDescription: `Interview for the role of ${searchTitle}`
        });
        router.push(`/dashboard/interview?${params.toString()}`);
    };

    const renderJobBoardCard = (name: string, url: string, type: 'Startups' | 'Corporate', description: string) => (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-white/5 hover:bg-white/10 backdrop-blur-lg border border-white/10 rounded-xl p-4 transition-all hover:scale-[1.02] hover:shadow-xl group"
        >
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <h4 className="text-white font-semibold text-base mb-1 group-hover:text-cyan-300 transition-colors flex items-center gap-2">
                        {name}
                        <span className={`text-xs px-2 py-0.5 rounded ${type === 'Startups' ? 'bg-purple-500/30 text-purple-200' : 'bg-blue-500/30 text-blue-200'}`}>
                            {type}
                        </span>
                    </h4>
                    <p className="text-cyan-200 text-xs">{description}</p>
                </div>
                <ExternalLink className="w-4 h-4 text-cyan-400 ml-3" />
            </div>
        </a>
    );

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-fade-in"
                onClick={onClose}
            />

            {/* Panel */}
            <div
                className="fixed right-0 top-0 h-full w-full max-w-2xl bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 shadow-2xl z-50 overflow-y-auto overscroll-contain animate-slide-in-right pt-16"
                onWheel={(e) => e.stopPropagation()}
            >

                {/* Header */}
                <div className="sticky top-0 bg-slate-900/95 backdrop-blur-lg border-b border-white/10 p-6 z-10">
                    <div className="flex items-start justify-between mb-4">
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

                    <div className="flex gap-3">
                        <button
                            onClick={handleWriteCoverLetter}
                            className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl font-semibold shadow-lg transition-all hover:scale-[1.01] flex items-center justify-center gap-2"
                        >
                            <FileText className="w-5 h-5" />
                            Write Cover Letter
                        </button>
                        <button
                            onClick={handleTestInterview}
                            className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-xl font-semibold shadow-lg transition-all hover:scale-[1.01] flex items-center justify-center gap-2"
                        >
                            <Briefcase className="w-5 h-5" />
                            Practice Interview
                        </button>
                    </div>
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
                                        {boardUrls.wellfound && renderJobBoardCard(
                                            'Wellfound (AngelList)',
                                            boardUrls.wellfound,
                                            'Startups',
                                            'Premier platform for startup jobs & equity'
                                        )}

                                        {renderJobBoardCard(
                                            'Welcome to the Jungle',
                                            boardUrls.welcomeToJungle,
                                            'Startups',
                                            'Otta rebranded - top UK & EU startups'
                                        )}

                                        {renderJobBoardCard(
                                            'Adzuna',
                                            boardUrls.adzuna,
                                            'Startups',
                                            'Multi-source aggregator with startup & corporate jobs'
                                        )}
                                    </>
                                )}

                                {(activeCategory === 'corporate' || activeCategory === 'all') && (
                                    <>
                                        {renderJobBoardCard(
                                            'Indeed UK',
                                            boardUrls.indeed,
                                            'Corporate',
                                            "UK's #1 job site with thousands of listings"
                                        )}

                                        {renderJobBoardCard(
                                            'LinkedIn Jobs',
                                            boardUrls.linkedin,
                                            'Corporate',
                                            'Professional network with curated opportunities'
                                        )}

                                        {renderJobBoardCard(
                                            'Reed.co.uk',
                                            boardUrls.reed,
                                            'Corporate',
                                            'Specialist UK recruitment with quality listings'
                                        )}
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
