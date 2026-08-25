import { useState, useRef, useEffect } from 'react';
import client from '../api/client';

const SUGGESTIONS = [
  'Write a blog post introduction about React hooks',
  'Help me improve this paragraph: [paste your text]',
  'Generate 5 blog post title ideas about web development',
  'Explain the difference between REST and GraphQL for a blog',
  'Write a conclusion for a post about machine learning',
];

function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-sm font-bold mr-2 flex-shrink-0 mt-1">
          AI
        </div>
      )}
      <div
        className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-orange-500 text-white rounded-tr-sm'
            : 'bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 border border-gray-200 dark:border-slate-700 rounded-tl-sm shadow-sm'
        }`}
      >
        {message.content}
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-slate-600 flex items-center justify-center text-gray-700 dark:text-slate-200 text-sm font-bold ml-2 flex-shrink-0 mt-1">
          You
        </div>
      )}
    </div>
  );
}

export default function AiAssistantPage() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        "Hi! I'm Phoenix AI, your writing assistant. I can help you write blog posts, generate ideas, improve your content, explain concepts, and much more. What would you like to work on today?",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    const userText = (text || input).trim();
    if (!userText || loading) return;

    const userMessage = { role: 'user', content: userText };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    const history = newMessages.slice(1, -1).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const { data } = await client.post('/api/ai/chat', {
        message: userText,
        history,
      });
      const reply = data.data?.reply || 'No response received.';
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      const errMsg =
        err.response?.data?.message ||
        'Something went wrong. Please try again.';
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `⚠️ ${errMsg}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content:
          "Chat cleared! I'm here to help. What would you like to work on?",
      },
    ]);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <span className="text-orange-500">✦</span> Phoenix AI Assistant
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            Your intelligent writing companion — generate, analyze, and improve blog content
          </p>
        </div>
        <button
          onClick={clearChat}
          className="text-sm text-gray-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 hover:border-red-300 dark:hover:border-red-700"
        >
          Clear chat
        </button>
      </div>

      {/* Suggestions (only shown when just the welcome message is present) */}
      {messages.length === 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => sendMessage(suggestion)}
              className="text-xs px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-full text-gray-600 dark:text-slate-300 hover:border-orange-400 hover:text-orange-600 dark:hover:border-orange-500 dark:hover:text-orange-400 transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto rounded-2xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-4">
        {messages.map((msg, idx) => (
          <MessageBubble key={idx} message={msg} />
        ))}
        {loading && (
          <div className="flex justify-start mb-4">
            <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-sm font-bold mr-2 flex-shrink-0 mt-1">
              AI
            </div>
            <div
              role="status"
              aria-live="polite"
              className="px-4 py-3 rounded-2xl rounded-tl-sm bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm"
            >
              <span className="sr-only">AI is typing…</span>
              <div className="flex gap-1 items-center h-4" aria-hidden="true">
                <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="mt-3 flex gap-2 items-end">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything — write a post, improve content, generate ideas…"
            rows={1}
            disabled={loading}
            className="w-full resize-none rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent placeholder-gray-400 dark:placeholder-slate-500 disabled:opacity-60 overflow-hidden"
            style={{ minHeight: '48px', maxHeight: '160px' }}
            onInput={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
            }}
          />
        </div>
        <button
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          className="h-12 w-12 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 dark:disabled:bg-slate-700 text-white flex items-center justify-center transition-colors flex-shrink-0"
          aria-label="Send message"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
          </svg>
        </button>
      </div>
      <p className="text-center text-xs text-gray-400 dark:text-slate-600 mt-2">
        Press Enter to send · Shift+Enter for new line
      </p>
    </div>
  );
}
