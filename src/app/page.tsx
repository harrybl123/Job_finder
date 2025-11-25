'use client';

import React, { useState, useEffect } from 'react';
import CVUpload from '@/components/CVUpload';
import ChatInterface from '@/components/ChatInterface';

import { Sparkles } from 'lucide-react';
import CareerPathSelector from '@/components/CareerPathSelector';
import CareerGalaxy from '@/components/CareerGalaxy';
import FloatingChatBubble from '@/components/FloatingChatBubble';
import { useConstellationStore } from '@/hooks/useConstellationStore';
import { constellationData } from '@/data/constellationData';
import { getUserId } from '@/lib/userSession';

export default function Home() {
  const [step, setStep] = useState<'upload' | 'chat' | 'galaxy' | 'results'>('upload');
  const [cvText, setCvText] = useState('');
  const [searchParams, setSearchParams] = useState<any>({});
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [careerClusters, setCareerClusters] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [isReturningUser, setIsReturningUser] = useState(false);

  // AI Recommendation state
  const [recommendedPath, setRecommendedPath] = useState<string[] | null>(null);
  const [recommendationReason, setRecommendationReason] = useState<string | null>(null);
  const [allPaths, setAllPaths] = useState<any[]>([]);
  const [currentLevel, setCurrentLevel] = useState<number | null>(null);

  // Check for returning user on page load
  useEffect(() => {
    const checkReturningUser = async () => {
      // Check if user just clicked "Start Over"
      const freshStart = sessionStorage.getItem('freshStart');
      if (freshStart) {
        console.log('🆕 Fresh start detected - skipping auto-load');
        sessionStorage.removeItem('freshStart');
        return; // Don't load any saved data
      }

      const userId = getUserId();

      if (userId) {
        console.log('🔄 Returning user detected:', userId);
        setIsReturningUser(true);

        try {
          // Fetch saved recommendations
          const recResponse = await fetch(`/api/save-recommendation?userId=${userId}`);

          if (recResponse.ok) {
            const data = await recResponse.json();

            if (data.recommendations && data.recommendations.length > 0) {
              const latestRec = data.recommendations[0]; // Most recent
              console.log('✅ Loaded saved recommendation:', latestRec.id);

              // Restore the paths
              setAllPaths(latestRec.paths);
              setRecommendationReason(latestRec.reasoning);

              // Extract primary path (first path's nodeIds)
              if (latestRec.paths && latestRec.paths.length > 0) {
                setRecommendedPath(latestRec.paths[0].nodeIds);

                // Auto-navigate to Galaxy view
                // setStep('galaxy'); // User requested to stop auto-navigation
                console.log('🌌 Data loaded, ready for Galaxy view');
              }
            }
          }

          // Fetch chat history
          const chatResponse = await fetch(`/api/chat-history?userId=${userId}`);
          if (chatResponse.ok) {
            const chatData = await chatResponse.json();
            if (chatData.messages && chatData.messages.length > 0) {
              console.log('💬 Loaded saved chat history:', chatData.messages.length, 'messages');
              setChatMessages(chatData.messages);
            }
          }

        } catch (error) {
          console.error('Failed to load saved user data:', error);
          // Don't block the user, just continue normally
        }
      }
    };

    checkReturningUser();
  }, []);

  // Handle "Start Over" - clear all data and reset state
  const handleStartOver = async () => {
    if (!confirm('Start over? This will clear your chat history and recommendations.')) {
      return;
    }

    try {
      // Clear localStorage
      const userId = localStorage.getItem('userId');
      if (userId) {
        // Delete chat messages from DB
        await fetch('/api/chat-history', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        });
      }
      localStorage.removeItem('userId');

      // Reset all state
      setCvText('');
      setChatMessages([]);
      setRecommendedPath(null);
      setAllPaths([]);
      setStep('upload');

      console.log('✅ Cleared all data - starting fresh!');
    } catch (error) {
      console.error('Error clearing data:', error);
      alert('Failed to clear data. Try refreshing the page.');
    }
  };

  const handleUploadComplete = (text: string) => {
    setCvText(text);
    setStep('chat');
  };

  const handleSearchReady = (data: any) => {
    console.log('🔍 [page.tsx] handleSearchReady called with data:', data);

    // Capture currentLevel if available
    if (data.currentLevel) {
      console.log('📊 [page.tsx] Setting current level:', data.currentLevel);
      setCurrentLevel(data.currentLevel);
    }

    // Capture paths array if available
    if (data.paths && data.paths.length > 0) {
      console.log('✅ [page.tsx] Setting all paths:', data.paths.length, 'paths');
      console.log('   Paths structure:', data.paths.map((p: any) => ({
        type: p.type,
        hasPathNodes: !!p.pathNodes,
        pathNodesCount: p.pathNodes?.length || 0,
        hasNodeIds: !!p.nodeIds,
        nodeIdsCount: p.nodeIds?.length || 0
      })));
      setAllPaths(data.paths);
    } else {
      console.log('⚠️ [page.tsx] No paths in data');
    }

    if (data.recommendedPath) {
      console.log('✅ [page.tsx] Setting recommended path:', data.recommendedPath);
      setRecommendedPath(data.recommendedPath);

      // Transition to galaxy view
      if (step !== 'galaxy') {
        console.log('🌌 [page.tsx] Transitioning to galaxy view');
        setStep('galaxy');
      }
    } else if (data.clusters) {
      console.log('Setting career clusters:', data.clusters);
      setCareerClusters(data.clusters);
      // Transition to galaxy view
      if (step !== 'galaxy') {
        setStep('galaxy');
      }
    } else if (data.queries) {
      // Fallback for legacy or direct search params
      console.log('Setting search params:', data);
      setSearchParams(data);
      // Don't switch to 'results' if we're already in galaxy view
      // This keeps the split-screen layout intact
      if (step !== 'galaxy') {
        setStep('galaxy'); // Force galaxy view even for legacy queries
      }
    } else {
      console.warn('No clusters, recommendedPath, or queries in data');
    }
  };

  const handleNodeClick = (node: any) => {
    console.log('Node clicked:', node);
    setSelectedNode(node);

    // Level 4 nodes are job titles - trigger job search
    if (node.level === 4 || node.type === 'role') {
      console.log('Triggering job search for:', node.name);

      // Check if this node is part of a recommended path to use the optimized query
      const matchingPath = allPaths.find(path => path.nodeIds.includes(node.id));
      const query = matchingPath?.optimizedSearchQuery || node.name;

      console.log('Using query:', query, matchingPath ? '(Optimized)' : '(Default)');

      setSearchParams({
        queries: [query],
        location: 'London, United Kingdom',
        experienceLevel: node.experienceLevel || 'entry_level',
        workType: 'full_time',
        cvText: cvText // Pass CV for relevance scoring
      });
    }
  };

  const handleRecommendationReceived = (nodeIds: string[], reasoning: string, paths?: any[]) => {
    console.log('Recommendations received in page.tsx:', nodeIds, reasoning);
    setRecommendedPath(nodeIds);
    setRecommendationReason(reasoning);
    if (paths) {
      setAllPaths(paths);
    }
  };

  const handleClusterSelection = (cluster: any) => {
    setSearchParams({
      queries: cluster.startingRoles,
      location: 'London, United Kingdom', // Default or extracted from CV later
      experienceLevel: 'entry_level', // Default or extracted
      workType: 'any'
    });
    setStep('galaxy');
  };

  const handleMessagesUpdate = (messages: any[]) => {
    setChatMessages(messages);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 relative overflow-hidden">
      {/* Animated gradient orbs */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-orange-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      {/* Main Content */}
      <div className="relative z-10 w-full max-w-[95%] mx-auto px-4 py-8 flex flex-col items-center min-h-screen">

        {/* Logo & Header */}
        <div className={`transition-all duration-500 flex flex-col items-center ${step === 'results' || step === 'galaxy' ? 'scale-75 mb-4' : 'mb-12'}`}>
          <div className="w-24 h-24 mb-6 relative group">
            <div className="absolute inset-0 bg-orange-500 blur-2xl opacity-20 group-hover:opacity-40 transition-opacity rounded-full"></div>
            <img
              src="/logo.png"
              alt="Career Navigator"
              className="w-full h-full object-contain relative z-10 drop-shadow-2xl"
            />
          </div>
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-orange-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Career Navigator
          </h1>
          <p className="text-xl text-blue-200 text-center max-w-2xl">
            Your AI-powered career exploration platform
          </p>
        </div>

        <div className="w-full space-y-6">
          {step === 'upload' && (
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="bg-white/10 backdrop-blur-xl p-10 rounded-3xl shadow-2xl border border-white/20">
                <CVUpload onUploadComplete={handleUploadComplete} />
              </div>
              {/* Debug Button */}
              <button
                onClick={() => {
                  // Just go straight to galaxy view, no mock data needed
                  setStep('galaxy');
                }}
                className="text-xs text-white/30 hover:text-white/80 transition-colors mx-auto block"
              >
                [Debug] Test Career Galaxy
              </button>
            </div>
          )}

          {step === 'chat' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <ChatInterface
                cvText={cvText}
                onSearchReady={handleSearchReady}
                initialMessages={chatMessages.length > 0 ? chatMessages : undefined}
                onMessagesUpdate={handleMessagesUpdate}
                onRecommendationReceived={handleRecommendationReceived}
              />


            </div>
          )}

          {step === 'galaxy' && (
            <div className="fixed inset-0 bg-slate-950">
              {/* Welcome Back Banner for Returning Users */}
              {isReturningUser && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in">
                  <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-lg border border-blue-400/30 rounded-2xl px-6 py-3 shadow-2xl">
                    <p className="text-blue-100 font-medium flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-blue-400" />
                      Welcome back! Your career journey continues...
                    </p>
                  </div>
                </div>
              )}

              {/* Full-Screen Galaxy */}
              <CareerGalaxy
                data={careerClusters}
                onNodeClick={handleNodeClick}
                paths={allPaths}  // Pass all 3 paths
                recommendationReason={recommendationReason || undefined}
                currentLevel={currentLevel || undefined}
              />

              {/* Floating Chat Bubble */}
              <FloatingChatBubble
                cvText={cvText}
                onRecommendationReceived={handleRecommendationReceived}
                onMessagesUpdate={handleMessagesUpdate}
                initialMessages={chatMessages}
              />
            </div>
          )}


        </div>
      </div>
    </main>
  );
}
