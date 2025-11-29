'use client';

import React, { useState, useRef } from 'react';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface CVUploadProps {
    onUploadComplete: (text: string, parsedData?: any) => void;
}

export default function CVUpload({ onUploadComplete }: CVUploadProps) {
    const [mode, setMode] = useState<'choose' | 'upload' | 'text'>('choose');
    const [cvText, setCvText] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            await processFile(files[0]);
        }
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            await processFile(files[0]);
        }
    };

    const processFile = async (file: File) => {
        if (file.type !== 'application/pdf') {
            setError('Please upload a PDF file.');
            return;
        }

        setIsUploading(true);
        setError(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/parse-cv', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.details || errorData.error || 'Failed to upload CV');
            }

            const data = await response.json();

            // Show success message to user
            if (data.parsed) {
                console.log('✅ CV parsed:', data.parsed.name);
                if (data.parsed.location) {
                    console.log('📍 Location extracted:', data.parsed.location);
                }
            }

            onUploadComplete(data.text, data.parsed);
        } catch (err: any) {
            console.error('Upload error:', err);
            setError(err.message || 'Upload failed. Please try the text option instead.');
            setIsUploading(false);
        }
    };

    const handleTextSubmit = () => {
        if (cvText.trim().length < 100) {
            setError('Please enter at least 100 characters');
            return;
        }
        onUploadComplete(cvText);
    };

    if (mode === 'choose') {
        return (
            <div className="space-y-6 max-w-2xl mx-auto">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-white mb-3">Let's get started! 📄</h2>
                    <p className="text-cyan-200 text-lg">How would you like to share your experience?</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => setMode('upload')}
                        className="p-8 bg-white/10 hover:bg-white/20 border-2 border-white/20 hover:border-orange-400 rounded-3xl transition-all group"
                    >
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Upload className="w-8 h-8 text-indigo-600" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Upload PDF</h3>
                        <p className="text-cyan-200 text-sm">Upload your CV as a PDF file</p>
                    </button>

                    <button
                        onClick={() => setMode('text')}
                        className="p-8 bg-white/10 hover:bg-white/20 border-2 border-white/20 hover:border-orange-400 rounded-3xl transition-all group"
                    >
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-orange-100 to-pink-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <FileText className="w-8 h-8 text-orange-600" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Paste Text</h3>
                        <p className="text-cyan-200 text-sm">Copy and paste your CV content</p>
                    </button>
                </div>
            </div>
        );
    }

    if (mode === 'upload') {
        return (
            <div className="space-y-6 max-w-2xl mx-auto">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-white mb-2">Upload your CV 📄</h2>
                    <p className="text-cyan-200">Drag and drop or click to browse</p>
                </div>

                <div
                    onDrop={handleDrop}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative border-3 border-dashed rounded-3xl p-16 text-center cursor-pointer transition-all duration-200 ${isDragging ? 'border-orange-400 bg-orange-500/20 scale-105' : 'border-white/30 hover:border-orange-400 hover:bg-white/5'
                        } ${isUploading && 'pointer-events-none opacity-60'}`}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf"
                        onChange={handleFileSelect}
                        className="hidden"
                    />

                    <div className="flex flex-col items-center gap-4">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                            {isUploading ? (
                                <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                            ) : (
                                <Upload className="w-10 h-10 text-indigo-600" />
                            )}
                        </div>
                        <div>
                            <p className="text-xl font-semibold text-white mb-2">
                                {isUploading ? 'Processing...' : 'Upload your CV'}
                            </p>
                            <p className="text-sm text-cyan-200">
                                Drag and drop your PDF here, or click to browse
                            </p>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="flex items-center gap-3 p-4 bg-red-500/20 border border-red-500/50 rounded-2xl">
                        <AlertCircle className="w-6 h-6 text-red-400 shrink-0" />
                        <p className="text-red-200 text-sm">{error}</p>
                    </div>
                )}

                <button
                    onClick={() => setMode('text')}
                    className="w-full py-3 text-cyan-200 hover:text-white transition-colors text-sm"
                >
                    ← Use text input instead
                </button>
            </div>
        );
    }

    // Text mode
    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Tell us about yourself 📝</h2>
                <p className="text-cyan-200">Paste your CV or describe your experience</p>
            </div>

            <div className="bg-white/10 backdrop-blur-xl p-6 rounded-3xl border border-white/20">
                <textarea
                    value={cvText}
                    onChange={(e) => {
                        setCvText(e.target.value);
                        setError(null);
                    }}
                    placeholder="Example:&#10;&#10;I'm a management consultant with 3 years at Deloitte, focusing on strategy and operations. I have an MBA from London Business School...&#10;&#10;I'm interested in moving into venture capital or startup roles..."
                    className="w-full h-80 px-5 py-4 rounded-xl border-2 border-white/20 bg-white/10 focus:outline-none focus:ring-2 focus:ring-orange-500 text-white placeholder-cyan-200/40 resize-none"
                    autoFocus
                />
                <div className="flex justify-between items-center mt-3">
                    <p className="text-xs text-cyan-200/70">{cvText.length} characters (minimum 100)</p>
                    {cvText.length >= 100 && (
                        <p className="text-xs text-green-400 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Ready
                        </p>
                    )}
                </div>
            </div>

            {error && (
                <div className="flex items-center gap-3 p-4 bg-red-500/20 border border-red-500/50 rounded-2xl">
                    <AlertCircle className="w-6 h-6 text-red-400 shrink-0" />
                    <p className="text-red-200 text-sm">{error}</p>
                </div>
            )}

            <div className="flex gap-3">
                <button
                    onClick={() => setMode('upload')}
                    className="px-6 py-3 text-cyan-200 hover:text-white transition-colors text-sm"
                >
                    ← Upload PDF instead
                </button>
                <button
                    onClick={handleTextSubmit}
                    disabled={cvText.trim().length < 100}
                    className="flex-1 py-4 bg-gradient-to-r from-orange-500 to-blue-500 text-white rounded-2xl font-bold hover:shadow-2xl hover:shadow-orange-500/50 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                >
                    <CheckCircle className="w-5 h-5" />
                    Continue
                </button>
            </div>
        </div>
    );
}
