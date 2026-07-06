import React, { useState, useEffect } from 'react';
import { Menu, Leaf, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import PromptInput from '../components/PromptInput';
import ImageUploader from '../components/ImageUploader';

// Configurable Backend API URL from Vite environment variables (Bonus Improvement)
const API_BASE_URL = "https://kisan-sahayak-cqvu.onrender.com";

const ChatPage = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Session persistence using localStorage (Bonus Improvement)
  const [recentChats, setRecentChats] = useState(() => {
    try {
      const saved = localStorage.getItem('kisan_sahayak_chats');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to load chats from localStorage:", e);
      return [];
    }
  });

  const [activeChatId, setActiveChatId] = useState(() => {
    try {
      return localStorage.getItem('kisan_sahayak_active_chat_id') || null;
    } catch (e) {
      return null;
    }
  });

  const [inputText, setInputText] = useState('');
  const [imageAttachment, setImageAttachment] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showImageUploader, setShowImageUploader] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [failedRequest, setFailedRequest] = useState(null);

  // Auto-persist chats and active session ID on change
  useEffect(() => {
    try {
      localStorage.setItem('kisan_sahayak_chats', JSON.stringify(recentChats));
    } catch (e) {
      console.error("Failed to save chats to localStorage:", e);
    }
  }, [recentChats]);

  useEffect(() => {
    try {
      if (activeChatId) {
        localStorage.setItem('kisan_sahayak_active_chat_id', activeChatId);
      } else {
        localStorage.removeItem('kisan_sahayak_active_chat_id');
      }
    } catch (e) {
      console.error("Failed to save activeChatId to localStorage:", e);
    }
  }, [activeChatId]);

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
    setErrorMessage(null);
    setFailedRequest(null);
  };

  const handleSelectChat = (id) => {
    setActiveChatId(id);
    setShowImageUploader(false);
    setErrorMessage(null);
    setFailedRequest(null);
  };

  const handleImageSelect = (imgObj) => {
    setImageAttachment(imgObj);
    setShowImageUploader(false);
  };

  const handleClearImage = () => {
    setImageAttachment(null);
  };

  // Helper function to generate unique session IDs
  const generateSessionId = () => {
    return 'session_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
  };

  // Centralized API Service Layer (Bonus Improvement)
  const callApi = async (endpoint, options = {}, timeout = 60000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(id);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const errorMsg = errData.detail || `Server returned status ${response.status}`;
        const err = new Error(errorMsg);
        err.status = response.status;
        throw err;
      }

      return await response.json();
    } catch (error) {
      clearTimeout(id);
      throw error;
    }
  };

  // Core submission execution logic (Requirement 1 & 2)
  const executeMessageRequest = async (currentChatId, userMessageText, attachedImg) => {
    setIsLoading(true);
    setErrorMessage(null);

    // Save request parameters to state for retry functionality (Better Chat Experience)
    setFailedRequest({ chatId: currentChatId, text: userMessageText, attachedImg });

    try {
      if (!navigator.onLine) {
        throw new Error("No internet connection detected. Please check your network.");
      }

      let responseJson;
      if (attachedImg) {
        // Build multipart/form-data payload (Requirement 2)
        const formData = new FormData();
        formData.append('file', attachedImg.file);
        if (userMessageText) {
          formData.append('message', userMessageText);
        }
        formData.append('session_id', currentChatId);
        formData.append('user_id', 'default_user');

        responseJson = await callApi('/analyze-image', {
          method: 'POST',
          body: formData
        });
      } else {
        // Build JSON payload (Requirement 2)
        responseJson = await callApi('/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: userMessageText,
            session_id: currentChatId,
            user_id: 'default_user'
          })
        });
      }

      // Future-ready structured response mapping (Requirement Future Ready)
      let weatherData = null;
      let diseaseData = null;
      let priceData = null;

      if (responseJson.type && responseJson.data) {
        if (responseJson.type === 'mandi') {
          priceData = responseJson.data;
        } else if (responseJson.type === 'weather') {
          weatherData = responseJson.data;
        } else if (responseJson.type === 'disease') {
          diseaseData = responseJson.data;
        }
      }

      const aiMsg = {
        role: 'assistant',
        content: responseJson.response || "No response content received.",
        weatherData,
        diseaseData,
        priceData
      };

      // Append assistant response to recentChats list
      setRecentChats(prev => prev.map(chat => {
        if (chat.id === currentChatId) {
          return {
            ...chat,
            messages: [...chat.messages, aiMsg]
          };
        }
        return chat;
      }));

      // Clear failed request on success
      setFailedRequest(null);
    } catch (error) {
      console.error("API Call failed:", error);
      let friendlyError = "Something went wrong. Please try again.";
      if (error.status === 429) {
        friendlyError = "Gemini API rate limit exceeded. Please try again in a few moments.";
      } else if (error.status === 500) {
        friendlyError = "Internal Server Error occurred. Please try again later.";
      } else if (error.message && error.message.includes("Failed to fetch")) {
        friendlyError = "Unable to connect to the backend server. Please verify the server is running.";
      } else if (error.message) {
        friendlyError = error.message;
      }
      setErrorMessage(friendlyError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (isLoading) return;
    if (!inputText.trim() && !imageAttachment) return;

    const userMessageText = inputText;
    const attachedImg = imageAttachment;

    // Reset inputs immediately
    setInputText('');
    setImageAttachment(null);
    setShowImageUploader(false);

    const userMsg = {
      role: 'user',
      content: userMessageText || (attachedImg ? 'Leaf image uploaded for analysis' : ''),
      imageAttachment: attachedImg
    };

    let currentChatId = activeChatId;
    let isNewChat = false;
    if (!currentChatId) {
      currentChatId = generateSessionId();
      isNewChat = true;
    }

    if (isNewChat) {
      const newChat = {
        id: currentChatId,
        title: userMessageText ? (userMessageText.length > 25 ? userMessageText.substring(0, 25) + '...' : userMessageText) : 'Leaf Image Diagnosis',
        messages: [userMsg]
      };
      setRecentChats(prev => [newChat, ...prev]);
      setActiveChatId(currentChatId);
    } else {
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

    await executeMessageRequest(currentChatId, userMessageText, attachedImg);
  };

  const handleSendWithText = async (text) => {
    if (isLoading) return;
    if (!text.trim()) return;

    const userMsg = {
      role: 'user',
      content: text,
      imageAttachment: null
    };

    let currentChatId = activeChatId;
    let isNewChat = false;
    if (!currentChatId) {
      currentChatId = generateSessionId();
      isNewChat = true;
    }

    if (isNewChat) {
      const newChat = {
        id: currentChatId,
        title: text.length > 25 ? text.substring(0, 25) + '...' : text,
        messages: [userMsg]
      };
      setRecentChats(prev => [newChat, ...prev]);
      setActiveChatId(currentChatId);
    } else {
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

    setInputText('');
    setImageAttachment(null);
    setShowImageUploader(false);

    await executeMessageRequest(currentChatId, text, null);
  };

  const handleRetry = async () => {
    if (!failedRequest || isLoading) return;
    const { chatId, text, attachedImg } = failedRequest;
    await executeMessageRequest(chatId, text, attachedImg);
  };

  const handleSelectQuickAction = (actionText) => {
    if (actionText.includes("diagnose")) {
      setInputText(actionText);
      setShowImageUploader(true);
    } else {
      handleSendWithText(actionText);
    }
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
              className={`text-xs px-3 py-1.5 rounded-lg border font-bold flex items-center gap-1.5 transition-all ${showImageUploader
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

        {/* Beautiful inline error message panel (Requirement 8) */}
        {errorMessage && (
          <div className="w-full max-w-4xl mx-auto px-4 mb-2 shrink-0">
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-300 text-xs shadow-lg shadow-rose-950/15">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4.5 h-4.5 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
              {failedRequest && (
                <button
                  onClick={handleRetry}
                  disabled={isLoading}
                  className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all text-xs flex items-center gap-1.5 shrink-0"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                  Retry
                </button>
              )}
            </div>
          </div>
        )}

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
