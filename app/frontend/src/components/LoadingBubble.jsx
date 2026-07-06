import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

const LoadingBubble = () => {
  const dotVariants = {
    start: {
      y: '0%',
    },
    end: {
      y: '100%',
    },
  };

  const dotTransition = {
    duration: 0.5,
    repeat: Infinity,
    repeatType: 'reverse',
    ease: 'easeInOut',
  };

  return (
    <div className="flex gap-4 p-4 rounded-2xl bg-slate-900/40 border border-white/5 max-w-[85%] self-start mr-auto">
      {/* Bot Avatar */}
      <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center border border-emerald-400/20 shrink-0 text-white shadow-lg">
        <Sparkles className="w-4 h-4" />
      </div>

      {/* Thinking Bubble */}
      <div className="flex flex-col gap-1.5 justify-center">
        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Kisan Sahayak</span>
        <div className="flex items-center gap-1 py-1 px-1">
          {[0, 1, 2].map((index) => (
            <motion.span
              key={index}
              className="w-2.5 h-2.5 bg-emerald-500 rounded-full"
              variants={dotVariants}
              initial="start"
              animate="end"
              transition={{
                ...dotTransition,
                delay: index * 0.15,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default LoadingBubble;
