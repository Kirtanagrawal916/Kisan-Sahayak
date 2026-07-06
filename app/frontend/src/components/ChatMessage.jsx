import React from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { User, Sparkles } from 'lucide-react';
import WeatherCard from './WeatherCard';
import DiseaseCard from './DiseaseCard';
import PriceCard from './PriceCard';

const ChatMessage = ({ message }) => {
  const { role, content, weatherData, diseaseData, priceData, imageAttachment } = message;
  const isUser = role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={`flex gap-4 p-4 rounded-2xl w-full max-w-4xl mx-auto border ${
        isUser 
          ? 'bg-slate-950/20 border-white/5 self-end ml-auto' 
          : 'bg-slate-900/40 border-white/5 self-start mr-auto'
      }`}
    >
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-md border ${
        isUser 
          ? 'bg-slate-800 border-white/10 text-slate-300' 
          : 'bg-gradient-to-tr from-emerald-600 to-teal-500 border-emerald-400/20 text-white'
      }`}>
        {isUser ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
      </div>

      {/* Message Content Container */}
      <div className="flex-1 space-y-3 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
            {isUser ? 'Farmer User' : 'Kisan Sahayak AI'}
          </span>
        </div>

        {/* Uploaded image inside User message */}
        {isUser && imageAttachment && (
          <div className="w-full max-w-sm rounded-xl overflow-hidden border border-white/10 bg-slate-950/40 p-1 mb-2.5">
            <img 
              src={imageAttachment.previewUrl} 
              alt="Leaf uploaded by user" 
              className="w-full h-48 object-cover rounded-lg"
            />
            {imageAttachment.crop && (
              <div className="px-2 py-1.5 text-[10px] text-slate-400">
                Crop type selected: <span className="font-bold text-emerald-400 uppercase tracking-wide bg-emerald-500/10 px-1 rounded">{imageAttachment.crop}</span>
              </div>
            )}
          </div>
        )}

        {/* Text Content with Markdown */}
        <div className="prose-custom">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content}
          </ReactMarkdown>
        </div>

        {/* Embedded Custom Cards if present */}
        {!isUser && (weatherData || diseaseData || priceData) && (
          <div className="pt-2">
            {weatherData && <WeatherCard {...weatherData} />}
            {diseaseData && <DiseaseCard {...diseaseData} />}
            {priceData && <PriceCard {...priceData} />}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ChatMessage;
