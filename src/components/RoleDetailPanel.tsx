'use client';

import React from 'react';
import { X, Briefcase, TrendingUp, DollarSign, Award } from 'lucide-react';
import { RoleNode } from '@/data/constellationData';
import { useConstellationStore } from '@/hooks/useConstellationStore';

interface RoleDetailPanelProps {
    role: RoleNode;
}

export default function RoleDetailPanel({ role }: RoleDetailPanelProps) {
    const { selectRole } = useConstellationStore();

    return (
        <div className="fixed right-0 top-0 h-screen w-[450px] z-20 animate-in slide-in-from-right duration-400">
            {/* Frosted glass panel */}
            <div className="h-full bg-slate-900/80 backdrop-blur-2xl border-l border-white/10 shadow-2xl p-8 overflow-y-auto">

                {/* Close button */}
                <button
                    onClick={() => selectRole(null)}
                    className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-xl transition-colors"
                >
                    <X className="w-5 h-5 text-white/60 hover:text-white" />
                </button>

                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-3 bg-blue-500/20 rounded-2xl">
                            <Briefcase className="w-6 h-6 text-blue-400" />
                        </div>
                        <div className="px-3 py-1 bg-blue-500/10 rounded-full text-xs text-blue-300 border border-blue-500/20">
                            {role.experienceLevel}
                        </div>
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2">{role.name}</h2>
                    <p className="text-slate-400 leading-relaxed">{role.description}</p>
                </div>

                {/* Salary */}
                <div className="mb-6 p-4 bg-white/5 rounded-2xl border border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="w-4 h-4 text-green-400" />
                        <span className="text-xs font-bold text-green-400 uppercase tracking-wider">Salary Range</span>
                    </div>
                    <div className="text-2xl font-bold text-white">
                        £{role.salaryRange.min.toLocaleString()} - £{role.salaryRange.max.toLocaleString()}
                    </div>
                </div>

                {/* Responsibilities */}
                <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="w-4 h-4 text-orange-400" />
                        <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">Key Responsibilities</span>
                    </div>
                    <ul className="space-y-2">
                        {role.responsibilities.map((resp, i) => (
                            <li key={i} className="flex items-start gap-2 text-slate-300">
                                <span className="text-orange-400 mt-1">•</span>
                                <span>{resp}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Skills */}
                <div className="mb-8">
                    <div className="flex items-center gap-2 mb-3">
                        <Award className="w-4 h-4 text-purple-400" />
                        <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Required Skills</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {role.requiredSkills.map((skill, i) => (
                            <div
                                key={i}
                                className="px-3 py-1.5 bg-purple-500/10 text-purple-300 rounded-full text-sm border border-purple-500/20"
                            >
                                {skill}
                            </div>
                        ))}
                    </div>
                </div>

                {/* CTA */}
                <div className="pt-6 border-t border-white/10">
                    <button className="w-full py-4 bg-gradient-to-r from-orange-500 to-blue-500 text-white rounded-2xl font-semibold hover:shadow-2xl hover:shadow-orange-500/50 transition-all transform hover:scale-105">
                        See Open Positions →
                    </button>
                </div>
            </div>
        </div>
    );
}
