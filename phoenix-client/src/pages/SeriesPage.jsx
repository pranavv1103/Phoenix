import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import client from '../api/client';
import { formatRelativeTime } from '../utils/dateUtils';

export default function SeriesPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [series, setSeries] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-full border border-indigo-200 dark:border-indigo-700/50 uppercase tracking-wide">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Series
            </span>
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
    </div>
  );
}
