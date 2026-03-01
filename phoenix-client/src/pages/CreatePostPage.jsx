import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import MDEditor from '@uiw/react-md-editor';

const AUTOSAVE_KEY = 'phoenix_create_post_autosave';
const AUTOSAVE_INTERVAL = 30000; // 30 seconds

export default function CreatePostPage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPremium, setIsPremium] = useState(false);
  const [price, setPrice] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [autoSaveStatus, setAutoSaveStatus] = useState(''); // '', 'saving', 'saved'
  const [lastSaved, setLastSaved] = useState(null);
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);
  const navigate = useNavigate();
  const autoSaveTimer = useRef(null);
  const hasUnsavedChanges = useRef(false);

  // Auto-save to localStorage
  const autoSave = useCallback(() => {
    if (!title && !content && tags.length === 0) return;
    
    setAutoSaveStatus('saving');
    const data = { title, content, isPremium, price, tags, timestamp: Date.now() };
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(data));
    setLastSaved(new Date());
    setAutoSaveStatus('saved');
    hasUnsavedChanges.current = false;
    
    setTimeout(() => setAutoSaveStatus(''), 2000);
  }, [title, content, isPremium, price, tags]);

  // Restore from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(AUTOSAVE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        const ageMinutes = (Date.now() - data.timestamp) / 1000 / 60;
        if (ageMinutes < 60) { // Only restore if less than 1 hour old
          setShowRestorePrompt(true);
        }
      } catch (e) {
        localStorage.removeItem(AUTOSAVE_KEY);
      }
    }
  }, []);

  const restoreAutoSave = () => {
    const saved = localStorage.getItem(AUTOSAVE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      setTitle(data.title || '');
      setContent(data.content || '');
      setIsPremium(data.isPremium || false);
      setPrice(data.price || '');
      setTags(data.tags || []);
      setLastSaved(new Date(data.timestamp));
    }
    setShowRestorePrompt(false);
  };

  const dismissRestore = () => {
    localStorage.removeItem(AUTOSAVE_KEY);
    setShowRestorePrompt(false);
  };

  // Setup auto-save interval
  useEffect(() => {
    if (hasUnsavedChanges.current) {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => autoSave(), AUTOSAVE_INTERVAL);
    }
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [title, content, isPremium, price, tags, autoSave]);

  // Track changes
  useEffect(() => {
    hasUnsavedChanges.current = true;
  }, [title, content, isPremium, price, tags]);

  const addTag = (raw) => {
    const tag = raw.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (tag && tags.length < 5 && !tags.includes(tag)) {
      setTags(prev => [...prev, tag]);
    }
    setTagInput('');
  };

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      setTags(prev => prev.slice(0, -1));
    }
  };

  const removeTag = (tag) => setTags(prev => prev.filter(t => t !== tag));

  const handleSave = async (saveAsDraft = false) => {
    setError('');
    setLoading(true);
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required');
      setLoading(false);
      return;
    }
    try {
      const priceInPaise = isPremium ? Math.round(parseFloat(price || '0') * 100) : 0;
      const response = await client.post('/api/posts', { title, content, isPremium, price: priceInPaise, tags, saveAsDraft });
      localStorage.removeItem(AUTOSAVE_KEY); // Clear auto-save on success
      navigate(`/posts/${response.data.data.id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSave(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Create New Post</h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Share your thoughts with the community</p>
            </div>
            {/* Auto-save status indicator */}
            {autoSaveStatus && (
              <div className="flex items-center gap-2 text-xs">
                {autoSaveStatus === 'saving' ? (
                  <>
                    <div className="w-3 h-3 border-2 border-green-200 dark:border-green-800 border-t-green-600 dark:border-t-green-400 rounded-full animate-spin" />
                    <span className="text-gray-500 dark:text-slate-400">Saving...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-500 dark:text-slate-400">
                      Saved {lastSaved && lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Restore prompt */}
        {showRestorePrompt && (
          <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex gap-3">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">Unsaved changes detected</p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">We found a draft you were working on. Would you like to restore it?</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={restoreAutoSave} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors">
                  Restore
                </button>
                <button onClick={dismissRestore} className="px-3 py-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-xs font-semibold transition-colors">
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm p-6 sm:p-8">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-xl mb-6 text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 text-sm border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 rounded-xl focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 dark:focus:ring-green-900/20 transition-all"
                placeholder="Enter an engaging title..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Content</label>
              <div data-color-mode="auto">
                <MDEditor value={content} onChange={setContent} height={400} preview="live" className="rounded-xl overflow-hidden" />
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                Tags
                <span className="ml-2 font-normal text-gray-400 dark:text-slate-500 text-xs">(up to 5 — press Enter or comma to add)</span>
              </label>
              <div className="flex flex-wrap gap-2 p-3 border border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-800 focus-within:border-green-500 focus-within:ring-2 focus-within:ring-green-100 dark:focus-within:ring-green-900/20 transition-all min-h-[50px]">
                {tags.map(tag => (
                  <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-full text-xs font-medium border border-gray-200 dark:border-slate-600">
                    #{tag}
                    <button type="button" onClick={() => removeTag(tag)} className="ml-0.5 text-gray-400 hover:text-red-500 transition-colors">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </span>
                ))}
                {tags.length < 5 && (
                  <input
                    type="text"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    onBlur={() => tagInput.trim() && addTag(tagInput)}
                    placeholder={tags.length === 0 ? 'e.g. javascript, webdev...' : ''}
                    className="flex-1 min-w-[120px] outline-none bg-transparent text-sm text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500"
                  />
                )}
              </div>
            </div>

            {/* Premium Post Toggle */}
            <div className="p-5 bg-amber-50 dark:bg-slate-800 rounded-2xl border border-amber-200 dark:border-amber-700/50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  <label className="text-sm font-semibold text-gray-800 dark:text-slate-200">Premium Post</label>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPremium(!isPremium)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isPremium ? 'bg-amber-500' : 'bg-gray-300 dark:bg-slate-600'}`}
                  aria-label="Toggle premium"
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isPremium ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">Charge readers to unlock the full content of this post.</p>
              {isPremium && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Price (₹ in INR)</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-36 px-3 py-2 text-sm border border-amber-300 dark:border-amber-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-amber-500 transition-all"
                    placeholder="e.g. 99"
                    required={isPremium}
                  />
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full hover:bg-gray-700 dark:hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/40 dark:border-gray-900/40 border-t-white dark:border-t-gray-900 rounded-full animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Publish Post
                  </>
                )}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleSave(true)}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 rounded-full hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                Save Draft
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="px-5 py-2.5 text-sm font-semibold text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
