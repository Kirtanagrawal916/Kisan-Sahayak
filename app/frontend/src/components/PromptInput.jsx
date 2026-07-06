import React, { useRef, useEffect } from 'react';
import { Image, Mic, Send, X } from 'lucide-react';

const PromptInput = ({ 
  value, 
  onChange, 
  onSubmit, 
  onImageClick, 
  imageAttachment, 
  onClearImage,
  placeholder = "Ask Kisan Sahayak about crop disease, weather advisories, or mandi prices..."
}) => {
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto-grow textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(200, textareaRef.current.scrollHeight)}px`;
    }
  }, [value]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        onImageClick({
          file,
          previewUrl: reader.result,
          crop: 'tomato' // default crop
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-6">
      <div className="glass-panel rounded-2xl border border-white/10 shadow-2xl relative">
        
        {/* Hidden File Input */}
        <input 
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Floating Image Attachment Preview */}
        {imageAttachment && (
          <div className="px-4 pt-4 flex">
            <div className="relative group rounded-xl overflow-hidden border border-white/15 bg-slate-950/80 p-1 flex items-center gap-2 pr-3">
              <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0">
                <img 
                  src={imageAttachment.previewUrl} 
                  alt="Attachment preview" 
                  className="w-full h-full object-cover" 
                />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wide">Attachment</span>
                <span className="text-xs text-slate-200 truncate max-w-[120px]">{imageAttachment.file?.name || "Leaf Image"}</span>
              </div>
              <button 
                onClick={onClearImage}
                className="p-1 rounded bg-slate-900 text-slate-400 hover:text-rose-400 border border-white/5 transition-all"
                title="Remove image"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="flex items-end gap-2 p-3">
          {/* Image Attachment Button */}
          <button
            type="button"
            onClick={triggerFileSelect}
            className={`p-2.5 rounded-xl border border-white/5 bg-slate-950/40 hover:bg-slate-950/80 text-slate-400 hover:text-emerald-400 transition-all ${
              imageAttachment ? 'text-emerald-400 bg-emerald-500/5' : ''
            }`}
            title="Attach leaf image for diagnosis"
          >
            <Image className="w-5 h-5" />
          </button>

          {/* Text Area */}
          <textarea
            ref={textareaRef}
            rows="1"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 resize-none bg-transparent py-2.5 px-2 text-sm text-slate-100 placeholder-slate-400 border-0 focus:ring-0 focus:outline-none min-h-[40px] max-h-[200px]"
          />

          {/* Action Icons right */}
          <div className="flex items-center gap-1.5 self-center">
            {/* Simulated Voice Button */}
            <button
              type="button"
              onClick={() => alert("Voice input is a demo feature. Speak crop questions in Marathi, Hindi, or English.")}
              className="p-2.5 rounded-xl border border-white/5 bg-slate-950/40 hover:bg-slate-950/80 text-slate-400 hover:text-emerald-400 transition-all"
              title="Voice Input (Hindi/English)"
            >
              <Mic className="w-5 h-5" />
            </button>

            {/* Send Button */}
            <button
              type="button"
              onClick={onSubmit}
              disabled={!value.trim() && !imageAttachment}
              className={`p-2.5 rounded-xl transition-all border ${
                value.trim() || imageAttachment
                  ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500'
                  : 'bg-slate-900 border-white/5 text-slate-500 cursor-not-allowed'
              }`}
              title="Send Message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      <div className="text-[10px] text-slate-500 text-center mt-2.5">
        Kisan Sahayak AI provides real-time farming support. Always double-check critical chemical dosages.
      </div>
    </div>
  );
};

export default PromptInput;
