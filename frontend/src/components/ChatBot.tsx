"use client";

import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Loader2 } from 'lucide-react';
import { useAppStore } from '../context/store';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const WELCOME_MESSAGE: Message = {
  role: 'assistant',
  content: "Hi! I'm your LabelCheck AI assistant 👋\n\nI can help you understand compliance results, explain Legal Metrology rules, and answer any questions about your product labels. What would you like to know?"
};

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scans = useAppStore(state => state.scans);

  // Get the latest scan result for context
  const latestScan = scans?.[0] ?? null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMessage: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/chat/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          scan_context: latestScan ? {
            product_name: latestScan.product || '',
            status: latestScan.status || '',
            score: latestScan.score || 0,
            violations: latestScan.violations || [],
            warnings: latestScan.warnings || [],
          } : null,
          history: messages.slice(-6).map(m => ({ role: m.role, content: m.content }))
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');
      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Sorry, I couldn't connect right now. Please try again in a moment."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating Bubble */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-20 right-5 sm:bottom-8 sm:right-8 z-50 w-14 h-14 bg-gray-900 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-black transition-all hover:scale-110 active:scale-95 ${isOpen ? 'hidden' : 'flex'}`}
        aria-label="Open compliance assistant"
      >
        <MessageCircle className="w-6 h-6" />
        <span className="absolute top-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 sm:bottom-8 sm:right-8 z-50 w-[calc(100vw-2rem)] max-w-sm h-[520px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-sm">LabelCheck AI</p>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                  <p className="text-xs text-gray-300">Compliance Assistant</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
              aria-label="Close chat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center shrink-0 mt-1">
                    <Bot className="w-3 h-3" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-gray-900 text-white rounded-br-sm'
                      : 'bg-white text-gray-900 border border-gray-200 rounded-bl-sm shadow-sm'
                  }`}
                >
                  {msg.content}
                </div>
                {msg.role === 'user' && (
                  <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center shrink-0 mt-1">
                    <User className="w-3 h-3 text-gray-600" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2 justify-start">
                <div className="w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center shrink-0 mt-1">
                  <Bot className="w-3 h-3" />
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                  <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Questions */}
          {messages.length === 1 && (
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex gap-2 overflow-x-auto shrink-0">
              {['What is MRP?', 'Why did my scan fail?', 'What are the mandatory fields?'].map(q => (
                <button
                  key={q}
                  onClick={() => { setInput(q); inputRef.current?.focus(); }}
                  className="whitespace-nowrap text-xs bg-white border border-gray-200 text-gray-700 px-3 py-1.5 rounded-full hover:bg-gray-50 transition-colors shrink-0"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-3 py-3 border-t border-gray-200 bg-white flex gap-2 items-center shrink-0">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about compliance..."
              className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="w-9 h-9 bg-gray-900 text-white rounded-xl flex items-center justify-center hover:bg-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
