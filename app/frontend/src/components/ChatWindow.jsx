import React, { useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import LoadingBubble from './LoadingBubble';
import { 
  Sparkles, 
  CloudSun, 
  Coins, 
  Leaf, 
  HelpCircle,
  TrendingUp,
  MapPin
} from 'lucide-react';

const ChatWindow = ({ messages, isLoading, onSelectQuickAction }) => {
  const bottomRef = useRef(null);

  // Auto scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const quickActions = [
    {
      title: "Crop Disease Diagnosis",
      desc: "Upload a leaf photo to diagnose diseases like blight or rust.",
      icon: <Leaf className="w-5 h-5 text-emerald-400" />,
      actionText: "Help me diagnose a leaf disease for my tomato crop",
      badge: "Photo Upload"
    },
    {
      title: "Weather Advisories",
      desc: "Get farming-specific advice based on local forecasts.",
      icon: <CloudSun className="w-5 h-5 text-blue-400" />,
      actionText: "What is the weather forecast and farming advice for Pune?",
      badge: "Local Advice"
    },
    {
      title: "Mandi Market Prices",
      desc: "Check live wheat, rice, and vegetable prices in your local Mandi.",
      icon: <Coins className="w-5 h-5 text-amber-400" />,
      actionText: "Show me the current mandi market prices for Wheat",
      badge: "Market Rates"
    },
    {
      title: "General Farming Advice",
      desc: "Ask about seeds, fertilizers, irrigation, and soil management.",
      icon: <HelpCircle className="w-5 h-5 text-purple-400" />,
      actionText: "What fertilizer is best for crop sowing in clay soil?",
      badge: "Agronomy Q&A"
    }
  ];

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 flex flex-col">
      {messages.length === 0 ? (
        // Welcome Screen
        <div className="flex-1 flex flex-col justify-center items-center max-w-4xl mx-auto text-center px-4 py-8">
          
          {/* Logo Badge */}
          <div className="p-3 bg-gradient-to-tr from-emerald-600/20 to-teal-500/20 border border-emerald-500/30 rounded-2xl text-emerald-400 mb-6 shadow-xl shadow-emerald-500/5 animate-pulse">
            <Sparkles className="w-8 h-8" />
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold font-display text-white tracking-tight leading-none mb-3">
            Kisan Sahayak <span className="text-emerald-500">AI</span>
          </h1>
          <p className="text-sm md:text-base text-slate-300 max-w-xl mx-auto mb-10 leading-relaxed font-light">
            Your premium AI agronomy companion. Get crop diagnosis, weather-based irrigation advisories, and live Mandi prices instantly.
          </p>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full text-left">
            {quickActions.map((action, idx) => (
              <div 
                key={idx}
                onClick={() => onSelectQuickAction(action.actionText)}
                className="glass-panel glass-panel-hover rounded-2xl p-5 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <div className="p-2.5 bg-slate-950/60 rounded-xl border border-white/5">
                      {action.icon}
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-white/5 border border-white/10 px-2 py-0.5 rounded">
                      {action.badge}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-100 mb-1">{action.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{action.desc}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-emerald-400 font-semibold group">
                  <span>Try this prompt</span>
                  <span className="transform translate-x-0 group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </div>
            ))}
          </div>

        </div>
      ) : (
        // Message Feed
        <div className="flex-grow space-y-6">
          {messages.map((message, index) => (
            <ChatMessage key={index} message={message} />
          ))}

          {/* Loading bubble */}
          {isLoading && <LoadingBubble />}
          
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
};

export default ChatWindow;
