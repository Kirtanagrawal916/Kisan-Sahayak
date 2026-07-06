import React from 'react';
import { motion } from 'framer-motion';
import { 
  CloudRain, 
  Thermometer, 
  Droplets, 
  Wind, 
  AlertTriangle, 
  CheckCircle,
  Sun,
  CloudSun
} from 'lucide-react';

const WeatherCard = ({ 
  location = "Pune, Maharashtra", 
  temp = 28, 
  condition = "Partly Cloudy", 
  humidity = 78, 
  windSpeed = 12, 
  rainChance = 65, 
  advisories = [
    { type: "warning", message: "Rain expected in 4 hrs. Postpone chemical spray operations." },
    { type: "success", message: "Soil moisture is optimal for sowing rabi seeds." }
  ],
  forecast = [
    { day: "Tomorrow", temp: 27, icon: "rain", rainChance: 80 },
    { day: "Mon, 06 Jul", temp: 29, icon: "cloudy", rainChance: 20 },
    { day: "Tue, 07 Jul", temp: 31, icon: "sunny", rainChance: 5 }
  ]
}) => {

  const getWeatherIcon = (cond) => {
    switch (cond?.toLowerCase()) {
      case 'rainy':
      case 'heavy rain':
        return <CloudRain className="w-10 h-10 text-blue-400" />;
      case 'partly cloudy':
      case 'cloudy':
        return <CloudSun className="w-10 h-10 text-emerald-400" />;
      case 'sunny':
      case 'clear':
        return <Sun className="w-10 h-10 text-amber-400" />;
      default:
        return <CloudSun className="w-10 h-10 text-emerald-400" />;
    }
  };

  const getForecastIcon = (iconName) => {
    switch (iconName) {
      case 'rain':
        return <CloudRain className="w-5 h-5 text-blue-400" />;
      case 'cloudy':
        return <CloudSun className="w-5 h-5 text-emerald-300" />;
      case 'sunny':
        return <Sun className="w-5 h-5 text-amber-400" />;
      default:
        return <Sun className="w-5 h-5 text-amber-400" />;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-panel w-full rounded-2xl overflow-hidden p-5 max-w-lg border border-white/10 shadow-xl"
    >
      {/* Location and Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className="text-xs uppercase tracking-wider text-emerald-400 font-semibold">Agri-Weather Desk</span>
          <h3 className="text-lg font-bold text-slate-100">{location}</h3>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
          Live Forecast
        </span>
      </div>

      {/* Main Temp & Icon Grid */}
      <div className="grid grid-cols-2 gap-4 mb-5 bg-slate-950/40 p-4 rounded-xl border border-white/5">
        <div className="flex items-center gap-3">
          {getWeatherIcon(condition)}
          <div>
            <div className="text-3xl font-extrabold text-white font-display">{temp}°C</div>
            <div className="text-xs text-slate-400 font-medium">{condition}</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center border-l border-white/10 pl-3">
          <div className="flex flex-col items-center justify-center">
            <Droplets className="w-4 h-4 text-blue-400 mb-1" />
            <span className="text-[10px] text-slate-400">Humidity</span>
            <span className="text-xs font-bold text-slate-200">{humidity}%</span>
          </div>
          <div className="flex flex-col items-center justify-center">
            <Wind className="w-4 h-4 text-slate-400 mb-1" />
            <span className="text-[10px] text-slate-400">Wind</span>
            <span className="text-xs font-bold text-slate-200">{windSpeed} km/h</span>
          </div>
          <div className="flex flex-col items-center justify-center">
            <CloudRain className="w-4 h-4 text-blue-300 mb-1" />
            <span className="text-[10px] text-slate-400">Rain %</span>
            <span className="text-xs font-bold text-slate-200">{rainChance}%</span>
          </div>
        </div>
      </div>

      {/* Advisories Section */}
      <div className="space-y-2.5 mb-5">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Farmer Advisories</h4>
        {advisories.map((adv, idx) => (
          <div 
            key={idx} 
            className={`flex items-start gap-2.5 p-3 rounded-lg border text-xs leading-relaxed ${
              adv.type === 'warning' 
                ? 'bg-amber-500/5 border-amber-500/20 text-amber-200' 
                : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-200'
            }`}
          >
            {adv.type === 'warning' ? (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            )}
            <p>{adv.message}</p>
          </div>
        ))}
      </div>

      {/* 3-Day Forecast */}
      <div className="border-t border-white/5 pt-4">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">3-Day Agri Outlook</h4>
        <div className="grid grid-cols-3 gap-2">
          {forecast.map((fc, idx) => (
            <div key={idx} className="bg-slate-950/20 hover:bg-slate-950/40 p-2.5 rounded-lg border border-white/5 flex flex-col items-center transition-all">
              <span className="text-[10px] text-slate-400 font-medium mb-1.5">{fc.day}</span>
              {getForecastIcon(fc.icon)}
              <span className="text-xs font-bold text-white mt-1.5">{fc.temp}°C</span>
              <span className="text-[9px] text-blue-400 font-medium flex items-center gap-0.5 mt-0.5">
                <CloudRain className="w-2.5 h-2.5" /> {fc.rainChance}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default WeatherCard;
