import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import MDEditor from '@uiw/react-md-editor';

export default function CreatePostPage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPremium, setIsPremium] = useState(false);
  const [price, setPrice] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!title.trim() || !content.trim()) {
      setError('Title and content are required');
      setLoading(false);
      return;
    }

    try {
      const priceInPaise = isPremium ? Math.round(parseFloat(price || '0') * 100) : 0;
      const response = await client.post('/api/posts', { title, content, isPremium, price: priceInPaise, tags });
      navigate(`/posts/${response.data.data.id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 bg-gradient-to-br from-rose-50 via-orange-50 via-amber-50 to-yellow-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 py-12 px-4">
      <div className="max-w-4xl mx-auto animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-gradient-to-br from-orange-600 via-rose-600 to-pink-600 rounded-3xl mb-4 shadow-xl">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-orange-600 via-rose-600 to-pink-600 bg-clip-text text-transparent mb-2">
            Create New Post
          </h1>
          <p className="text-gray-700 dark:text-slate-300 text-lg font-medium">Share your thoughts with the community</p>
        </div>

        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl p-10 rounded-3xl shadow-2xl border border-white/50 dark:border-slate-700/50">
          {error && (
            <div className="bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border-l-4 border-rose-500 dark:border-rose-600 text-rose-700 dark:text-rose-400 p-4 rounded-xl mb-6 animate-shake shadow-sm">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="transform transition-all duration-300 hover:scale-[1.01]">
              <label className="block text-gray-700 dark:text-slate-300 mb-2 font-semibold text-lg">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:focus:ring-orange-900/40 transition-all duration-300 text-lg"
                placeholder="Enter an engaging title..."
                required
              />
            </div>
            <div className="transform transition-all duration-300 hover:scale-[1.01]">
              <label className="block text-gray-700 dark:text-slate-300 mb-2 font-semibold text-lg">Content</label>
              <div data-color-mode="auto">
                <MDEditor
                  value={content}
                  onChange={setContent}
                  height={400}
                  preview="live"
                  className="rounded-xl overflow-hidden"
                />
              </div>
            </div>

            {/* Tags */}
            <div className="transform transition-all duration-300 hover:scale-[1.01]">
              <label className="block text-gray-700 dark:text-slate-300 mb-2 font-semibold text-lg">
                Tags
                <span className="ml-2 text-sm font-normal text-gray-500 dark:text-slate-400">(up to 5 — press Enter or comma to add)</span>
              </label>
              <div className="flex flex-wrap gap-2 p-3 border-2 border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-700 focus-within:border-orange-500 focus-within:ring-4 focus-within:ring-orange-100 dark:focus-within:ring-orange-900/40 transition-all duration-300 min-h-[52px]">
                {tags.map(tag => (
                  <span key={tag} className="inline-flex items-center gap-1 px-3 py-1 bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 rounded-full text-sm font-semibold border border-violet-300 dark:border-violet-700">
                    #{tag}
                    <button type="button" onClick={() => removeTag(tag)} className="ml-0.5 hover:text-red-500 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
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
                    className="flex-1 min-w-[120px] outline-none bg-transparent text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 text-sm"
                  />
                )}
              </div>
            </div>

            {/* Premium Post Toggle */}
            <div className="p-5 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-slate-700/60 dark:to-slate-700/40 rounded-2xl border-2 border-amber-200 dark:border-amber-700/50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  <label className="text-gray-800 dark:text-slate-200 font-semibold text-lg">Premium Post</label>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPremium(!isPremium)}
                  className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none ${isPremium ? 'bg-amber-500' : 'bg-gray-300 dark:bg-slate-600'}`}
                  aria-label="Toggle premium"
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ${isPremium ? 'translate-x-8' : 'translate-x-1'}`} />
                </button>
              </div>
              <p className="text-sm text-gray-600 dark:text-slate-400 mb-3">Charge readers to unlock the full content of this post.</p>
              {isPremium && (
                <div>
                  <label className="block text-gray-700 dark:text-slate-300 mb-1 font-semibold">Price (₹ in INR)</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-48 px-4 py-2 border-2 border-amber-300 dark:border-amber-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100 dark:focus:ring-amber-900/40 transition-all duration-300"
                    placeholder="e.g. 99"
                    required={isPremium}
                  />
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-orange-600 via-rose-600 to-pink-600 text-white py-4 rounded-xl hover:from-orange-700 hover:via-rose-700 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-500 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-2xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Publishing...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Publish Post
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="px-8 py-3 border-2 border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-all duration-300 font-semibold"
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
