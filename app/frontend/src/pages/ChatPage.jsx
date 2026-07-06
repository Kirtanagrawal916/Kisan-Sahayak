import React, { useState, useEffect } from 'react';
import { Menu, Leaf, Trash2, ArrowUpRight, Sparkles, MessageSquare, AlertCircle } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import PromptInput from '../components/PromptInput';
import ImageUploader from '../components/ImageUploader';

// Import local crop disease samples for demonstration
import blurryLeaf from '../../../../sample_images/blurry_leaf.png';
import mangoLeaf from '../../../../sample_images/mango_leaf.png';
import tomatoEarly from '../../../../sample_images/tomato_early_blight.png';
import tomatoLate from '../../../../sample_images/tomato_late_blight.png';
import wheatRust from '../../../../sample_images/wheat_brown_rust.png';

const ChatPage = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeChatId, setActiveChatId] = useState(null);
  const [inputText, setInputText] = useState('');
  const [imageAttachment, setImageAttachment] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showImageUploader, setShowImageUploader] = useState(false);

  // Mock initial conversations representing high-fidelity demo scenarios
  const [recentChats, setRecentChats] = useState([
    {
      id: 'tomato-disease',
      title: 'Tomato Leaf Disease Consult',
      messages: [
        {
          role: 'user',
          content: 'My tomato plant leaves have dark spots on them and they are turning yellow at the bottom. What is this?',
          imageAttachment: {
            previewUrl: tomatoEarly,
            crop: 'tomato',
            file: { name: 'tomato_leaf_spot.png' }
          }
        },
        {
          role: 'assistant',
          content: 'I have analyzed the leaf photograph you provided. Your crop shows clear symptoms of **Tomato Early Blight** (caused by *Alternaria solani*).\n\nEarly Blight is a common fungal disease that starts on older leaves, forming target-like concentric circles. If untreated, it can spread to stems and fruits, reducing yields significantly.\n\nHere is your **Crop Doctor Diagnosis** report and remediation plan:',
          diseaseData: {
            cropName: "Tomato",
            diseaseName: "Early Blight (Alternaria solani)",
            confidence: 94,
            symptoms: [
              "Dark spots with concentric rings (target-like pattern) on older leaves.",
              "Lower leaves turn yellow and drop off prematurely.",
              "Sunken, dark spots on stems near ground level.",
              "Leathery black spots near fruit stems."
            ],
            organicTreatments: [
              "Apply copper-based organic fungicides (Bordeaux mixture).",
              "Surgically prune and burn infected lower foliage.",
              "Mulch the soil surface around plants to prevent spore splashback.",
              "Spray Trichoderma viride bio-fungicide weekly."
            ],
            chemicalTreatments: [
              "Spray Chlorothalonil or Mancozeb at 2g/litre of water.",
              "Alternate with Difenoconazole to prevent fungal resistance.",
              "Apply early in the morning under low wind conditions (< 8 km/h)."
            ],
            imageUrl: tomatoEarly
          }
        }
      ]
    },
    {
      id: 'wheat-mandi',
      title: 'Wheat Mandi Price Query',
      messages: [
        {
          role: 'user',
          content: 'Show me the latest mandi rates for wheat near Nashik district.'
        },
        {
          role: 'assistant',
          content: 'Here are the current market rates for **Wheat (Lokwan Quality)** at the nearby Lasalgaon Mandi. Wheat prices are showing a positive upward trend (+2.4%) this week due to reduced market arrivals and strong procurement demand.',
          priceData: {
            commodity: "Wheat (Lokwan Quality)",
            avgPrice: 2450,
            highestPrice: 2620,
            lowestPrice: 2280,
            mandiName: "Lasalgaon Mandi",
            distance: "22 km",
            date: "Today",
            trend: "up",
            trendPercent: 2.4,
            historicalPrices: [2350, 2380, 2400, 2420, 2450]
          }
        }
      ]
    },
    {
      id: 'pune-weather',
      title: 'Pune Agri-Weather Alert',
      messages: [
        {
          role: 'user',
          content: 'Is the weather good to apply pesticide spray on my sugarcane crop in Pune?'
        },
        {
          role: 'assistant',
          content: 'Analyzing regional radar and meteorological data for Pune. There is a high probability of precipitation over the next 24 hours. **Pesticide spraying is not recommended today** as rainfall will wash away the active ingredients, leading to chemical waste and runoff.',
          weatherData: {
            location: "Pune, Maharashtra",
            temp: 26,
            condition: "Heavy Rain Forecast",
            humidity: 88,
            windSpeed: 18,
            rainChance: 85,
            advisories: [
              { type: "warning", message: "Heavy showers predicted in next 6 hours. Hold off all foliar sprays and fertilizers." },
              { type: "warning", message: "Wind speeds are high (18 km/h). High spray drift risk. Do not apply chemicals." },
              { type: "success", message: "Excellent window for rainwater harvesting storage checks." }
            ],
            forecast: [
              { day: "Tomorrow", temp: 25, icon: "rain", rainChance: 90 },
              { day: "Mon, 06 Jul", temp: 27, icon: "cloudy", rainChance: 40 },
              { day: "Tue, 07 Jul", temp: 29, icon: "sunny", rainChance: 10 }
            ]
          }
        }
      ]
    }
  ]);

  // Adjust sidebar state based on screen size on mount
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const activeChat = recentChats.find(chat => chat.id === activeChatId);
  const activeMessages = activeChat ? activeChat.messages : [];

  const handleNewChat = () => {
    setActiveChatId(null);
    setImageAttachment(null);
    setInputText('');
    setShowImageUploader(false);
  };

  const handleSelectChat = (id) => {
    setActiveChatId(id);
    setShowImageUploader(false);
  };

  const handleImageSelect = (imgObj) => {
    setImageAttachment(imgObj);
    setShowImageUploader(false);
  };

  const handleClearImage = () => {
    setImageAttachment(null);
  };

  const handleSelectQuickAction = (actionText) => {
    // If it's a disease diagnosis action, open the file upload panel to help the user attach an image
    if (actionText.includes("diagnose")) {
      setInputText(actionText);
      setShowImageUploader(true);
    } else {
      setInputText(actionText);
      simulateSubmit(actionText, null);
    }
  };

  const handleSend = () => {
    if (!inputText.trim() && !imageAttachment) return;
    simulateSubmit(inputText, imageAttachment);
  };

  const simulateSubmit = (text, attachedImg) => {
    const userMsg = {
      role: 'user',
      content: text || (attachedImg ? `Diagnose leaf disease for attached photo.` : ''),
      imageAttachment: attachedImg
    };

    // If starting a brand new conversation, create the chat entry first
    let currentChatId = activeChatId;
    let newChatTitle = text ? (text.length > 25 ? text.substring(0, 25) + '...' : text) : 'Leaf Image Diagnosis';
    
    if (!currentChatId) {
      currentChatId = 'chat_' + Date.now();
      const newChat = {
        id: currentChatId,
        title: newChatTitle,
        messages: [userMsg]
      };
      setRecentChats(prev => [newChat, ...prev]);
      setActiveChatId(currentChatId);
    } else {
      // Append to existing chat
      setRecentChats(prev => prev.map(chat => {
        if (chat.id === currentChatId) {
          return {
            ...chat,
            messages: [...chat.messages, userMsg]
          };
        }
        return chat;
      }));
    }

    // Clear prompt inputs
    setInputText('');
    setImageAttachment(null);
    setShowImageUploader(false);

    // Simulate AI response
    setIsLoading(true);

    setTimeout(() => {
      let aiMsg = {
        role: 'assistant',
        content: ''
      };

      const normalizedText = text.toLowerCase();

      // Simple AI Routing logic to demonstrate cards realistically
      if (attachedImg || normalizedText.includes('diagnose') || normalizedText.includes('disease') || normalizedText.includes('blight') || normalizedText.includes('leaf')) {
        const crop = attachedImg?.crop || 'tomato';
        if (crop === 'wheat') {
          aiMsg.content = `I have analyzed the wheat leaf image. It shows severe characteristics of **Wheat Brown Rust** (caused by *Puccinia recondita*). \n\nRust spots restrict photosynthesis and cause leaf dry-outs. Please check the diagnosis report below:`;
          aiMsg.diseaseData = {
            cropName: "Wheat",
            diseaseName: "Brown Rust (Puccinia recondita)",
            confidence: 91,
            symptoms: [
              "Small, orange-brown pustules on leaves, resembling rust spots.",
              "Fungal spores can be easily rubbed off with fingers.",
              "Leaves turn yellow and dry up from leaf-tip downward."
            ],
            organicTreatments: [
              "Spray neem oil (1% solution) at weekly intervals.",
              "Grow rust-resistant cultivars (like DBW 187 or HD 3226).",
              "Avoid over-fertilizing with nitrogen which creates excessive dense foliage."
            ],
            chemicalTreatments: [
              "Spray Propiconazole 25% EC at 1 ml/litre of water.",
              "Alternatively apply Tebuconazole fungicide.",
              "Ensure complete coverage of the plant canopy."
            ],
            imageUrl: wheatRust
          };
        } else if (crop === 'mango') {
          aiMsg.content = `Analyzing the mango leaf photo. The dark, irregular necrotic spots are indicative of **Mango Anthracnose** (fungal disease caused by *Colletotrichum gloeosporioides*). Prompt pruning and organic sprays are recommended:`;
          aiMsg.diseaseData = {
            cropName: "Mango",
            diseaseName: "Anthracnose (Colletotrichum gloeosporioides)",
            confidence: 88,
            symptoms: [
              "Dark brown to black lesions on young leaves and shoots.",
              "Coalesced spots creating large dry margins on the leaf blade.",
              "Withered blossom twigs and blossom-blight symptoms."
            ],
            organicTreatments: [
              "Prune dead twigs and burn to destroy fungal spore harbor.",
              "Spray Pseudomonas fluorescens liquid formulation regularly.",
              "Apply copper hydroxide spray during fruit development."
            ],
            chemicalTreatments: [
              "Spray Carbendazim or Azoxystrobin (0.1% active concentration).",
              "Spray copper oxychloride 3g/litre before flowering onset."
            ],
            imageUrl: mangoLeaf
          };
        } else {
          // Default to Tomato Early Blight
          aiMsg.content = `Analyzing the leaf image. Symptoms point to **Tomato Early Blight** (caused by *Alternaria solani*). Here are the details and treatments:`;
          aiMsg.diseaseData = {
            cropName: "Tomato",
            diseaseName: "Early Blight (Alternaria solani)",
            confidence: 95,
            symptoms: [
              "Dark spots with concentric target-like rings on older leaves.",
              "Lower leaves yellowing and drooping off prematurely.",
              "Stem lesions near soil line."
            ],
            organicTreatments: [
              "Apply copper-based organic fungicides.",
              "Prune and destroy infected lower leaves.",
              "Mulch the soil surface around plants to prevent splashing."
            ],
            chemicalTreatments: [
              "Spray Chlorothalonil or Mancozeb at 2g/litre of water.",
              "Alternate with Difenoconazole to prevent resistance."
            ],
            imageUrl: tomatoEarly
          };
        }
      } else if (normalizedText.includes('weather') || normalizedText.includes('rain') || normalizedText.includes('forecast') || normalizedText.includes('spray')) {
        aiMsg.content = `Fetched live meteorological data for Pune. A rain front is moving in, meaning **foliar spraying should be avoided** to prevent pesticide wash-off. Soil humidity is high, which is excellent for sowing.`;
        aiMsg.weatherData = {
          location: "Pune, Maharashtra",
          temp: 27,
          condition: "Rainy",
          humidity: 82,
          windSpeed: 14,
          rainChance: 80,
          advisories: [
            { type: "warning", message: "Moderate to heavy rain expected. Do not spray chemicals or apply top-dress urea." },
            { type: "success", message: "Excellent soil moisture. Recommended time for sowing/potting operations." }
          ],
          forecast: [
            { day: "Tomorrow", temp: 26, icon: "rain", rainChance: 85 },
            { day: "Mon", temp: 28, icon: "cloudy", rainChance: 30 },
            { day: "Tue", temp: 30, icon: "sunny", rainChance: 10 }
          ]
        };
      } else if (normalizedText.includes('mandi') || normalizedText.includes('price') || normalizedText.includes('rate') || normalizedText.includes('wheat') || normalizedText.includes('onion')) {
        const isOnion = normalizedText.includes('onion');
        if (isOnion) {
          aiMsg.content = `Here are the latest commodity market prices for **Red Onion** at Lasalgaon Mandi. Rates have dipped slightly due to increased arrivals from regional fields.`;
          aiMsg.priceData = {
            commodity: "Red Onion (Nashik Quality)",
            avgPrice: 1950,
            highestPrice: 2200,
            lowestPrice: 1600,
            mandiName: "Lasalgaon Mandi",
            distance: "18 km",
            date: "Today",
            trend: "down",
            trendPercent: 4.1,
            historicalPrices: [2150, 2100, 2050, 2000, 1950]
          };
        } else {
          aiMsg.content = `Here are the current commodity rates for **Wheat (Lokwan)** at the nearby Lasalgaon Mandi. Wheat prices are trending upwards (+2.4%) due to strong market demand.`;
          aiMsg.priceData = {
            commodity: "Wheat (Lokwan Quality)",
            avgPrice: 2450,
            highestPrice: 2620,
            lowestPrice: 2280,
            mandiName: "Lasalgaon Mandi",
            distance: "22 km",
            date: "Today",
            trend: "up",
            trendPercent: 2.4,
            historicalPrices: [2350, 2380, 2400, 2420, 2450]
          };
        }
      } else {
        // General text fallback
        aiMsg.content = `I am Kisan Sahayak, your AI agronomy assistant. \n\nI can help you with:\n1. **Crop Disease Diagnosis**: Upload a photo of an infected leaf (e.g. Tomato, Mango, Wheat).\n2. **Farming Weather Advice**: Ask about local weather forecasts and if it's safe to irrigate or spray.\n3. **Mandi Market Rates**: Ask for commodity prices (e.g. "Wheat prices" or "Onion rates") to find the best market value.\n\nWhat farming query do you have today?`;
      }

      // Add AI reply to message log
      setRecentChats(prev => prev.map(chat => {
        if (chat.id === currentChatId) {
          return {
            ...chat,
            messages: [...chat.messages, aiMsg]
          };
        }
        return chat;
      }));

      setIsLoading(false);
    }, 2000);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-dark-bg text-slate-100 relative">
      
      {/* Sidebar Panel */}
      <Sidebar 
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        recentChats={recentChats}
        activeChatId={activeChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative">
        
        {/* Top Navbar */}
        <header className="h-16 border-b border-white/10 flex items-center justify-between px-4 bg-[#0a0f1d]/80 backdrop-blur-md z-30 shrink-0">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-lg border border-white/10 hover:border-emerald-500/30 bg-slate-900/60 text-slate-300 hover:text-white"
                title="Expand Sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h1 className="text-sm font-extrabold text-white tracking-wide font-display">
                {activeChat ? activeChat.title : 'New Agronomy Session'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Quick Toggle for leaf analysis panel */}
            <button
              onClick={() => setShowImageUploader(!showImageUploader)}
              className={`text-xs px-3 py-1.5 rounded-lg border font-bold flex items-center gap-1.5 transition-all ${
                showImageUploader
                  ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-950/20'
                  : 'bg-slate-900/80 border-white/5 hover:border-emerald-500/30 text-slate-300 hover:text-white'
              }`}
            >
              <Leaf className="w-3.5 h-3.5" />
              <span>Diagnose Leaf</span>
            </button>
          </div>
        </header>

        {/* Content pane: Chat message feed OR Image Uploader overlay */}
        <div className="flex-1 overflow-hidden flex flex-col relative">
          
          {showImageUploader ? (
            <div className="flex-1 flex items-center justify-center p-6 bg-slate-950/30">
              <div className="w-full max-w-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" /> Leaf Analysis Center
                  </h3>
                  <button 
                    onClick={() => setShowImageUploader(false)}
                    className="text-xs text-slate-400 hover:text-white underline"
                  >
                    Back to chat
                  </button>
                </div>
                <ImageUploader 
                  onImageSelect={handleImageSelect}
                  selectedImage={imageAttachment}
                  onClearImage={handleClearImage}
                />
              </div>
            </div>
          ) : (
            <ChatWindow 
              messages={activeMessages}
              isLoading={isLoading}
              onSelectQuickAction={handleSelectQuickAction}
            />
          )}

        </div>

        {/* Bottom Input Area */}
        <div className="shrink-0">
          <PromptInput 
            value={inputText}
            onChange={setInputText}
            onSubmit={handleSend}
            onImageClick={handleImageSelect}
            imageAttachment={imageAttachment}
            onClearImage={handleClearImage}
          />
        </div>

      </div>

    </div>
  );
};

export default ChatPage;
