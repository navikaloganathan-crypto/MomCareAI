import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Send, Trash2, Heart, AlertTriangle, Moon, Droplets, Activity, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 animate-message-in" data-testid="typing-indicator">
      <div className="w-8 h-8 rounded-full bg-[#F4AAB9]/20 flex items-center justify-center flex-shrink-0">
        <Heart className="w-4 h-4 text-[#F4AAB9]" strokeWidth={2} />
      </div>
      <div className="bg-white border border-[#F4AAB9]/15 rounded-2xl rounded-bl-md px-5 py-3 shadow-sm">
        <div className="flex gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#F4AAB9]/60 typing-dot" />
          <div className="w-2 h-2 rounded-full bg-[#F4AAB9]/60 typing-dot" />
          <div className="w-2 h-2 rounded-full bg-[#F4AAB9]/60 typing-dot" />
        </div>
      </div>
    </div>
  );
}

function ChatBubble({ message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex items-end gap-2 animate-message-in ${isUser ? "flex-row-reverse" : ""}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-[#F4AAB9]/20 flex items-center justify-center flex-shrink-0">
          <Heart className="w-4 h-4 text-[#F4AAB9]" strokeWidth={2} />
        </div>
      )}
      <div className={`max-w-[75%] ${isUser ? "ml-auto" : ""}`}>
        <div
          className={`px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? "bg-[#F4AAB9] text-[#2C2A29] rounded-2xl rounded-br-md"
              : "bg-white border border-[#F4AAB9]/15 text-[#2C2A29] rounded-2xl rounded-bl-md shadow-sm"
          }`}
          data-testid={isUser ? "user-message" : "ai-message"}
        >
          {message.content}
        </div>

        {/* Extracted data badges */}
        {message.extracted_data && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {message.extracted_data.symptoms?.map((s) => (
              <Badge key={s} variant="outline" className="text-xs border-[#E07A5F]/30 text-[#E07A5F] bg-[#E07A5F]/5 rounded-full">
                <Activity className="w-3 h-3 mr-1" />{s}
              </Badge>
            ))}
            {message.extracted_data.mood?.map((m) => (
              <Badge key={m} variant="outline" className="text-xs border-[#9CB4D4]/30 text-[#5C5A59] bg-[#9CB4D4]/10 rounded-full">
                {m}
              </Badge>
            ))}
            {message.extracted_data.sleep_hours != null && (
              <Badge variant="outline" className="text-xs border-[#A8C3A6]/30 text-[#5C5A59] bg-[#A8C3A6]/10 rounded-full">
                <Moon className="w-3 h-3 mr-1" />{message.extracted_data.sleep_hours}h sleep
              </Badge>
            )}
            {message.extracted_data.water_intake != null && (
              <Badge variant="outline" className="text-xs border-[#9CB4D4]/30 text-[#5C5A59] bg-[#9CB4D4]/10 rounded-full">
                <Droplets className="w-3 h-3 mr-1" />{message.extracted_data.water_intake} glasses
              </Badge>
            )}
          </div>
        )}

        <p className="text-[10px] text-[#8A8887] mt-1 px-1">
          {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [warning, setWarning] = useState(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      const scrollEl = scrollRef.current.querySelector("[data-radix-scroll-area-viewport]");
      if (scrollEl) {
        scrollEl.scrollTop = scrollEl.scrollHeight;
      }
    }
  };

  const loadHistory = async () => {
    try {
      const res = await axios.get(`${API}/chat/history`);
      setMessages(res.data.messages || []);
    } catch (e) {
      console.error("Failed to load history", e);
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setWarning(null);

    // Optimistic user message
    const userMsg = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await axios.post(`${API}/chat`, { message: text });
      const { reply, extracted_data, high_risk_warning } = res.data;

      if (high_risk_warning) setWarning(high_risk_warning);

      // Update user message with extracted data
      setMessages((prev) => {
        const updated = [...prev];
        const lastUserIdx = updated.findLastIndex((m) => m.id === userMsg.id);
        if (lastUserIdx !== -1) {
          updated[lastUserIdx] = { ...updated[lastUserIdx], extracted_data };
        }
        return [
          ...updated,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: reply,
            timestamp: new Date().toISOString(),
          },
        ];
      });
    } catch (e) {
      console.error("Chat error", e);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "I'm having trouble responding right now. Please try again in a moment.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const clearChat = async () => {
    try {
      await axios.delete(`${API}/chat/history`);
      setMessages([]);
      setWarning(null);
    } catch (e) {
      console.error("Failed to clear", e);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickPrompts = [
    "I have a headache and slept only 4 hours",
    "I'm feeling stressed and anxious today",
    "I drank 3 glasses of water and feel tired",
    "I have back pain and nausea",
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#F4AAB9]/15 bg-white/60 backdrop-blur-md">
        <div>
          <h2 className="text-lg font-medium text-[#2C2A29]" style={{ fontFamily: 'Outfit, sans-serif' }} data-testid="chat-header">
            Chat with MomCareAI
          </h2>
          <p className="text-xs text-[#8A8887]">Share how you're feeling today</p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={clearChat}
                className="hover:bg-[#E07A5F]/10 hover:text-[#E07A5F]"
                data-testid="clear-chat-button"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Clear chat</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Warning banner */}
      {warning && (
        <div className="flex items-center gap-2 px-6 py-3 bg-[#E07A5F]/10 border-b border-[#E07A5F]/20 animate-fade-in" data-testid="high-risk-warning">
          <AlertTriangle className="w-4 h-4 text-[#E07A5F] flex-shrink-0" />
          <p className="text-sm text-[#E07A5F]">{warning}</p>
          <Button variant="ghost" size="sm" onClick={() => setWarning(null)} className="ml-auto text-[#E07A5F] hover:bg-[#E07A5F]/10 text-xs">
            Dismiss
          </Button>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 px-6" ref={scrollRef} data-testid="chat-messages-area">
        <div className="py-6 space-y-4 max-w-2xl mx-auto">
          {messages.length === 0 && !loading && (
            <div className="text-center py-16 animate-fade-in" data-testid="chat-empty-state">
              <div className="w-16 h-16 mx-auto mb-4 rounded-3xl bg-[#F4AAB9]/15 flex items-center justify-center">
                <Heart className="w-8 h-8 text-[#F4AAB9]" strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-medium text-[#2C2A29] mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Hi there, mama!
              </h3>
              <p className="text-sm text-[#5C5A59] mb-8 max-w-sm mx-auto">
                Tell me how you're feeling today. I'll track your symptoms and help you stay on top of your health.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => { setInput(prompt); inputRef.current?.focus(); }}
                    className="text-xs px-4 py-2 rounded-full border border-[#F4AAB9]/25 text-[#5C5A59] hover:bg-[#F4AAB9]/8 hover:text-[#2C2A29] hover:border-[#F4AAB9]/40 transition-all duration-200"
                    data-testid="quick-prompt"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <ChatBubble key={msg.id} message={msg} />
          ))}

          {loading && <TypingIndicator />}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-[#F4AAB9]/15 bg-white/60 backdrop-blur-md px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tell me how you're feeling..."
              rows={1}
              className="w-full px-5 py-3 text-sm bg-white border border-[#F4AAB9]/20 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-[#F4AAB9]/30 focus:border-[#F4AAB9]/40 placeholder:text-[#8A8887] text-[#2C2A29]"
              data-testid="chat-input"
              disabled={loading}
            />
          </div>
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="h-11 w-11 rounded-full bg-[#F4AAB9] hover:bg-[#f09aad] text-white shadow-sm transition-transform duration-200 hover:-translate-y-0.5"
            data-testid="chat-send-button"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
