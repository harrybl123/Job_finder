'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, Briefcase, User, Loader2, Bot } from 'lucide-react';
import clsx from 'clsx';
import { getUserId } from '@/lib/userSession';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface ChatInterfaceProps {
    cvText: string;
    onSearchReady: (params: any) => void;
    compact?: boolean;
    initialMessages?: Message[];
    onMessagesUpdate?: (messages: Message[]) => void; // Callback to update parent state
    onRecommendationReceived?: (nodeIds: string[], reasoning: string, paths?: any[]) => void;
    embedded?: boolean;
}

export default function ChatInterface({ cvText, onSearchReady, compact = false, initialMessages, onMessagesUpdate, onRecommendationReceived, embedded = false }: ChatInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>(
        initialMessages || [
            {
                role: 'assistant',
                content: "Hi! I've analyzed your CV. I'd love to get to know you better to find the perfect job match. Could you tell me a bit more about what you enjoy working on most?",
            },
        ]
    );
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [hasGeneratedPaths, setHasGeneratedPaths] = useState(false); // Track if we've already generated paths
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Sync messages with parent
    useEffect(() => {
        if (onMessagesUpdate) {
            onMessagesUpdate(messages);
        }
    }, [messages, onMessagesUpdate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = { role: 'user' as const, content: input };
        const newMessages = [...messages, userMessage];

        console.log('📤 SENDING TO API:');
        console.log('Total messages:', newMessages.length);
        console.log('User messages:', newMessages.filter(m => m.role === 'user').length);
        console.log('Messages:', newMessages.map(m => ({ role: m.role, preview: m.content.substring(0, 50) })));

        setMessages(newMessages);
        setInput('');
        setIsLoading(true);

        // Notify parent of message update
        if (onMessagesUpdate) {
            onMessagesUpdate(newMessages);
        }

        try {
            console.log('=== SENDING CHAT MESSAGE ===');
            // Send all current messages including the new user message
            console.log('Messages:', newMessages);
            console.log('Current message:', userMessage.content);
            console.log('CV Text length:', cvText?.length);

            const payload = {
                messages: newMessages,
                cvText,
                userId: getUserId(), // Pass userId for persistence
            };
            console.log('🔍 VERIFYING PAYLOAD:', {
                messageCount: payload.messages.length,
                cvTextLength: payload.cvText?.length,
                lastMessage: payload.messages[payload.messages.length - 1].content
            });

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            console.log('Response status:', response.status);
            console.log('Response ok:', response.ok);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error Response:', errorText);
                throw new Error(`Failed to send message: ${response.status} ${errorText}`);
            }

            const data = await response.json();

            console.log('📥 RECEIVED FROM API:', data);
            console.log('Has recommendedPath?', !!data.recommendedPath);
            console.log('Has paths?', !!data.paths);

            console.log('API Response data:', data);

            if (data.error) {
                console.error('API returned error:', data.error, data.details);
                throw new Error(data.error);
            }

            // Add assistant message
            const assistantMessage = { role: 'assistant' as const, content: data.message };
            const updatedMessages = [...newMessages, assistantMessage];
            setMessages(updatedMessages);

            // Notify parent of message update
            if (onMessagesUpdate) {
                onMessagesUpdate(updatedMessages);
            }

            const userMessageCount = updatedMessages.filter(m => m.role === 'user').length;

            console.log('🔢 User Message Count (after response):', userMessageCount);

            // Check for recommended path in response
            // ONLY trigger galaxy transition if we have at least 3 user messages AND valid data
            // AND we haven't already generated paths (to avoid redundant transitions when chatting in galaxy view)
            // AND we're NOT in embedded mode (floating chat on galaxy page)
            const hasValidPath = data.recommendedPath && data.recommendedPath.length > 0;
            const hasValidClusters = data.clusters && Object.keys(data.clusters).length > 0;

            if ((hasValidClusters || hasValidPath) && userMessageCount >= 3 && !hasGeneratedPaths && !embedded) {
                console.log('✅ TRIGGERING GALAXY TRANSITION (Have 3+ messages, first time)');

                // Mark that we've generated paths to avoid doing it again
                setHasGeneratedPaths(true);

                // Save recommendation to database
                const userId = getUserId();
                if (userId && data.paths) {
                    console.log('💾 Saving recommendation to database for user:', userId);
                    try {
                        const saveResponse = await fetch('/api/save-recommendation', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                userId,
                                paths: data.paths,
                                reasoning: data.recommendationReason || 'AI-generated career paths based on your profile'
                            })
                        });

                        if (saveResponse.ok) {
                            const saveData = await saveResponse.json();
                            console.log('✅ Recommendation saved:', saveData.recommendationId);
                        } else {
                            console.warn('⚠️ Failed to save recommendation');
                        }
                    } catch (saveError) {
                        console.error('Failed to save recommendation:', saveError);
                        // Don't block the flow if save fails
                    }
                }

                // Trigger galaxy view transition
                onSearchReady({
                    recommendedPath: data.recommendedPath,
                    paths: data.paths, // Pass full paths object
                    currentLevel: data.currentLevel, // Pass inferred level
                    location: data.location // Pass inferred location (if any)
                });

                // Also trigger recommendation callback if available
                if (onRecommendationReceived) {
                    onRecommendationReceived(
                        data.recommendedPath,
                        data.recommendationReason || '',
                        data.paths // Pass full paths object
                    );
                }
            } else if (embedded) {
                console.log('⏭️ SKIPPING GALAXY TRANSITION (Embedded chat in galaxy view)');
            } else if (hasGeneratedPaths) {
                console.log('⏭️ SKIPPING GALAXY TRANSITION (Already generated paths, user is refining in galaxy view)');
            } else if (data.recommendedPath && userMessageCount < 3) {
                console.log('❌ BLOCKING EARLY TRANSITION (Only', userMessageCount, 'user messages)');
            }

        } catch (error: any) {
            console.error('=== CHAT ERROR ===');
            console.error('Error type:', error.constructor?.name);
            console.error('Error message:', error.message);
            console.error('Full error:', error);
            alert(`Chat error: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // COMPACT HORIZONTAL LAYOUT (for results page)
    if (compact) {
        return (
            <div className="w-full">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Messages - 2/3 width */}
                    <div className="lg:col-span-2 bg-white/5 rounded-xl p-3 max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                        <div className="space-y-2">
                            {messages.map((msg, idx) => (
                                <div
                                    key={idx}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${msg.role === 'user'
                                            ? 'bg-gradient-to-r from-orange-500 to-blue-500 text-white'
                                            : 'bg-white/10 text-cyan-100 border border-white/10'
                                            }`}
                                    >
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-white/10 px-3 py-2 rounded-xl border border-white/10">
                                        <Loader2 className="w-4 h-4 animate-spin text-cyan-300" />
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    </div>

                    {/* Input - 1/3 width */}
                    <div className="lg:col-span-1">
                        <form onSubmit={handleSubmit} className="flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask for different roles..."
                                className="flex-1 px-3 py-2 text-sm rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-orange-500 text-white placeholder-cyan-200/50"
                            />
                            <button
                                type="submit"
                                disabled={isLoading || !input.trim()}
                                className="px-3 py-2 bg-gradient-to-r from-orange-500 to-blue-500 text-white rounded-xl hover:shadow-lg disabled:opacity-50 transition-all"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    // FULL VERTICAL LAYOUT (for main chat page)
    return (
        <div className={clsx(
            "flex flex-col overflow-hidden",
            embedded ? "h-full bg-transparent" : "h-[650px] bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20"
        )}>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={clsx(
                            'flex gap-3 max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-300',
                            msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''
                        )}
                    >
                        <div
                            className={clsx(
                                'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm',
                                msg.role === 'user'
                                    ? 'bg-gradient-to-br from-orange-500 to-blue-500 text-white'
                                    : 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white'
                            )}
                        >
                            {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                        </div>
                        <div
                            className={clsx(
                                'p-4 rounded-2xl text-sm leading-relaxed shadow-sm',
                                msg.role === 'user'
                                    ? 'bg-gradient-to-br from-orange-500 to-blue-500 text-white rounded-tr-md'
                                    : 'bg-white/90 text-gray-800 rounded-tl-md border border-white/20'
                            )}
                        >
                            {msg.content}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                            <Bot className="w-5 h-5" />
                        </div>
                        <div className="bg-white/90 p-4 rounded-2xl rounded-tl-md flex items-center border border-white/20">
                            <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit} className="p-6 border-t border-white/10 bg-white/5 backdrop-blur-sm">
                <div className="flex gap-3">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Tell me about your ideal role..."
                        className="flex-1 px-5 py-3 rounded-2xl border-2 border-white/20 bg-white/10 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-white placeholder-cyan-200 transition-all"
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="px-5 py-3 bg-gradient-to-r from-orange-500 to-blue-500 text-white rounded-2xl hover:shadow-2xl hover:shadow-orange-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            </form>
        </div>
    );
}
