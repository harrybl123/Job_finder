'use client';

import React, { useState, useEffect } from 'react';
import { Briefcase, MapPin, DollarSign, ExternalLink, Loader2 } from 'lucide-react';
import SearchSettings from './SearchSettings';

export interface Job {
    id: string;
    title: string;
    company: string;
    location: string;
    description: string;
    salary: string;
    url: string;
    source?: string; // Added source field
    matchScore?: number;
    matchReason?: string;
    scoreBreakdown?: {
        skills: number;
        experience: number;
        relevance: number;
        other: number;
    };
    matchingSkills?: string[];
    missingSkills?: string[];
}

interface JobResultsProps {
    searchParams?: any;
    cvText: string;
}

export default function JobResults({ searchParams = {}, cvText }: JobResultsProps) {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [ranking, setRanking] = useState(false);
    const [limit, setLimit] = useState(10);
    const [location, setLocation] = useState('London, United Kingdom');
    const [experienceLevel, setExperienceLevel] = useState('any');
    const [workType, setWorkType] = useState('any');
    const [datePosted, setDatePosted] = useState('any');

    const fetchJobs = async (params?: any) => {
        setLoading(true);
        try {
            const searchBody = {
                ...searchParams,
                location: params?.location || location,
                limit: params?.limit || limit,
                experienceLevel: params?.experienceLevel || experienceLevel,
                workType: params?.workType || workType,
                datePosted: params?.datePosted || datePosted,
                cvText: cvText, // Pass CV for relevance scoring
            };

            const response = await fetch('/api/search-jobs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(searchBody),
            });
            const data = await response.json();
            const fetchedJobs = data.jobs || [];

            // Rank jobs using AI
            if (fetchedJobs.length > 0 && cvText) {
                setRanking(true);
                try {
                    const rankResponse = await fetch('/api/rank-jobs', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            jobs: fetchedJobs,
                            cvText: cvText,
                        }),
                    });
                    const rankData = await rankResponse.json();
                    setJobs(rankData.rankedJobs || fetchedJobs);
                } catch (rankError) {
                    console.error('Ranking failed, showing unranked:', rankError);
                    setJobs(fetchedJobs);
                } finally {
                    setRanking(false);
                }
            } else {
                setJobs(fetchedJobs);
            }
        } catch (error) {
            console.error('Failed to fetch jobs:', error);
            setJobs([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchJobs();
    }, []);

    const handleSearch = (params: any) => {
        setLocation(params.location);
        setLimit(params.limit);
        setExperienceLevel(params.experienceLevel);
        setWorkType(params.workType);
        setDatePosted(params.datePosted);
        fetchJobs(params);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500 mb-4" />
                <p className="text-cyan-200">Searching for the best matches...</p>
            </div>
        );
    }

    if (ranking) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500 mb-4" />
                <p className="text-cyan-200">AI is ranking jobs based on your CV...</p>
            </div>
        );
    }

    const displayedJobs = (jobs || []).slice(0, limit);

    return (
        <div className="space-y-6">
            <SearchSettings
                initialLocation={location}
                initialLimit={limit}
                initialExperienceLevel={experienceLevel}
                initialWorkType={workType}
                initialDatePosted={datePosted}
                onSearch={handleSearch}
            />

            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold text-white">Perfect Matches</h2>
                    <p className="text-cyan-200 mt-1">{jobs.length} jobs found ✨</p>
                </div>
            </div>

            <div className="grid gap-5">
                {displayedJobs.map((job) => (
                    <div
                        key={job.id}
                        className="group bg-white/10 backdrop-blur-xl p-7 rounded-3xl border-2 border-white/20 shadow-xl hover:shadow-2xl hover:border-orange-400 hover:bg-white/15 transition-all duration-300 transform hover:-translate-y-1"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                    <h3 className="text-2xl font-bold text-white group-hover:text-orange-300 transition-colors">{job.title}</h3>
                                    {job.matchScore && (
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${job.matchScore >= 80 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                                            job.matchScore >= 60 ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' :
                                                'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                            }`}>
                                            {job.matchScore}% Match
                                        </span>
                                    )}
                                </div>
                                <p className="text-lg text-cyan-200 font-semibold">{job.company}</p>
                                {job.matchReason && (
                                    <p className="text-sm text-cyan-300/70 mt-1 italic">"{job.matchReason}"</p>
                                )}

                                {/* Score Breakdown */}
                                {job.scoreBreakdown && (
                                    <div className="mt-3 space-y-2">
                                        <p className="text-xs font-semibold text-cyan-200 uppercase tracking-wide">Match Breakdown</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="text-cyan-300">Skills</span>
                                                    <span className="text-white font-medium">{job.scoreBreakdown.skills}/40</span>
                                                </div>
                                                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-orange-500 to-blue-500 rounded-full transition-all"
                                                        style={{ width: `${(job.scoreBreakdown.skills / 40) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="text-cyan-300">Experience</span>
                                                    <span className="text-white font-medium">{job.scoreBreakdown.experience}/30</span>
                                                </div>
                                                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all"
                                                        style={{ width: `${(job.scoreBreakdown.experience / 30) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="text-cyan-300">Relevance</span>
                                                    <span className="text-white font-medium">{job.scoreBreakdown.relevance}/20</span>
                                                </div>
                                                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
                                                        style={{ width: `${(job.scoreBreakdown.relevance / 20) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="text-cyan-300">Other</span>
                                                    <span className="text-white font-medium">{job.scoreBreakdown.other}/10</span>
                                                </div>
                                                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all"
                                                        style={{ width: `${(job.scoreBreakdown.other / 10) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Skills Match/Gap */}
                                {(job.matchingSkills && job.matchingSkills.length > 0) || (job.missingSkills && job.missingSkills.length > 0) ? (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {job.matchingSkills && job.matchingSkills.map((skill, idx) => (
                                            <span key={idx} className="px-2 py-1 bg-emerald-500/20 text-emerald-300 text-xs rounded-full border border-emerald-500/30">
                                                ✓ {skill}
                                            </span>
                                        ))}
                                        {job.missingSkills && job.missingSkills.map((skill, idx) => (
                                            <span key={idx} className="px-2 py-1 bg-orange-500/20 text-orange-300 text-xs rounded-full border border-orange-500/30">
                                                → {skill}
                                            </span>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                            <a
                                href={job.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-3 text-cyan-300 hover:bg-white/10 rounded-2xl transition-all transform hover:scale-110"
                            >
                                <ExternalLink className="w-6 h-6" />
                            </a>
                        </div>

                        <p className="text-cyan-100 mb-5 line-clamp-2 leading-relaxed">{job.description}</p>

                        <div className="flex flex-wrap gap-3 text-sm">
                            <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-full font-medium">
                                <MapPin className="w-4 h-4" />
                                {job.location}
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full font-medium">
                                <DollarSign className="w-4 h-4" />
                                {job.salary}
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-full font-medium">
                                <Briefcase className="w-4 h-4" />
                                Full-time
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
