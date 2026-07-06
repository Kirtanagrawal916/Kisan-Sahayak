import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Image as ImageIcon, Check } from 'lucide-react';

const ImageUploader = ({ onImageSelect, selectedImage, onClearImage }) => {
  const fileInputRef = useRef(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState('tomato');

  const crops = [
    { id: 'tomato', name: 'Tomato' },
    { id: 'wheat', name: 'Wheat' },
    { id: 'mango', name: 'Mango' },
    { id: 'rice', name: 'Rice' },
    { id: 'potato', name: 'Potato' }
  ];

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      processFile(file);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      processFile(file);
    }
  };

  const processFile = (file) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, WEBP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      onImageSelect({
        file,
        previewUrl: reader.result,
        crop: selectedCrop
      });
    };
    reader.readAsDataURL(file);
  };

  const onButtonClick = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <AnimatePresence mode="wait">
        {!selectedImage ? (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className={`glass-panel border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
              isDragActive 
                ? 'border-emerald-500 bg-emerald-500/5' 
                : 'border-white/15 hover:border-emerald-500/50 hover:bg-slate-950/20'
            }`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={onButtonClick}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleChange}
            />
            
            <div className="flex flex-col items-center justify-center">
              <div className="p-3 bg-slate-950/60 rounded-xl border border-white/5 mb-3 text-emerald-400">
                <Upload className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-100 mb-1">Upload leaf photograph</h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                Drag and drop your leaf photograph here, or click to browse. Max 10MB.
              </p>
            </div>
            
            {/* Quick Crop Selector */}
            <div className="mt-5 pt-4 border-t border-white/5" onClick={(e) => e.stopPropagation()}>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-2">
                Select Crop Type
              </div>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {crops.map((crop) => (
                  <button
                    key={crop.id}
                    onClick={() => setSelectedCrop(crop.id)}
                    className={`text-xs px-2.5 py-1 rounded-md border font-medium transition-all ${
                      selectedCrop === crop.id
                        ? 'bg-emerald-600 border-emerald-500 text-white'
                        : 'bg-slate-900 border-white/5 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {crop.name}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="glass-panel rounded-2xl p-4 border border-white/10 relative overflow-hidden flex items-center gap-4"
          >
            <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-white/10 shrink-0 bg-slate-950 flex items-center justify-center">
              <img
                src={selectedImage.previewUrl}
                alt="Upload preview"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold mb-1">
                <Check className="w-3.5 h-3.5" />
                <span>Leaf Photo Attached</span>
              </div>
              <p className="text-sm font-bold text-slate-100 truncate">
                {selectedImage.file?.name || "Leaf Image"}
              </p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="text-[10px] text-slate-400">Crop Selected:</span>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide bg-emerald-500/10 px-1.5 py-0.5 rounded">
                  {crops.find(c => c.id === selectedImage.crop)?.name || selectedImage.crop}
                </span>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onClearImage();
              }}
              className="p-1.5 bg-slate-950/60 hover:bg-rose-950/50 border border-white/10 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 rounded-lg transition-all"
              title="Remove image"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ImageUploader;
