'use client';

import { useState } from 'react';
import ChatInterface from './ChatInterface';

interface FloatingChatBubbleProps {
  cvText: string;
  onRecommendationReceived?: (path: string[], reason: string, paths?: any[]) => void;
  initialMessages?: any[];
  onMessagesUpdate?: (messages: any[]) => void;
}

export default function FloatingChatBubble({
  cvText,
  onRecommendationReceived,
  initialMessages = [],
  onMessagesUpdate
}: FloatingChatBubbleProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      {isExpanded && (
        /* Backdrop - click to close */
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-fade-in"
          onClick={() => setIsExpanded(false)}
          aria-label="Close chat"
        />
      )}

      <div className="fixed bottom-6 left-6 z-50">
        {isExpanded ? (
          /* Expanded Chat Panel - Much Bigger */
          <div className="w-[600px] h-[70vh] bg-slate-900/95 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl flex flex-col animate-scale-in overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex justify-between items-center flex-shrink-0">
              <h3 className="text-white text-xl font-semibold flex items-center gap-3">
                <span className="text-2xl">💬</span>
                Career Chat
              </h3>
              <button
                onClick={() => setIsExpanded(false)}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-colors"
                aria-label="Minimize chat"
              >
                ✕
              </button>
            </div>

            {/* Chat Messages - Takes full remaining space */}
            <div className="flex-1 min-h-0">
              <ChatInterface
                cvText={cvText}
                onSearchReady={(data) => {
                  // Handle search ready if needed
                  if (onRecommendationReceived && data.recommendedPath) {
                    onRecommendationReceived(data.recommendedPath, data.recommendationReason || '');
                  }
                }}
                onRecommendationReceived={onRecommendationReceived}
                onMessagesUpdate={onMessagesUpdate}
                compact={false}
                embedded={true}
                initialMessages={initialMessages}
              />
            </div>
          </div>
        ) : (
          /* Minimized Bubble */
          <button
            onClick={() => setIsExpanded(true)}
            className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 shadow-2xl hover:shadow-purple-500/50 flex items-center justify-center text-3xl hover:scale-110 transition-all duration-200 animate-bounce-subtle"
            aria-label="Open chat"
          >
            💬
          </button>
        )}
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .animate-scale-in {
          animation: scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes bounce-subtle {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-4px);
          }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 3s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}
