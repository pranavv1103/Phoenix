import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import client from '../api/client';
import useAuthStore from '../store/authStore';
import { formatRelativeTime } from '../utils/dateUtils';

export default function HomePage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('newest');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [isFirst, setIsFirst] = useState(true);
  const [isLast, setIsLast] = useState(true);
  const searchRef = useRef(null);
  const pageSize = 6;
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const handleLike = async (e, postId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    try {
      const response = await client.post(`/api/posts/${postId}/like`);
      const { likeCount, likedByCurrentUser } = response.data.data;
      setPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, likeCount, likedByCurrentUser } : p
      ));
    } catch (err) {
      console.error('Failed to toggle like', err);
    }
  };

  // Debounce search query - wait 500ms after user stops typing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setCurrentPage(0); // Reset to first page when search changes
    }, 500);

    // Clear timeout if user types again before 500ms
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Fetch posts only when debounced query or page changes
  useEffect(() => {
    fetchPosts();
  }, [debouncedSearchQuery, currentPage, sortOption]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      let url = `/api/posts?page=${currentPage}&size=${pageSize}`;
      url += `&sort=${encodeURIComponent(sortOption)}`;
      if (debouncedSearchQuery.trim()) {
        url += `&search=${encodeURIComponent(debouncedSearchQuery.trim())}`;
      }
      const response = await client.get(url);
      const pageData = response.data.data;
      
      setPosts(pageData.content);
      setTotalPages(pageData.totalPages);
      setTotalElements(pageData.totalElements);
      setIsFirst(pageData.first);
      setIsLast(pageData.last);
      setError('');
    } catch {
      setError('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const handleNextPage = () => {
    if (!isLast) {
      setCurrentPage(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePreviousPage = () => {
    if (!isFirst) {
      setCurrentPage(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSortChange = (e) => {
    setSortOption(e.target.value);
    setCurrentPage(0);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 bg-gradient-to-br from-slate-50 via-blue-50 via-violet-50 to-fuchsia-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
      <div className="max-w-[1500px] mx-auto px-6 md:px-8 py-12">
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-block mb-6">
            <h1 className="text-6xl font-bold bg-gradient-to-r from-cyan-600 via-blue-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent mb-4 drop-shadow-sm">
              Discover Inspiring Stories
            </h1>
            <div className="h-1.5 bg-gradient-to-r from-cyan-500 via-blue-500 via-violet-500 to-fuchsia-500 rounded-full"></div>
          </div>
          <p className="text-gray-700 text-xl font-medium dark:text-slate-300">Explore thoughtful articles from our vibrant community</p>
        </div>

        <div className="max-w-4xl mx-auto mb-10">
          <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search posts by title..."
                className="w-full pl-12 pr-12 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 transition-all duration-300 bg-white shadow-md hover:shadow-lg dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100 dark:placeholder-slate-400 dark:focus:ring-violet-900/40"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors dark:text-slate-400 dark:hover:text-slate-200"
                  aria-label="Clear search"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <div className="relative">
              <select
                value={sortOption}
                onChange={handleSortChange}
                className="w-full md:w-56 px-4 py-4 border-2 border-gray-200 rounded-2xl bg-white text-gray-700 font-semibold shadow-md hover:shadow-lg focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 transition-all duration-300 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100 dark:focus:ring-violet-900/40"
                aria-label="Sort posts"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="mostLiked">Most liked</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mb-4"></div>
              <p className="text-xl text-gray-700 font-medium dark:text-slate-300">Loading amazing content...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex justify-center items-center py-20">
            <div className="text-center bg-white p-8 rounded-2xl shadow-xl dark:bg-slate-900 dark:shadow-black/40">
              <div className="text-6xl mb-4">😕</div>
              <div className="text-xl text-red-600 font-semibold dark:text-red-400">{error}</div>
            </div>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 animate-fade-in">
            <div className="inline-block p-8 bg-gradient-to-br from-blue-100 to-violet-100 rounded-3xl shadow-xl mb-6 dark:from-slate-800 dark:to-slate-900">
              <div className="text-8xl mb-4">{searchQuery ? '🔍' : '📝'}</div>
            </div>
            <p className="text-3xl font-bold text-gray-800 mb-3 dark:text-slate-100">
              {searchQuery ? 'No posts found' : 'No posts yet'}
            </p>
            <p className="text-gray-600 text-lg mb-6 dark:text-slate-400">
              {searchQuery 
                ? `No results for "${searchQuery}". Try a different search term.`
                : 'Be the first to share your story!'
              }
            </p>
            {!searchQuery && (
              <Link 
                to="/create" 
                className="inline-flex items-center gap-2 px-10 py-4 bg-gradient-to-r from-cyan-600 via-blue-600 to-violet-600 text-white rounded-2xl hover:scale-105 transform transition-all duration-300 shadow-xl hover:shadow-2xl font-bold text-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create First Post
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-10 md:grid-cols-2 xl:grid-cols-3">
            {posts.map((post, index) => {
              const gradients = [
                'from-cyan-500 via-blue-500 to-violet-500',
                'from-emerald-500 via-teal-500 to-cyan-500',
                'from-violet-500 via-purple-500 to-fuchsia-500',
                'from-orange-500 via-rose-500 to-pink-500',
                'from-blue-500 via-indigo-500 to-purple-500',
                'from-teal-500 via-emerald-500 to-green-500',
              ];
              const gradient = gradients[index % gradients.length];
              
              const bgGradients = [
                'from-cyan-50 to-blue-50',
                'from-emerald-50 to-teal-50',
                'from-violet-50 to-fuchsia-50',
                'from-orange-50 to-pink-50',
                'from-blue-50 to-indigo-50',
                'from-teal-50 to-green-50',
              ];
              const bgGradient = bgGradients[index % bgGradients.length];
              
              // Strip markdown symbols and show plain text preview
              const stripMarkdown = (text) => {
                return text
                  .replace(/!?\[([^\]]+)\]\([^)]+\)/g, '$1')
                  .replace(/#{1,6}\s/g, '')
                  .replace(/[*_~]/g, '')
                  .replace(/`/g, '')
                  .replace(/^[>\-+*]\s/gm, '')
                  .replace(/\s+/g, ' ')
                  .trim();
              };
              const previewText = stripMarkdown(post.content).substring(0, 150) + (post.content.length > 150 ? '...' : '');
              
              return (
                <div
                  key={post.id}
                  onClick={() => navigate(`/posts/${post.id}`)}
                  className="group cursor-pointer bg-white rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden transform hover:-translate-y-2 animate-slide-up border border-gray-100 hover:border-transparent dark:bg-slate-900/80 dark:border-slate-800 dark:shadow-black/40"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className={`h-2 bg-gradient-to-r ${gradient}`}></div>
                  <div className={`bg-gradient-to-br ${bgGradient} p-8 transition-all duration-500 group-hover:opacity-90 dark:from-slate-900 dark:to-slate-950`}>
                    <h2 className="text-2xl font-bold mb-1 text-gray-900 transition-all duration-300 line-clamp-2 dark:text-slate-100">
                      {post.title}
                    </h2>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {post.isPremium && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-gradient-to-r from-amber-400 to-orange-400 text-white text-xs font-bold rounded-full shadow-sm">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                          </svg>
                          Premium • ₹{(post.price / 100).toFixed(0)}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-blue-50 border border-blue-200 text-blue-600 text-xs font-semibold rounded-full dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-400">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {post.readingTimeMinutes || 1} min read
                      </span>
                    </div>
                    <p className="text-gray-700 mb-8 line-clamp-3 leading-relaxed dark:text-slate-300">{previewText}</p>
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-slate-700">
                      <div className="flex items-center gap-2">
                        <div className={`w-12 h-12 bg-gradient-to-br ${gradient} rounded-full flex items-center justify-center text-white font-bold shadow-md ring-2 ring-white`}>
                          {post.authorName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <Link 
                            to={`/profile/${post.authorName}`} 
                            onClick={(e) => e.stopPropagation()}
                            className="text-sm font-bold text-gray-900 hover:text-blue-600 hover:underline transition-colors duration-200 dark:text-slate-100 dark:hover:text-cyan-300"
                          >
                            {post.authorName}
                          </Link>
                          <p className="text-xs text-gray-600 dark:text-slate-400">{formatRelativeTime(post.createdAt)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={(e) => handleLike(e, post.id)}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-full border font-semibold transition-all duration-200 hover:scale-110 ${
                            post.likedByCurrentUser
                              ? 'bg-red-50 border-red-300 text-red-500'
                              : 'bg-white border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-400'
                          }`}
                        >
                          <svg className="w-4 h-4" fill={post.likedByCurrentUser ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                          <span className="text-sm">{post.likeCount || 0}</span>
                        </button>
                        <div className={`flex items-center gap-1 text-gray-700 bg-gradient-to-br ${bgGradient} px-3 py-1.5 rounded-full border border-gray-200 font-semibold`}>
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                          </svg>
                          <span className="text-sm">{post.commentCount}</span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-500 bg-white px-3 py-1.5 rounded-full border border-gray-200 font-semibold dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          <span className="text-sm">{post.viewCount || 0}</span>
                        </div>
                      </div>
                    </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {!loading && !error && posts.length > 0 && totalPages > 1 && (
          <div className="mt-12 flex items-center justify-center gap-6">
            <button
              onClick={handlePreviousPage}
              disabled={isFirst}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                isFirst
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:scale-105 hover:shadow-lg'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>

            <div className="flex items-center gap-3 px-6 py-3 bg-white rounded-xl shadow-md border border-gray-200">
              <span className="text-gray-700 font-medium">
                Page <span className="font-bold text-violet-600">{currentPage + 1}</span> of{' '}
                <span className="font-bold text-violet-600">{totalPages}</span>
              </span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-600 text-sm">
                {totalElements} {totalElements === 1 ? 'post' : 'posts'}
              </span>
            </div>

            <button
              onClick={handleNextPage}
              disabled={isLast}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                isLast
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-violet-600 text-white hover:scale-105 hover:shadow-lg'
              }`}
            >
              Next
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
