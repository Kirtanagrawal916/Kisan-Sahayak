import React from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  MapPin, 
  Calendar, 
  Coins, 
  Store 
} from 'lucide-react';

const PriceCard = ({ 
  commodity = "Wheat (Lokwan)",
  avgPrice = 2450, // per quintal
  highestPrice = 2600,
  lowestPrice = 2200,
  mandiName = "Lasalgaon Mandi",
  distance = "18 km",
  date = "Today",
  trend = "up", // 'up', 'down', 'stable'
  trendPercent = 2.4,
  historicalPrices = [2380, 2400, 2410, 2430, 2450] // past few entries
}) => {

  const getTrendIcon = (t) => {
    switch (t) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-emerald-400" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-rose-400" />;
      default:
        return <Minus className="w-4 h-4 text-slate-400" />;
    }
  };

  const getTrendBgColor = (t) => {
    switch (t) {
      case 'up':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'down':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-panel w-full rounded-2xl overflow-hidden p-5 max-w-lg border border-white/10 shadow-xl"
    >
      {/* Header Info */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className="text-xs uppercase tracking-wider text-emerald-400 font-semibold flex items-center gap-1">
            <Store className="w-3 h-3" /> Mandi Price Tracker
          </span>
          <h3 className="text-lg font-bold text-slate-100 mt-1">{commodity}</h3>
        </div>
        <div className={`flex items-center gap-1.5 px-2 py-0.5 text-xs font-bold rounded-full border ${getTrendBgColor(trend)}`}>
          {getTrendIcon(trend)}
          <span>{trend === 'stable' ? 'Stable' : `${trend === 'up' ? '+' : '-'}${trendPercent}%`}</span>
        </div>
      </div>

      {/* Main Pricing Metrics */}
      <div className="grid grid-cols-3 gap-2 text-center py-3 bg-slate-950/40 rounded-xl border border-white/5 mb-4">
        <div className="flex flex-col justify-center border-r border-white/5">
          <span className="text-[10px] text-slate-400 font-medium">Avg Rate</span>
          <span className="text-base font-extrabold text-emerald-400 mt-0.5 font-display">₹{avgPrice}</span>
          <span className="text-[9px] text-slate-500">/ Quintal</span>
        </div>
        <div className="flex flex-col justify-center border-r border-white/5">
          <span className="text-[10px] text-slate-400 font-medium">Min Rate</span>
          <span className="text-sm font-semibold text-slate-200 mt-0.5 font-display">₹{lowestPrice}</span>
          <span className="text-[9px] text-slate-500">/ Quintal</span>
        </div>
        <div className="flex flex-col justify-center">
          <span className="text-[10px] text-slate-400 font-medium">Max Rate</span>
          <span className="text-sm font-semibold text-slate-200 mt-0.5 font-display">₹{highestPrice}</span>
          <span className="text-[9px] text-slate-500">/ Quintal</span>
        </div>
      </div>

      {/* Market Details */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            Market Location
          </span>
          <span className="text-slate-200 font-medium">{mandiName} <span className="text-slate-400">({distance})</span></span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            Last Updated
          </span>
          <span className="text-slate-200 font-medium">{date}</span>
        </div>
      </div>

      {/* Small Trend Chart Mock */}
      <div className="border-t border-white/5 pt-3 flex items-center justify-between">
        <div className="text-[10px] text-slate-400 font-medium">7-Day Price Curve</div>
        <div className="flex items-end gap-1 h-6">
          {historicalPrices.map((price, idx) => {
            // map prices to height percentages
            const min = Math.min(...historicalPrices) * 0.99;
            const max = Math.max(...historicalPrices) * 1.01;
            const height = ((price - min) / (max - min)) * 100;
            return (
              <div 
                key={idx}
                style={{ height: `${Math.max(20, height)}%` }}
                className={`w-2.5 rounded-t-sm transition-all duration-300 ${
                  trend === 'up' ? 'bg-emerald-500/40 hover:bg-emerald-500' : 'bg-rose-500/40 hover:bg-rose-500'
                }`}
                title={`₹${price}`}
              />
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};

export default PriceCard;
