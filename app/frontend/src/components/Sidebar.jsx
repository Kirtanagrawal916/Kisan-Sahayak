import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  MessageSquare, 
  Settings, 
  Sparkles, 
  X, 
  ChevronLeft, 
  ChevronRight,
  Globe,
  HelpCircle,
  Leaf
} from 'lucide-react';

const Sidebar = ({ 
  isOpen, 
  onToggle, 
  recentChats = [], 
  activeChatId, 
  onSelectChat, 
  onNewChat 
}) => {
  
  const sidebarVariants = {
    open: { 
      width: '260px',
      x: 0,
      transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
    },
    closed: { 
      width: '0px',
      x: -260,
      transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay when sidebar is open */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onToggle}
            className="md:hidden fixed inset-0 bg-black z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Container */}
      <motion.div
        variants={sidebarVariants}
        animate={isOpen ? 'open' : 'closed'}
        initial={isOpen ? 'open' : 'closed'}
        className={`fixed md:relative top-0 bottom-0 left-0 z-50 glass-panel border-r border-white/10 flex flex-col h-full bg-[#070b12] text-slate-300 overflow-hidden select-none shrink-0`}
      >
        {/* Sidebar Header / Logo */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-500 border border-emerald-400/20 flex items-center justify-center text-white shadow-md">
              <Leaf className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-white tracking-wide font-display">Kisan Sahayak</h2>
              <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider">Agri-Advisor</span>
            </div>
          </div>
          <button 
            onClick={onToggle}
            className="p-1 rounded-lg border border-white/5 bg-slate-950/60 hover:bg-slate-950 text-slate-400 hover:text-white"
            title="Collapse Sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="px-3 pt-4 shrink-0">
          <button
            onClick={() => {
              onNewChat();
              // Auto close on mobile
              if (window.innerWidth < 768) onToggle();
            }}
            className="w-full py-2.5 px-4 rounded-xl border border-emerald-500/20 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-300 hover:text-emerald-200 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-950/10"
          >
            <Plus className="w-4 h-4" />
            New Consult
          </button>
        </div>

        {/* Recent Chats Section */}
        <div className="flex-1 overflow-y-auto px-2 py-4 space-y-1 scrollbar-thin">
          <div className="px-3 mb-2 text-[10px] uppercase tracking-wider font-semibold text-slate-500">
            Recent Advice
          </div>
          {recentChats.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-500 italic">No recent chats</div>
          ) : (
            recentChats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => {
                  onSelectChat(chat.id);
                  if (window.innerWidth < 768) onToggle();
                }}
                className={`w-full text-left py-2 px-3 rounded-xl flex items-center gap-2.5 text-xs transition-all ${
                  activeChatId === chat.id
                    ? 'bg-emerald-600/10 border border-emerald-500/20 text-white font-medium'
                    : 'bg-transparent border border-transparent hover:bg-slate-900/40 text-slate-400 hover:text-slate-200'
                }`}
              >
                <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${activeChatId === chat.id ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span className="truncate flex-1">{chat.title}</span>
              </button>
            ))
          )}
        </div>

        {/* Bottom Options / Settings */}
        <div className="p-3 border-t border-white/5 space-y-1 bg-slate-950/20 shrink-0">
          
          {/* Simulated Language Toggle */}
          <button
            onClick={() => alert("Select Language: English, हिंदी (Hindi), or मराठी (Marathi). Supported languages for crop advisory.")}
            className="w-full text-left py-2 px-3 rounded-lg text-xs hover:bg-slate-900/60 text-slate-400 hover:text-slate-200 flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-slate-500" />
              Language
            </span>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
              EN/मराठी
            </span>
          </button>

          {/* Quick Info */}
          <button
            onClick={() => alert("Kisan Sahayak AI (v1.0) Hackathon Project. Combines Crop Doctor vision models with real-time weather & mandi price datasets.")}
            className="w-full text-left py-2 px-3 rounded-lg text-xs hover:bg-slate-900/60 text-slate-400 hover:text-slate-200 flex items-center gap-2"
          >
            <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
            Support & Info
          </button>

          {/* Settings */}
          <button
            onClick={() => alert("Settings: Adjust localization pin, set commodity alert notifications, and configure default agronomy thresholds.")}
            className="w-full text-left py-2.5 px-3 rounded-lg text-xs hover:bg-slate-900/60 text-slate-400 hover:text-slate-200 flex items-center gap-2"
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" />
            System Settings
          </button>
          
        </div>
      </motion.div>
    </>
  );
};

export default Sidebar;
