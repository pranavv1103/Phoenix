import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import MDEditor from '@uiw/react-md-editor';

export default function CreatePostPage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

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
      const response = await client.post('/api/posts', { title, content });
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
