'use client';

import React, { useState } from 'react';
import { MapPin, Hash, Search } from 'lucide-react';

interface SearchSettingsProps {
    initialLocation?: string;
    initialLimit?: number;
    initialExperienceLevel?: string;
    initialWorkType?: string;
    initialDatePosted?: string;
    onSearch: (params: SearchParams) => void;
}

export interface SearchParams {
    location: string;
    limit: number;
    experienceLevel: string;
    workType: string;
    datePosted: string;
}

export default function SearchSettings({
    initialLocation = 'London, United Kingdom',
    initialLimit = 10,
    initialExperienceLevel = 'any',
    initialWorkType = 'any',
    initialDatePosted = 'any',
    onSearch
}: SearchSettingsProps) {
    const [location, setLocation] = useState(initialLocation);
    const [limit, setLimit] = useState(initialLimit);
    const [experienceLevel, setExperienceLevel] = useState(initialExperienceLevel);
    const [workType, setWorkType] = useState(initialWorkType);
    const [datePosted, setDatePosted] = useState(initialDatePosted);

    const handleSearch = () => {
        onSearch({
            location,
            limit,
            experienceLevel,
            workType,
            datePosted,
        });
    };

    return (
        <div className="bg-white/10 backdrop-blur-xl p-6 rounded-3xl border-2 border-white/20 shadow-xl mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-cyan-200 mb-2 flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Location
                    </label>
                    <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="e.g., London, United Kingdom"
                        className="w-full px-4 py-3 rounded-2xl border-2 border-white/20 bg-white/10 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-white placeholder-cyan-200/50 transition-all"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-cyan-200 mb-2">
                        Experience
                    </label>
                    <select
                        value={experienceLevel}
                        onChange={(e) => setExperienceLevel(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl border-2 border-white/20 bg-white/10 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-white font-medium"
                    >
                        <option value="any">Any Level</option>
                        <option value="entry_level">Entry Level</option>
                        <option value="mid_level">Mid Level</option>
                        <option value="senior_level">Senior Level</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-cyan-200 mb-2">
                        Work Type
                    </label>
                    <select
                        value={workType}
                        onChange={(e) => setWorkType(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl border-2 border-white/20 bg-white/10 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-white font-medium"
                    >
                        <option value="any">Any Type</option>
                        <option value="remote">Remote</option>
                        <option value="hybrid">Hybrid</option>
                        <option value="onsite">On-site</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-cyan-200 mb-2">
                        Posted
                    </label>
                    <select
                        value={datePosted}
                        onChange={(e) => setDatePosted(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl border-2 border-white/20 bg-white/10 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-white font-medium"
                    >
                        <option value="any">Any Time</option>
                        <option value="today">Today</option>
                        <option value="3days">Last 3 Days</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                    </select>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-cyan-200" />
                    <select
                        value={limit}
                        onChange={(e) => setLimit(Number(e.target.value))}
                        className="px-4 py-2 rounded-2xl border-2 border-white/20 bg-white/10 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-white font-medium text-sm"
                    >
                        <option value={5}>5 jobs</option>
                        <option value={10}>10 jobs</option>
                        <option value={20}>20 jobs</option>
                    </select>
                </div>

                <button
                    onClick={handleSearch}
                    className="ml-auto px-6 py-3 bg-gradient-to-r from-orange-500 to-blue-500 text-white rounded-2xl font-semibold hover:shadow-2xl hover:shadow-orange-500/50 transition-all transform hover:scale-105 shadow-xl flex items-center gap-2"
                >
                    <Search className="w-5 h-5" />
                    Search Jobs
                </button>
            </div>
        </div>
    );
}
