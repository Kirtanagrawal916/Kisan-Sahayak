import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, 
  AlertTriangle, 
  Leaf, 
  Activity, 
  ShieldAlert, 
  FlaskConical, 
  Sparkles 
} from 'lucide-react';

const DiseaseCard = ({ 
  cropName = "Tomato",
  diseaseName = "Early Blight (Alternaria solani)",
  confidence = 94,
  symptoms = [
    "Dark spots with concentric rings (target-like pattern) on older leaves.",
    "Leaves turn yellow and drop off prematurely.",
    "Sunken, dark spots on stems near ground level.",
    "Fruit develops leathery black spots at the stem end."
  ],
  organicTreatments = [
    "Apply copper fungicides approved for organic use (Bordeaux mixture).",
    "Remove and destroy infected lower leaves immediately to prevent spore splash.",
    "Mulch the soil surface around plants to prevent spores from splashing onto leaves.",
    "Spray compost tea or Trichoderma viride bio-fungicide weekly."
  ],
  chemicalTreatments = [
    "Spray chlorothalonil, mancozeb, or difenoconazole according to instructions.",
    "Rotate chemical groups to avoid resistance (e.g., alternate FRAC group 3 and M3 fungicides).",
    "Apply early in the morning when wind speeds are below 8 km/h."
  ],
  imageUrl = null
}) => {
  const [activeTab, setActiveTab] = useState('symptoms'); // 'symptoms', 'organic', 'chemical'

  const getConfidenceColor = (score) => {
    if (score >= 90) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (score >= 70) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
  };

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { duration: 0.3 }
    }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="glass-panel w-full rounded-2xl overflow-hidden max-w-lg border border-white/10 shadow-xl"
    >
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900/50 to-teal-900/40 p-4 border-b border-white/5 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Leaf className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-bold text-slate-100 uppercase tracking-wide">Crop Doctor Report</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span>Analysis Complete</span>
        </div>
      </div>

      {/* Main Info */}
      <div className="p-5">
        <div className="flex gap-4 items-start mb-5">
          {imageUrl && (
            <div className="w-20 h-20 rounded-xl overflow-hidden border border-white/10 shrink-0 bg-slate-900 flex items-center justify-center">
              <img 
                src={imageUrl} 
                alt="Diagnosed crop leaf" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none'; // Fallback if image fails to load
                }}
              />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
              {cropName} Crop
            </span>
            <h3 className="text-base font-bold text-white mt-1.5 truncate leading-tight">
              {diseaseName}
            </h3>
            
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[11px] text-slate-400">Confidence Score:</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${getConfidenceColor(confidence)}`}>
                {confidence}%
              </span>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-slate-950/50 p-1 rounded-lg border border-white/5 mb-4">
          <button
            onClick={() => setActiveTab('symptoms')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
              activeTab === 'symptoms' 
                ? 'bg-emerald-600 text-white shadow-sm' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Symptoms
          </button>
          <button
            onClick={() => setActiveTab('organic')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
              activeTab === 'organic' 
                ? 'bg-emerald-600 text-white shadow-sm' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Organic Cure
          </button>
          <button
            onClick={() => setActiveTab('chemical')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
              activeTab === 'chemical' 
                ? 'bg-emerald-600 text-white shadow-sm' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Chemical Cure
          </button>
        </div>

        {/* Tab Content rendering */}
        <div className="min-h-[140px] bg-slate-950/20 p-4 rounded-xl border border-white/5">
          <AnimatePresence mode="wait">
            {activeTab === 'symptoms' && (
              <motion.div
                key="symptoms"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.15 }}
                className="space-y-2"
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  <span>Clinical Observations</span>
                </div>
                <ul className="space-y-1.5">
                  {symptoms.map((symptom, idx) => (
                    <li key={idx} className="text-xs text-slate-300 flex items-start gap-2 leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                      <span>{symptom}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}

            {activeTab === 'organic' && (
              <motion.div
                key="organic"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.15 }}
                className="space-y-2"
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Natural Bio-Remedies</span>
                </div>
                <ul className="space-y-1.5">
                  {organicTreatments.map((treatment, idx) => (
                    <li key={idx} className="text-xs text-emerald-200 flex items-start gap-2 leading-relaxed">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{treatment}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}

            {activeTab === 'chemical' && (
              <motion.div
                key="chemical"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.15 }}
                className="space-y-2"
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-400 mb-1">
                  <FlaskConical className="w-3.5 h-3.5 text-teal-400" />
                  <span>Chemical Treatments</span>
                </div>
                <ul className="space-y-1.5">
                  {chemicalTreatments.map((treatment, idx) => (
                    <li key={idx} className="text-xs text-teal-200 flex items-start gap-2 leading-relaxed">
                      <AlertTriangle className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                      <span>{treatment}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default DiseaseCard;
