import React from 'react';
import { ArrowRight, TrendingUp, Map, CheckCircle2 } from 'lucide-react';

interface CareerCluster {
    id: string;
    name: string;
    description: string;
    startingRoles: string[];
    trajectory: string[];
    reasoning: string;
}

interface CareerPathSelectorProps {
    clusters: CareerCluster[];
    onSelect: (cluster: CareerCluster) => void;
    onBack: () => void;
}

export default function CareerPathSelector({ clusters, onSelect, onBack }: CareerPathSelectorProps) {
    const [selectedId, setSelectedId] = React.useState<string | null>(null);

    const handleSelect = (cluster: CareerCluster) => {
        setSelectedId(cluster.id);
        // Small delay to show selection state before proceeding
        setTimeout(() => {
            onSelect(cluster);
        }, 500);
    };

    return (
        <div className="w-full max-w-6xl mx-auto p-6 animate-in fade-in duration-700">
            <div className="text-center mb-12">
                <h2 className="text-4xl font-bold text-white mb-4">Choose Your Path</h2>
                <p className="text-blue-200 text-lg max-w-2xl mx-auto">
                    Based on your profile, I've mapped out these three potential career trajectories.
                    Select the one that aligns best with your ambition.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {clusters.map((cluster, index) => (
                    <div
                        key={cluster.id}
                        onClick={() => handleSelect(cluster)}
                        className={`
              relative group cursor-pointer rounded-3xl p-1 transition-all duration-500
              ${selectedId === cluster.id ? 'scale-105 ring-4 ring-orange-500' : 'hover:scale-105 hover:-translate-y-2'}
            `}
                    >
                        {/* Glowing Border Effect */}
                        <div className={`
              absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-500 via-purple-500 to-orange-500 opacity-50 
              blur-xl group-hover:opacity-100 transition-opacity duration-500
              ${selectedId === cluster.id ? 'opacity-100' : ''}
            `} />

                        {/* Card Content */}
                        <div className="relative h-full bg-slate-900/90 backdrop-blur-xl rounded-[22px] p-8 border border-white/10 flex flex-col overflow-hidden">

                            {/* Header */}
                            <div className="mb-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 bg-blue-500/20 rounded-2xl">
                                        <Map className="w-6 h-6 text-blue-400" />
                                    </div>
                                    {selectedId === cluster.id && (
                                        <CheckCircle2 className="w-8 h-8 text-orange-500 animate-bounce" />
                                    )}
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-2 leading-tight">{cluster.name}</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">{cluster.description}</p>
                            </div>

                            {/* Trajectory Visualization */}
                            <div className="flex-1 relative mb-8">
                                <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500/50 to-transparent" />

                                <div className="space-y-6 relative">
                                    {/* Starting Point */}
                                    <div className="flex items-start gap-4">
                                        <div className="w-6 h-6 rounded-full bg-blue-500 border-4 border-slate-900 z-10 shrink-0 mt-1" />
                                        <div>
                                            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Start Here</span>
                                            <div className="text-white font-medium mt-1 text-sm">
                                                {cluster.startingRoles.slice(0, 2).join(", ")}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Future Path */}
                                    {cluster.trajectory.map((role, i) => (
                                        <div key={i} className="flex items-start gap-4 opacity-60 group-hover:opacity-100 transition-opacity">
                                            <div className="w-6 h-6 rounded-full bg-slate-700 border-4 border-slate-900 z-10 shrink-0 mt-1" />
                                            <div>
                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                                    {i === cluster.trajectory.length - 1 ? 'Ultimate Goal' : 'Next Step'}
                                                </span>
                                                <div className="text-slate-300 font-medium mt-1 text-sm">{role}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Reasoning Footer */}
                            <div className="mt-auto pt-6 border-t border-white/5">
                                <div className="flex items-start gap-3">
                                    <TrendingUp className="w-4 h-4 text-orange-400 mt-1 shrink-0" />
                                    <p className="text-xs text-slate-400 italic">"{cluster.reasoning}"</p>
                                </div>
                            </div>

                            {/* Hover Action */}
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-orange-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-12 text-center">
                <button
                    onClick={onBack}
                    className="text-slate-400 hover:text-white transition-colors text-sm font-medium flex items-center justify-center gap-2 mx-auto"
                >
                    ← Back to Chat
                </button>
            </div>
        </div>
    );
}
