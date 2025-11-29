'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useUser } from '@clerk/nextjs';
import { Mic, StopCircle, Volume2, Loader2 } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

function InterviewPageContent() {
    const { user } = useUser();
    const searchParams = useSearchParams();
    const router = useRouter();

    const [jobTitle, setJobTitle] = useState('');
    const [company, setCompany] = useState('');
    const [jobDescription, setJobDescription] = useState('');

    const [messages, setMessages] = useState<Message[]>([]);
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [interviewActive, setInterviewActive] = useState(false);
    const [error, setError] = useState('');
    const [showScorecard, setShowScorecard] = useState(false);
    const [scoreData, setScoreData] = useState<any>(null);
    const [isLoadingScore, setIsLoadingScore] = useState(false);

    const recognitionRef = useRef<any>(null);
    const synthesisRef = useRef<SpeechSynthesis | null>(null);
    const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const conversationHistoryRef = useRef<Message[]>([]);
    const interviewActiveRef = useRef(false);
    const committedTranscriptRef = useRef(''); // Stores text from previous sessions
    const transcriptRef = useRef(''); // Syncs with transcript state for access in callbacks

    // Sync ref with state
    useEffect(() => {
        transcriptRef.current = transcript;
    }, [transcript]);

    // Initialize job details
    useEffect(() => {
        const titleParam = searchParams.get('jobTitle');
        const companyParam = searchParams.get('company');
        const descParam = searchParams.get('jobDescription');

        if (titleParam) setJobTitle(titleParam);
        if (companyParam) setCompany(companyParam);
        if (descParam) setJobDescription(descParam);
    }, [searchParams]);

    // Initialize Speech APIs
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.continuous = true;
                recognition.interimResults = true;
                recognition.lang = 'en-US';

                recognition.onresult = (event: any) => {
                    // Get text from THIS session
                    let currentSessionTranscript = '';
                    for (let i = 0; i < event.results.length; i++) {
                        currentSessionTranscript += event.results[i][0].transcript + ' ';
                    }

                    // Combine with committed text from previous sessions
                    const totalTranscript = (committedTranscriptRef.current + ' ' + currentSessionTranscript).trim();
                    setTranscript(totalTranscript);
                    transcriptRef.current = totalTranscript; // Immediate update for safety
                };

                recognition.onerror = (event: any) => {

                    if (event.error === 'not-allowed') {
                        setError('Microphone access denied. Please allow microphone access in your browser settings.');
                        setIsListening(false);
                        setInterviewActive(false);
                    } else if (event.error === 'no-speech') {
                        console.warn('⚠️ No speech detected (transient)');
                    } else if (event.error === 'audio-capture') {
                        setError('Microphone error. Please check that your microphone is connected and working.');
                        setIsListening(false);
                    } else {
                        console.warn(`Speech recognition warning: ${event.error}`);
                    }
                };

                recognition.onend = () => {
                    console.log('🔚 Speech recognition ended');

                    // Auto-restart if interview is still active (ROBUST RESTART)
                    if (interviewActiveRef.current && !isSpeaking && !isProcessing) {
                        console.log('🔄 Auto-restarting recognition...');

                        // Commit the current transcript so we don't lose it
                        if (transcriptRef.current) {
                            committedTranscriptRef.current = transcriptRef.current;
                        }

                        try {
                            recognition.start();
                        } catch (e) {
                            console.log('⚠️ Recognition restart skipped:', e);
                        }
                    }
                };

                recognitionRef.current = recognition;
            } else {
                setError('Speech recognition not supported in this browser. Please use Chrome or Edge.');
            }

            synthesisRef.current = window.speechSynthesis;
        }

        return () => {
            if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
            }
        };
    }, [interviewActive, isSpeaking, isProcessing]); // Removed transcript from deps

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, transcript]);

    const startInterview = async () => {
        console.log('🚀 START INTERVIEW BUTTON CLICKED!');
        setInterviewActive(true);
        interviewActiveRef.current = true;
        setError('');

        // Start with AI greeting
        const greeting = { role: 'user', content: 'Hello, I am ready to begin the interview.' } as Message;
        conversationHistoryRef.current = [greeting];

        await getAIResponse([greeting]);
    };

    const submitAnswer = () => {
        console.log('📤 Submitting answer:', transcript);
        if (!transcript.trim() || !interviewActive) {
            console.log('⚠️ No transcript or interview not active');
            return;
        }

        // Stop listening
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch (e) {
                console.log('Recognition already stopped');
            }
        }
        setIsListening(false);

        // Add user message
        const userMessage = { role: 'user', content: transcript.trim() } as Message;
        const newHistory = [...conversationHistoryRef.current, userMessage];
        conversationHistoryRef.current = newHistory;
        setMessages(newHistory);

        // Clear transcripts
        setTranscript('');
        committedTranscriptRef.current = ''; // IMPORTANT: Reset committed text

        // Get AI response
        getAIResponse(newHistory);
    };

    const getAIResponse = async (history: Message[]) => {
        setIsProcessing(true);

        try {
            const response = await fetch('/api/interview-coach', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: history,
                    jobTitle,
                    company,
                    jobDescription
                })
            });

            if (!response.ok) throw new Error('Failed to get AI response');

            const data = await response.json();
            const aiMessage = { role: 'assistant', content: data.response } as Message;

            const updatedHistory = [...history, aiMessage];
            conversationHistoryRef.current = updatedHistory;
            setMessages(updatedHistory);

            // Speak the response
            await speakText(data.response);

        } catch (err) {
            console.error('Error getting AI response:', err);
            setError('Failed to connect to the interviewer. Please try again.');
            setInterviewActive(false);
        } finally {
            setIsProcessing(false);
        }
    };

    const speakText = async (text: string): Promise<void> => {
        try {
            console.log('🎤 speakText called with:', text.substring(0, 50) + '...');
            setIsSpeaking(true);

            // Call our TTS API endpoint
            console.log('📞 Calling /api/tts...');
            const response = await fetch('/api/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });

            console.log('📡 TTS Response status:', response.status);

            if (!response.ok) {
                const errorData = await response.json();
                console.error('❌ TTS API error:', errorData);
                throw new Error('TTS failed: ' + JSON.stringify(errorData));
            }

            // Get audio blob
            console.log('🎵 Getting audio blob...');
            const audioBlob = await response.blob();
            console.log('✅ Audio blob received, size:', audioBlob.size, 'bytes');
            const audioUrl = URL.createObjectURL(audioBlob);

            // Play audio
            console.log('▶️ Creating Audio element...');
            const audio = new Audio(audioUrl);

            audio.onended = () => {
                console.log('✅ Audio playback ended');
                setIsSpeaking(false);
                URL.revokeObjectURL(audioUrl);
                // Auto-start listening after AI finishes speaking
                if (interviewActiveRef.current) {
                    setTimeout(() => {
                        startListening();
                    }, 500);
                }
            };

            audio.onerror = (e) => {
                console.error('❌ Audio playback error:', e);
                setIsSpeaking(false);
                URL.revokeObjectURL(audioUrl);
            };

            console.log('▶️ Starting audio playback...');
            await audio.play();
            console.log('🔊 Audio playing!');

        } catch (error) {
            console.error('❌ TTS Error:', error);
            setIsSpeaking(false);
        }
    };

    const startListening = () => {
        console.log('🎤 startListening called');

        if (!recognitionRef.current) {
            console.error('❌ No recognition instance found');
            return;
        }

        // If already listening according to our state, just return
        if (isListening) {
            console.log('⚠️ Already listening (state), skipping start');
            return;
        }

        try {
            console.log('▶️ Starting speech recognition...');
            recognitionRef.current.start();
            setIsListening(true);
            setTranscript('');
            committedTranscriptRef.current = '';
            transcriptRef.current = '';
            console.log('✅ Speech recognition started!');
        } catch (e: any) {
            console.error('❌ Recognition start error:', e);

            // If it says "already started", we should sync our state
            if (e.message && e.message.includes('already started')) {
                console.log('🔄 Syncing state: Recognition was already running');
                setIsListening(true);
            } else {
                // For other errors, try to restart after a short delay
                console.log('🔄 Retrying start in 200ms...');
                setTimeout(() => {
                    try {
                        recognitionRef.current?.start();
                        setIsListening(true);
                    } catch (retryError) {
                        console.error('❌ Retry failed:', retryError);
                    }
                }, 200);
            }
        }
    };

    const endInterview = async () => {
        setInterviewActive(false);
        interviewActiveRef.current = false;
        setIsListening(false);

        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch (e) {
                console.log('Recognition already stopped');
            }
        }

        if (synthesisRef.current) {
            synthesisRef.current.cancel();
        }

        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
        }

        // Get interview score if there's meaningful conversation
        if (conversationHistoryRef.current.length > 2) {
            console.log('📊 Getting interview score...');
            setIsLoadingScore(true);
            try {
                const response = await fetch('/api/score-interview', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        messages: conversationHistoryRef.current,
                        jobTitle,
                        jobDescription
                    })
                });

                if (!response.ok) throw new Error('Failed to get score');

                const data = await response.json();
                console.log('✅ Score received:', data);
                setScoreData(data);
                setShowScorecard(true);
            } catch (err) {
                console.error('Error getting score:', err);
                setError('Failed to generate scorecard');
            } finally {
                setIsLoadingScore(false);
            }
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white flex flex-col">
            <Navbar />

            <div className="flex-1 flex flex-col items-center justify-center p-4 min-h-[calc(100vh-80px)]">

                <div className="w-full max-w-2xl flex flex-col items-center gap-8">
                    {/* Status Visualizer */}
                    <div className="relative">
                        <div className={`w-40 h-40 rounded-full flex items-center justify-center transition-all duration-500 ${isListening ? 'bg-red-500/20 shadow-[0_0_50px_rgba(239,68,68,0.3)] animate-pulse' :
                            isSpeaking ? 'bg-blue-500/20 shadow-[0_0_50px_rgba(59,130,246,0.3)] animate-pulse' :
                                isProcessing ? 'bg-purple-500/20 shadow-[0_0_50px_rgba(168,85,247,0.3)] animate-spin' :
                                    'bg-slate-700/30'
                            }`}>
                            <div className={`w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300 ${isListening ? 'bg-red-500 shadow-lg shadow-red-500/50' :
                                isSpeaking ? 'bg-blue-500 shadow-lg shadow-blue-500/50' :
                                    isProcessing ? 'bg-purple-500 shadow-lg shadow-purple-500/50' :
                                        'bg-slate-700'
                                }`}>
                                {isListening ? <Mic className="w-10 h-10 text-white" /> :
                                    isSpeaking ? <Volume2 className="w-10 h-10 text-white" /> :
                                        isProcessing ? <Loader2 className="w-10 h-10 text-white animate-spin" /> :
                                            <Mic className="w-10 h-10 text-slate-400" />}
                            </div>
                        </div>
                    </div>

                    {/* Status Text & Instructions */}
                    <div className="text-center space-y-2">
                        <h2 className="text-3xl font-bold transition-all duration-300">
                            {isListening ? "I'm listening..." :
                                isSpeaking ? "Interviewer is speaking..." :
                                    isProcessing ? "Thinking..." :
                                        "Ready"}
                        </h2>
                        <p className="text-blue-200/80 text-lg">
                            {isListening ? "Speak clearly now" :
                                isSpeaking ? "Listen to the question" :
                                    isProcessing ? "Analyzing your response..." :
                                        "Click start to begin"}
                        </p>
                    </div>

                    {/* Live Transcript / Instructions */}
                    <div className={`w-full bg-white/5 rounded-2xl p-6 backdrop-blur-sm border border-white/10 transition-all duration-300 flex items-center justify-center text-center min-h-[160px] ${!interviewActive ? 'opacity-50' : 'opacity-100'
                        }`}>
                        {isSpeaking ? (
                            <div className="space-y-3">
                                <div className="text-blue-300 uppercase tracking-wider text-xs font-bold">Interviewer</div>
                                <div className="text-xl text-white font-medium leading-relaxed">
                                    "{messages[messages.length - 1]?.content}"
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3 w-full">
                                <div className="text-green-300 uppercase tracking-wider text-xs font-bold">Your Answer</div>
                                <div className="text-lg text-blue-100 font-medium leading-relaxed">
                                    {transcript ? `"${transcript}"` : <span className="italic opacity-50">...waiting for speech...</span>}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Controls */}
                    <div className="flex gap-4 pt-4">
                        {!interviewActive ? (
                            <button
                                onClick={startInterview}
                                disabled={!!error}
                                className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full font-bold text-lg hover:scale-105 transition-transform shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
                            >
                                <Mic className="w-5 h-5" />
                                Start Interview
                            </button>
                        ) : (isSpeaking || isProcessing) ? (
                            <button
                                onClick={endInterview}
                                className="px-8 py-4 bg-red-500/20 text-red-200 border border-red-500/30 rounded-full font-bold text-lg hover:bg-red-500/30 transition-colors flex items-center gap-3"
                            >
                                <StopCircle className="w-5 h-5" />
                                End Session
                            </button>
                        ) : (
                            <div className="flex gap-3">
                                {!isListening && (
                                    <button
                                        onClick={startListening}
                                        className="px-6 py-4 bg-blue-500/20 text-blue-200 border border-blue-500/30 rounded-full font-bold text-lg hover:bg-blue-500/30 transition-colors flex items-center gap-2"
                                    >
                                        <Mic className="w-5 h-5" />
                                        Resume
                                    </button>
                                )}
                                <button
                                    onClick={submitAnswer}
                                    disabled={!transcript.trim()}
                                    className="px-8 py-4 bg-green-500 hover:bg-green-600 rounded-full font-bold text-lg transition-all shadow-lg shadow-green-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    <StopCircle className="w-5 h-5" />
                                    Submit
                                </button>
                                <button
                                    onClick={endInterview}
                                    className="px-6 py-4 bg-red-500/20 text-red-200 border border-red-500/30 rounded-full font-bold text-lg hover:bg-red-500/30 transition-colors flex items-center gap-2"
                                >
                                    End
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mt-6 text-red-300 bg-red-500/10 px-4 py-2 rounded-lg text-sm border border-red-500/20">
                        {error}
                    </div>
                )}
            </div>

            {/* Scorecard Overlay */}
            {(showScorecard || isLoadingScore) && (
                <div className="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-500">
                    {isLoadingScore ? (
                        <div className="text-center">
                            <Loader2 className="w-16 h-16 text-blue-500 animate-spin mx-auto mb-4" />
                            <h2 className="text-2xl font-bold text-white mb-2">Analyzing Interview...</h2>
                            <p className="text-blue-300">Generating your personalized feedback report</p>
                        </div>
                    ) : scoreData ? (
                        <div className="bg-white/10 border border-white/20 rounded-3xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                            <div className="text-center mb-8">
                                <h2 className="text-3xl font-bold text-white mb-2">Interview Analysis</h2>
                                <div className="flex items-center justify-center gap-4 mt-4">
                                    <div className="text-center">
                                        <div className="text-5xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
                                            {scoreData.overallScore}
                                        </div>
                                        <div className="text-sm text-slate-400 uppercase tracking-wider mt-1">Overall Score</div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-3 gap-6 mb-8">
                                {scoreData.categories.map((cat: any, i: number) => (
                                    <div key={i} className="bg-slate-800/50 rounded-xl p-6 border border-white/10">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="font-bold text-lg text-white">{cat.name}</h3>
                                            <span className={`text-xl font-bold ${cat.score >= 80 ? 'text-green-400' :
                                                cat.score >= 60 ? 'text-yellow-400' : 'text-red-400'
                                                }`}>{cat.score}</span>
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <p className="text-xs text-green-400 uppercase font-bold mb-1">Strengths</p>
                                                <ul className="text-sm text-slate-300 list-disc list-inside">
                                                    {cat.strengths.map((s: string, j: number) => (
                                                        <li key={j}>{s}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <div>
                                                <p className="text-xs text-red-400 uppercase font-bold mb-1">Improvements</p>
                                                <ul className="text-sm text-slate-300 list-disc list-inside">
                                                    {cat.improvements.map((s: string, j: number) => (
                                                        <li key={j}>{s}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-blue-900/30 rounded-xl p-6 border border-blue-500/30 mb-8">
                                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <span className="text-2xl">🚀</span> Action Plan
                                </h3>
                                <ul className="space-y-3">
                                    {scoreData.actionItems.map((item: string, i: number) => (
                                        <li key={i} className="flex items-start gap-3 text-blue-100">
                                            <span className="bg-blue-500/20 text-blue-300 w-6 h-6 rounded-full flex items-center justify-center text-sm flex-shrink-0 mt-0.5">
                                                {i + 1}
                                            </span>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="flex justify-center gap-4">
                                <button
                                    onClick={() => {
                                        setShowScorecard(false);
                                        setMessages([]);
                                        setTranscript('');
                                        setInterviewActive(false);
                                    }}
                                    className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-full font-bold transition-colors"
                                >
                                    Close
                                </button>
                                <button
                                    onClick={() => router.push('/dashboard')}
                                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-full font-bold transition-colors shadow-lg shadow-blue-600/20"
                                >
                                    Back to Dashboard
                                </button>
                            </div>
                        </div>
                    ) : null}
                </div>
            )}

            {/* Job Context */}
            <div className="mt-8 text-center opacity-60">
                <p className="text-sm uppercase tracking-wider text-blue-300 mb-1">Current Scenario</p>
                <h3 className="text-xl font-semibold text-white">
                    {jobTitle || 'General Interview Practice'}
                </h3>
                {company && <p className="text-slate-400">{company}</p>}
            </div>
        </div>
    );
}

export default function InterviewPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white flex items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-blue-400" />
            </div>
        }>
            <InterviewPageContent />
        </Suspense>
    );
}
