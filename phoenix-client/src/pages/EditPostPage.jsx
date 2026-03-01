import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client';
import useAuthStore from '../store/authStore';
import MDEditor from '@uiw/react-md-editor';

export default function EditPostPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPremium, setIsPremium] = useState(false);
  const [price, setPrice] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [post, setPost] = useState(null);
  const [postStatus, setPostStatus] = useState('PUBLISHED');

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

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true);
        const response = await client.get(`/api/posts/${id}`);
        const postData = response.data.data;
        if (postData.authorEmail !== user?.email) {
          navigate(`/posts/${id}`);
          return;
        }
        setPost(postData);
        setTitle(postData.title);
        setIsPremium(postData.isPremium || false);
        setPrice(postData.price ? (postData.price / 100).toString() : '');
        setTags(postData.tags || []);
        setPostStatus(postData.status || 'PUBLISHED');
        setContent(postData.content || '');
      } catch {
        setError('Failed to load post');
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [id, user?.email, navigate]);

  const handleSave = async (saveAsDraft = false) => {
    if (!title.trim() || !content.trim()) { setError('Title and content are required'); return; }
    try {
      setSubmitting(true);
      setError('');
      const priceInPaise = isPremium ? Math.round(parseFloat(price || '0') * 100) : 0;
      await client.put(`/api/posts/${id}`, { title, content, isPremium, price: priceInPaise, tags, saveAsDraft });
      navigate(`/posts/${id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update post');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSave(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-slate-950 gap-3">
        <div className="w-8 h-8 border-2 border-gray-200 dark:border-slate-700 border-t-green-600 rounded-full animate-spin"></div>
        <p className="text-sm text-gray-500 dark:text-slate-400">Loading post...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-slate-950 gap-4">
        <p className="text-gray-600 dark:text-slate-400">Post not found or access denied</p>
        <button onClick={() => navigate('/')} className="text-sm text-green-600 dark:text-green-400 hover:underline font-medium">Back to Home</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => navigate(`/posts/${id}`)}
          className="mb-6 flex items-center gap-1.5 text-sm text-gray-500 dark:text-slate-400 hover:text-green-600 dark:hover:text-green-400 font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </button>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Post</h1>
            {postStatus === 'DRAFT' && (
              <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-semibold rounded-full border border-amber-200 dark:border-amber-700/50">
                Draft
              </span>
            )}
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-xl mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Post Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter post title..."
                className="w-full px-4 py-3 text-sm border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 rounded-xl focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 dark:focus:ring-green-900/20 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Post Content</label>
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

            <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full hover:bg-gray-700 dark:hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/40 dark:border-gray-900/40 border-t-white dark:border-t-gray-900 rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    {postStatus === 'DRAFT' ? 'Publish Now' : 'Save Changes'}
                  </>
                )}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSave(true)}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold border border-amber-300 dark:border-amber-600 text-amber-700 dark:text-amber-400 rounded-full hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                Save Draft
              </button>
              <button
                type="button"
                onClick={() => navigate(`/posts/${id}`)}
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
