import React from 'react';
import { X, Briefcase, MapPin, DollarSign, ExternalLink, Bookmark, Star } from 'lucide-react';

interface Job {
    title: string;
    company: string;
    location: string;
    url: string;
    salary?: string;
}

interface JobListPanelProps {
    isOpen: boolean;
    onClose: () => void;
    jobTitle: string;
    jobs: Job[];
    count: number;
    reasoning?: string;
    keyStrengths?: string[];
    potentialGaps?: string[];
    loading?: boolean;
    onSaveJob?: (job: Job) => void;
}

export default function JobListPanel({
    isOpen,
    onClose,
    jobTitle,
    jobs,
    count,
    reasoning,
    keyStrengths,
    potentialGaps,
    loading = false,
    onSaveJob
}: JobListPanelProps) {

    const [savedIndices, setSavedIndices] = React.useState<Set<number>>(new Set());

    const handleSave = (job: Job, index: number) => {
        if (onSaveJob) {
            onSaveJob(job);
            setSavedIndices(prev => new Set(prev).add(index));
        }
    };

    if (!isOpen) return null;

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
                            {loading ? 'Searching...' : `${count} personalized matches found`}
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
                                    <h3 className="text-white font-semibold mb-1">Why these jobs fit you</h3>
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
                            {[1, 2, 3].map(i => (
                                <div key={i} className="bg-white/5 rounded-xl p-5 animate-pulse">
                                    <div className="h-5 bg-white/10 rounded w-3/4 mb-3" />
                                    <div className="h-4 bg-white/10 rounded w-1/2 mb-2" />
                                    <div className="h-4 bg-white/10 rounded w-2/3" />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Job Listings */}
                    {!loading && jobs.length > 0 && (
                        <div className="space-y-4">
                            {jobs.map((job, index) => {
                                const isSaved = savedIndices.has(index);
                                return (
                                    <div
                                        key={index}
                                        className="bg-white/5 hover:bg-white/10 backdrop-blur-lg border border-white/10 rounded-xl p-5 transition-all hover:scale-[1.02] hover:shadow-xl group"
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1">
                                                <h3 className="text-white font-semibold text-lg mb-1 group-hover:text-cyan-300 transition-colors">
                                                    {job.title}
                                                </h3>
                                                <p className="text-cyan-200 font-medium">{job.company}</p>
                                            </div>
                                            <button
                                                onClick={() => handleSave(job, index)}
                                                className={`p-2 rounded-lg transition-colors ${isSaved ? 'bg-yellow-500/20 text-yellow-400' : 'hover:bg-white/10 text-white/50 hover:text-yellow-400'}`}
                                            >
                                                <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
                                            </button>
                                        </div>

                                        <div className="space-y-2 mb-4">
                                            <div className="flex items-center gap-2 text-sm text-cyan-100">
                                                <MapPin className="w-4 h-4" />
                                                <span>{job.location}</span>
                                            </div>
                                            {job.salary && (
                                                <div className="flex items-center gap-2 text-sm text-green-300">
                                                    <DollarSign className="w-4 h-4" />
                                                    <span>{job.salary}</span>
                                                </div>
                                            )}
                                        </div>

                                        <a
                                            href={job.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-blue-500 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-orange-500/50 transition-all"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                            Apply Now
                                        </a>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Empty State */}
                    {!loading && jobs.length === 0 && (
                        <div className="text-center py-12">
                            <Briefcase className="w-16 h-16 text-white/20 mx-auto mb-4" />
                            <p className="text-white/50 text-lg">No jobs found for this role yet.</p>
                            <p className="text-white/30 text-sm mt-2">Try exploring other career paths in the Galaxy.</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
