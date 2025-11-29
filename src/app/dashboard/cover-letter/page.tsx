'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { FileText, Loader2, Copy, Check, Sparkles, ExternalLink, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';

export default function CoverLetterPage() {
    const { user } = useUser();
    const searchParams = useSearchParams();

    const [jobTitle, setJobTitle] = useState('');
    const [company, setCompany] = useState('');
    const [jobLink, setJobLink] = useState('');
    const [jobLinks, setJobLinks] = useState<Record<string, string>>({});
    const [showLinkDropdown, setShowLinkDropdown] = useState(false);
    const [jobDescription, setJobDescription] = useState('');
    const [additionalNotes, setAdditionalNotes] = useState('');
    const [coverLetter, setCoverLetter] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const titleParam = searchParams.get('jobTitle');
        const companyParam = searchParams.get('company');
        const notesParam = searchParams.get('additionalNotes');
        const linkParam = searchParams.get('jobLink');
        const linksParam = searchParams.get('jobLinks');

        if (titleParam) setJobTitle(titleParam);
        if (companyParam) setCompany(companyParam);
        if (notesParam) setAdditionalNotes(notesParam);
        if (linkParam) setJobLink(linkParam);

        if (linksParam) {
            try {
                const parsedLinks = JSON.parse(linksParam);
                setJobLinks(parsedLinks);
            } catch (e) {
                console.error('Failed to parse job links', e);
            }
        }
    }, [searchParams]);

    const handleGenerate = async () => {
        if (!jobTitle || !company || !jobDescription) {
            alert('Please fill in job title, company, and job description');
            return;
        }

        setIsGenerating(true);
        setCoverLetter('');

        // Construct context about links
        let linkContext = '';
        if (jobLink) linkContext = `Job Link: ${jobLink}`;
        if (Object.keys(jobLinks).length > 0) {
            linkContext = `Job Links:\n${Object.entries(jobLinks).map(([name, url]) => `${name}: ${url}`).join('\n')}`;
        }

        const finalNotes = linkContext
            ? `${additionalNotes}\n\n${linkContext}`
            : additionalNotes;

        try {
            const response = await fetch('/api/generate-cover-letter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jobTitle,
                    company,
                    jobDescription,
                    additionalNotes: finalNotes
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.details || errorData.error || 'Failed to generate cover letter');
            }

            const data = await response.json();
            setCoverLetter(data.coverLetter);
        } catch (error: any) {
            console.error('Error generating cover letter:', error);
            alert(error.message || 'Failed to generate cover letter. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(coverLetter);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
            <Navbar />

            {/* Background Effects */}
            <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
            <div className="absolute top-0 -right-4 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
                {/* Header */}
                <div className="mb-8">
                    <Link href="/dashboard" className="text-cyan-400 hover:text-cyan-300 text-sm mb-4 inline-block">
                        ← Back to Dashboard
                    </Link>
                    <h1 className="text-4xl lg:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                        AI Cover Letter Creator
                    </h1>
                    <p className="text-xl text-blue-200">
                        Generate tailored cover letters based on your CV and the job role
                    </p>
                </div>

                <div className="grid lg:grid-cols-2 gap-8">
                    {/* Input Form */}
                    <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold flex items-center gap-2">
                                <FileText className="w-6 h-6 text-purple-400" />
                                Job Details
                            </h2>

                            {/* Single Link Button */}
                            {jobLink && !Object.keys(jobLinks).length && (
                                <a
                                    href={jobLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg text-sm transition-colors border border-blue-500/30"
                                >
                                    <ExternalLink className="w-3 h-3" />
                                    View Job
                                </a>
                            )}

                            {/* Multi-Link Dropdown */}
                            {Object.keys(jobLinks).length > 0 && (
                                <div className="relative">
                                    <button
                                        onClick={() => setShowLinkDropdown(!showLinkDropdown)}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg text-sm transition-colors border border-blue-500/30"
                                    >
                                        <ExternalLink className="w-3 h-3" />
                                        View Job Postings
                                        <ChevronDown className="w-3 h-3" />
                                    </button>

                                    {showLinkDropdown && (
                                        <div className="absolute right-0 top-full mt-2 w-56 bg-slate-900 border border-white/10 rounded-xl shadow-xl overflow-hidden z-50">
                                            {Object.entries(jobLinks).map(([name, url]) => (
                                                <a
                                                    key={name}
                                                    href={url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="block px-4 py-3 text-sm text-blue-200 hover:bg-white/10 hover:text-white transition-colors border-b border-white/5 last:border-0"
                                                >
                                                    {name}
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-blue-200 mb-2">
                                    Job Title *
                                </label>
                                <input
                                    type="text"
                                    value={jobTitle}
                                    onChange={(e) => setJobTitle(e.target.value)}
                                    placeholder="e.g., Senior Product Manager"
                                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-300/50 focus:outline-none focus:border-purple-400 transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-blue-200 mb-2">
                                    Company *
                                </label>
                                <input
                                    type="text"
                                    value={company}
                                    onChange={(e) => setCompany(e.target.value)}
                                    placeholder="e.g., Google"
                                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-300/50 focus:outline-none focus:border-purple-400 transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-blue-200 mb-2">
                                    Job Description *
                                </label>
                                <textarea
                                    value={jobDescription}
                                    onChange={(e) => setJobDescription(e.target.value)}
                                    placeholder="Paste the full job description here..."
                                    rows={8}
                                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-300/50 focus:outline-none focus:border-purple-400 transition-colors resize-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-blue-200 mb-2">
                                    Additional Notes (Optional)
                                </label>
                                <textarea
                                    value={additionalNotes}
                                    onChange={(e) => setAdditionalNotes(e.target.value)}
                                    placeholder="Any specific points you want to emphasize..."
                                    rows={3}
                                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-300/50 focus:outline-none focus:border-purple-400 transition-colors resize-none"
                                />
                            </div>

                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating || !jobTitle || !company || !jobDescription}
                                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-4 px-6 rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-5 h-5" />
                                        Generate Cover Letter
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Output Preview */}
                    <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold flex items-center gap-2">
                                <FileText className="w-6 h-6 text-cyan-400" />
                                Generated Letter
                            </h2>
                            {coverLetter && (
                                <button
                                    onClick={handleCopy}
                                    className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                                >
                                    {copied ? (
                                        <>
                                            <Check className="w-5 h-5 text-green-400" />
                                            <span className="text-sm text-green-400">Copied!</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-5 h-5" />
                                            <span className="text-sm">Copy</span>
                                        </>
                                    )}
                                </button>
                            )}
                        </div>

                        <div className="min-h-[500px] bg-white/10 rounded-xl p-6 border border-white/20">
                            {isGenerating ? (
                                <div className="flex flex-col items-center justify-center h-full text-blue-200">
                                    <Loader2 className="w-12 h-12 animate-spin mb-4 text-purple-400" />
                                    <p>Crafting your perfect cover letter...</p>
                                </div>
                            ) : coverLetter ? (
                                <div className="whitespace-pre-wrap text-blue-100 leading-relaxed">
                                    {coverLetter}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-blue-300/50">
                                    <FileText className="w-16 h-16 mb-4" />
                                    <p className="text-center">
                                        Fill in the job details and click<br />
                                        "Generate Cover Letter" to get started
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
