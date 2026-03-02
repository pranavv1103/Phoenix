import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import client from '../api/client';
import { formatRelativeTime } from '../utils/dateUtils';
import useAuthStore from '../store/authStore';

export default function SeriesPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [series, setSeries] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteMode, setDeleteMode] = useState(null); // 'series-only' | 'series-and-posts'
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [seriesRes, postsRes] = await Promise.all([
          client.get(`/api/series/${id}`),
          client.get(`/api/series/${id}/posts`),
        ]);
        setSeries(seriesRes.data.data);
        setPosts(postsRes.data.data || []);
      } catch {
        setError('Failed to load series');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-slate-950 gap-3">
        <div className="w-8 h-8 border-2 border-gray-200 dark:border-slate-700 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-sm text-gray-500 dark:text-slate-400">Loading series...</p>
      </div>
    );
  }

  if (error || !series) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-slate-950 gap-4">
        <p className="text-gray-600 dark:text-slate-400">{error || 'Series not found'}</p>
        <button onClick={() => navigate('/')} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium">Back to Home</button>
      </div>
    );
  }

  const isOwner = user?.email === series.authorEmail;

  const handleDelete = async () => {
    if (!deleteMode) return;
    setDeleting(true);
    try {
      const deletePosts = deleteMode === 'series-and-posts';
      await client.delete(`/api/series/${id}?deletePosts=${deletePosts}`);
      navigate('/', { replace: true });
    } catch {
      setDeleting(false);
      setShowDeleteModal(false);
      alert('Failed to delete series. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-1.5 text-sm text-gray-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </button>

        {/* Series header */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm p-6 sm:p-8 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-full border border-indigo-200 dark:border-indigo-700/50 uppercase tracking-wide">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Series
              </span>
            </div>
            {isOwner && (
              <button
                onClick={() => { setDeleteMode(null); setShowDeleteModal(true); }}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800/50 rounded-lg transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete Series
              </button>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">{series.name}</h1>
          {series.description && (
            <p className="text-gray-500 dark:text-slate-400 text-sm mb-4">{series.description}</p>
          )}
          <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-slate-500">
            <span>By {series.authorName}</span>
            <span>·</span>
            <span>{series.postCount} {series.postCount === 1 ? 'post' : 'posts'}</span>
          </div>
        </div>

        {/* Posts list */}
        <div className="space-y-3">
          {posts.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-8 text-center">
              <p className="text-gray-500 dark:text-slate-400 text-sm">No posts in this series yet.</p>
            </div>
          ) : (
            posts.map((post, idx) => (
              <Link
                key={post.id}
                to={`/posts/${post.id}`}
                className="flex items-start gap-4 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm p-5 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors group"
              >
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm border border-indigo-200 dark:border-indigo-700/50">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2 mb-1">
                    {post.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-slate-500">
                    <span>{post.readingTimeMinutes || 1} min read</span>
                    <span>·</span>
                    <span>{formatRelativeTime(post.createdAt)}</span>
                    {post.isPremium && (
                      <>
                        <span>·</span>
                        <span className="text-amber-600 dark:text-amber-400 font-semibold">Premium</span>
                      </>
                    )}
                  </div>
                </div>
                <svg className="w-4 h-4 text-gray-300 dark:text-slate-600 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 flex-shrink-0 mt-0.5 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-2xl p-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
              <svg className="w-4.5 h-4.5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{width:'18px',height:'18px'}}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Delete Series</h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-5 ml-12">
            Choose how you want to delete <span className="font-semibold text-gray-700 dark:text-slate-300">&ldquo;{series.name}&rdquo;</span>.
          </p>

          <div className="space-y-3 mb-6">
            {/* Option 1: series only */}
            <button
              onClick={() => setDeleteMode('series-only')}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                deleteMode === 'series-only'
                  ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                  : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 bg-gray-50 dark:bg-slate-800/50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                  deleteMode === 'series-only' ? 'border-amber-500 bg-amber-500' : 'border-gray-300 dark:border-slate-600'
                }`}>
                  {deleteMode === 'series-only' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <p className="font-semibold text-sm text-gray-900 dark:text-white">Delete series only</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                    Removes the series grouping. All {posts.length} {posts.length === 1 ? 'post' : 'posts'} are kept as standalone posts.
                  </p>
                </div>
              </div>
            </button>

            {/* Option 2: series + posts */}
            <button
              onClick={() => setDeleteMode('series-and-posts')}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                deleteMode === 'series-and-posts'
                  ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                  : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 bg-gray-50 dark:bg-slate-800/50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                  deleteMode === 'series-and-posts' ? 'border-red-500 bg-red-500' : 'border-gray-300 dark:border-slate-600'
                }`}>
                  {deleteMode === 'series-and-posts' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <p className="font-semibold text-sm text-gray-900 dark:text-white">Delete series and all posts</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                    Permanently deletes the series <span className="font-medium text-red-500 dark:text-red-400">and all {posts.length} {posts.length === 1 ? 'post' : 'posts'}</span> in it. This cannot be undone.
                  </p>
                </div>
              </div>
            </button>
          </div>

          <div className="flex items-center gap-3 justify-end">
            <button
              onClick={() => { setShowDeleteModal(false); setDeleteMode(null); }}
              disabled={deleting}
              className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={!deleteMode || deleting}
              className={`px-5 py-2 text-sm font-semibold rounded-lg text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                deleteMode === 'series-and-posts'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-amber-500 hover:bg-amber-600'
              }`}
            >
              {deleting ? (
                <span className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Deleting…
                </span>
              ) : deleteMode === 'series-and-posts' ? 'Delete Series & Posts' : deleteMode === 'series-only' ? 'Delete Series Only' : 'Select an option'}
            </button>
          </div>
        </div>
      </div>
    )}
    </div>
  );
}
