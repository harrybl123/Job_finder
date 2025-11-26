import React from 'react';
import { X, Briefcase, Star, ExternalLink, Search } from 'lucide-react';

interface JobListPanelProps {
    isOpen: boolean;
    onClose: () => void;
    jobTitle: string;
    reasoning?: string;
    keyStrengths?: string[];
    potentialGaps?: string[];
    loading?: boolean;
}

export default function JobListPanel({
    isOpen,
    onClose,
    jobTitle,
    reasoning,
    keyStrengths,
    potentialGaps,
    loading = false
}: JobListPanelProps) {

    if (!isOpen) return null;

    // Properly encode job title for URL
    const encodedTitle = encodeURIComponent(jobTitle);
    const encodedLocation = encodeURIComponent('United Kingdom');

    // Construct reliable job board search URLs
    const indeedUrl = `https://uk.indeed.com/jobs?q=${encodedTitle}&l=${encodedLocation}`;
    const linkedinUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodedTitle}&location=${encodedLocation}`;
    const reedUrl = `https://www.reed.co.uk/jobs/${encodedTitle.toLowerCase().replace(/%20/g, '-')}-jobs`;

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
                            <h3 className="text-white font-semibold flex items-center gap-2">
                                <Search className="w-5 h-5 text-cyan-400" />
                                Search on Job Boards
                            </h3>

                            {/* Indeed */}
                            <a
                                href={indeedUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block bg-white/5 hover:bg-white/10 backdrop-blur-lg border border-white/10 rounded-xl p-5 transition-all hover:scale-[1.02] hover:shadow-xl group"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <h4 className="text-white font-semibold text-lg mb-1 group-hover:text-cyan-300 transition-colors">
                                            Search on Indeed UK
                                        </h4>
                                        <p className="text-cyan-200 text-sm">UK's #1 job site with thousands of listings</p>
                                    </div>
                                    <ExternalLink className="w-5 h-5 text-cyan-400" />
                                </div>
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-blue-500 text-white rounded-lg font-medium text-sm">
                                    View {jobTitle} jobs →
                                </div>
                            </a>

                            {/* LinkedIn */}
                            <a
                                href={linkedinUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block bg-white/5 hover:bg-white/10 backdrop-blur-lg border border-white/10 rounded-xl p-5 transition-all hover:scale-[1.02] hover:shadow-xl group"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <h4 className="text-white font-semibold text-lg mb-1 group-hover:text-cyan-300 transition-colors">
                                            Search on LinkedIn Jobs
                                        </h4>
                                        <p className="text-cyan-200 text-sm">Professional network with curated opportunities</p>
                                    </div>
                                    <ExternalLink className="w-5 h-5 text-cyan-400" />
                                </div>
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-400 text-white rounded-lg font-medium text-sm">
                                    View {jobTitle} jobs →
                                </div>
                            </a>

                            {/* Reed */}
                            <a
                                href={reedUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block bg-white/5 hover:bg-white/10 backdrop-blur-lg border border-white/10 rounded-xl p-5 transition-all hover:scale-[1.02] hover:shadow-xl group"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <h4 className="text-white font-semibold text-lg mb-1 group-hover:text-cyan-300 transition-colors">
                                            Search on Reed.co.uk
                                        </h4>
                                        <p className="text-cyan-200 text-sm">Specialist UK recruitment with quality listings</p>
                                    </div>
                                    <ExternalLink className="w-5 h-5 text-cyan-400" />
                                </div>
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg font-medium text-sm">
                                    View {jobTitle} jobs →
                                </div>
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
