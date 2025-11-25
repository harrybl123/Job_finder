'use client';

import React, { useState } from 'react';
import { Check, Plus, X, Search } from 'lucide-react';

interface JobTitleSelectorProps {
    initialTitles: string[];
    onConfirm: (selectedTitles: string[]) => void;
    onBack: () => void;
}

export default function JobTitleSelector({ initialTitles, onConfirm, onBack }: JobTitleSelectorProps) {
    const [selectedTitles, setSelectedTitles] = useState<string[]>(initialTitles);
    const [newTitle, setNewTitle] = useState('');

    const toggleTitle = (title: string) => {
        if (selectedTitles.includes(title)) {
            setSelectedTitles(selectedTitles.filter(t => t !== title));
        } else {
            setSelectedTitles([...selectedTitles, title]);
        }
    };

    const handleAddTitle = (e: React.FormEvent) => {
        e.preventDefault();
        if (newTitle.trim() && !selectedTitles.includes(newTitle.trim())) {
            setSelectedTitles([...selectedTitles, newTitle.trim()]);
            setNewTitle('');
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-4">
                <h2 className="text-4xl font-bold text-white">Select Job Titles</h2>
                <p className="text-xl text-cyan-200">
                    I've found these roles might be a good fit. Select the ones you'd like to explore.
                </p>
            </div>

            <div className="bg-white/10 backdrop-blur-xl p-8 rounded-3xl border border-white/20 shadow-2xl">
                <div className="flex flex-wrap gap-3 mb-8">
                    {selectedTitles.map((title) => (
                        <button
                            key={title}
                            onClick={() => toggleTitle(title)}
                            className={`group flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${selectedTitles.includes(title)
                                    ? 'bg-gradient-to-r from-orange-500 to-blue-500 text-white shadow-lg shadow-orange-500/25 transform scale-105'
                                    : 'bg-white/5 text-cyan-100 hover:bg-white/10 border border-white/10'
                                }`}
                        >
                            {selectedTitles.includes(title) && <Check className="w-4 h-4" />}
                            {title}
                        </button>
                    ))}
                </div>

                <form onSubmit={handleAddTitle} className="flex gap-3 mb-8">
                    <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="Add another job title..."
                        className="flex-1 px-5 py-3 rounded-xl border border-white/20 bg-white/5 text-white placeholder-cyan-200/50 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                    />
                    <button
                        type="submit"
                        disabled={!newTitle.trim()}
                        className="px-5 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </form>

                <div className="flex gap-4 pt-4 border-t border-white/10">
                    <button
                        onClick={onBack}
                        className="px-6 py-4 text-cyan-200 hover:text-white font-medium transition-colors"
                    >
                        Back
                    </button>
                    <button
                        onClick={() => onConfirm(selectedTitles)}
                        disabled={selectedTitles.length === 0}
                        className="flex-1 flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-500 to-blue-500 text-white rounded-2xl font-bold text-lg hover:shadow-2xl hover:shadow-orange-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02]"
                    >
                        <Search className="w-5 h-5" />
                        Search {selectedTitles.length} Roles
                    </button>
                </div>
            </div>
        </div>
    );
}
