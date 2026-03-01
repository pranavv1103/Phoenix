import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import client from '../api/client';
import useAuthStore from '../store/authStore';
import { formatRelativeTime } from '../utils/dateUtils';

const stripMarkdown = (text) => {
  return text
    .replace(/!?\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/[*_~]/g, '')
    .replace(/\x60/g, '')
    .replace(/^[>\-+*]\s/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const colorFromString = (str) => {
  const colors = ['bg-rose-500','bg-orange-500','bg-amber-500','bg-green-600','bg-teal-600','bg-cyan-600','bg-blue-600','bg-indigo-600','bg-violet-600','bg-purple-600'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

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
  const [availableTags, setAvailableTags] = useState([]);
  const [selectedTag, setSelectedTag] = useState('');
  const searchRef = useRef(null);
  const pageSize = 6;
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    client.get('/api/tags').then(res => {
      setAvailableTags(res.data.data || []);
    }).catch(() => {});
  }, []);

  const handleLike = async (e, postId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) { navigate('/login'); return; }
    try {
      const response = await client.post(`/api/posts/${postId}/like`);
      const { likeCount, likedByCurrentUser } = response.data.data;
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, likeCount, likedByCurrentUser } : p));
    } catch (err) { console.error('Failed to toggle like', err); }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => { setDebouncedSearchQuery(searchQuery); setCurrentPage(0); }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => { setCurrentPage(0); }, [selectedTag]);

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      let url = `/api/posts?page=${currentPage}&size=${pageSize}&sort=${encodeURIComponent(sortOption)}`;
      if (debouncedSearchQuery.trim()) url += `&search=${encodeURIComponent(debouncedSearchQuery.trim())}`;
      if (selectedTag) url += `&tag=${encodeURIComponent(selectedTag)}`;
      const response = await client.get(url);
      const pageData = response.data.data;
      setPosts(pageData.content);
      setTotalPages(pageData.totalPages);
      setTotalElements(pageData.totalElements);
      setIsFirst(pageData.first);
      setIsLast(pageData.last);
      setError('');
    } catch { setError('Failed to load posts'); }
    finally { setLoading(false); }
  }, [debouncedSearchQuery, currentPage, sortOption, selectedTag, pageSize]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const handleNextPage = () => { if (!isLast) { setCurrentPage(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); } };
  const handlePreviousPage = () => { if (!isFirst) { setCurrentPage(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); } };
  const handleSortChange = (e) => { setSortOption(e.target.value); setCurrentPage(0); };
  const handleTagClick = (tag) => setSelectedTag(prev => prev === tag ? '' : tag);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">

        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
            {selectedTag ? (
              <span>Stories tagged <span className="text-green-600 dark:text-green-400">#{selectedTag}</span></span>
            ) : searchQuery ? (
              <span>Search results</span>
            ) : (
              'Featured Stories'
            )}
          </h1>
          {!selectedTag && !searchQuery && (
            <p className="mt-1.5 text-gray-500 dark:text-slate-400">Thoughtful articles from our community</p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search stories..."
              className="w-full pl-10 pr-10 py-2.5 text-sm bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 transition-colors"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>
          <select
            value={sortOption}
            onChange={handleSortChange}
            className="sm:w-44 px-4 py-2.5 text-sm bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-full text-gray-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-colors"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="mostLiked">Most liked</option>
          </select>
        </div>

        {availableTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {availableTags.map(tag => (
              <button
                key={tag}
                onClick={() => handleTagClick(tag)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                  selectedTag === tag
                    ? 'bg-gray-900 dark:bg-white border-gray-900 dark:border-white text-white dark:text-gray-900'
                    : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:border-gray-400 dark:hover:border-slate-500 hover:text-gray-900 dark:hover:text-slate-200'
                }`}
              >
                #{tag}
              </button>
            ))}
            {selectedTag && (
              <button
                onClick={() => setSelectedTag('')}
                className="px-3 py-1 rounded-full text-xs font-semibold border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-500 dark:text-slate-400 hover:border-red-300 hover:text-red-500 transition-colors"
              >
                Clear filter
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-8 h-8 border-2 border-gray-200 dark:border-slate-700 border-t-green-600 rounded-full animate-spin"></div>
            <p className="text-sm text-gray-500 dark:text-slate-400">Loading stories</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <p className="text-sm text-gray-600 dark:text-slate-400">{error}</p>
            <button onClick={fetchPosts} className="text-sm text-green-600 dark:text-green-400 hover:underline font-medium">Try again</button>
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-14 h-14 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
              <svg className="w-7 h-7 text-gray-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-800 dark:text-slate-100">{searchQuery ? 'No results found' : 'No stories yet'}</p>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                {searchQuery ? 'Try a different search term.' : 'Be the first to share your story.'}
              </p>
            </div>
            {!searchQuery && (
              <Link to="/create" className="mt-2 px-5 py-2.5 text-sm font-semibold text-white bg-gray-900 dark:bg-white dark:text-gray-900 rounded-full hover:bg-gray-700 dark:hover:bg-gray-200 transition-colors">
                Write a story
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-100 dark:divide-slate-800/80">
              {posts.map((post) => {
                const authorColor = colorFromString(post.authorName || 'A');
                const previewText = stripMarkdown(post.content).substring(0, 160) + (post.content.length > 160 ? '...' : '');
                return (
                  <article
                    key={post.id}
                    onClick={() => navigate(`/posts/${post.id}`)}
                    className="group cursor-pointer py-7 flex gap-5 items-start hover:bg-gray-50/60 dark:hover:bg-slate-900/40 -mx-3 px-3 rounded-xl transition-colors duration-150"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2.5">
                        <div className={`w-6 h-6 ${authorColor} rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                          {post.authorName?.charAt(0)?.toUpperCase()}
                        </div>
                        <Link
                          to={`/profile/${encodeURIComponent(post.authorName?.trim())}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-sm font-medium text-gray-700 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                        >
                          {post.authorName?.trim()}
                        </Link>
                        <span className="text-gray-300 dark:text-slate-700 text-xs">·</span>
                        <span className="text-xs text-gray-400 dark:text-slate-500">{formatRelativeTime(post.createdAt)}</span>
                        {post.isPremium && (
                          <span className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-semibold rounded-full border border-amber-200 dark:border-amber-700/50">
                            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                            Premium
                          </span>
                        )}
                      </div>

                      <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white leading-snug mb-1.5 group-hover:text-green-700 dark:group-hover:text-green-400 transition-colors line-clamp-2">
                        {post.title}
                      </h2>

                      <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed line-clamp-2 mb-3">
                        {previewText}
                      </p>

                      <div className="flex items-center gap-3 flex-wrap">
                        {post.tags && post.tags.length > 0 && (
                          <div className="flex gap-1.5 flex-wrap">
                            {post.tags.slice(0, 3).map(tag => (
                              <button
                                key={tag}
                                onClick={(e) => { e.stopPropagation(); handleTagClick(tag); }}
                                className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors ${
                                  selectedTag === tag
                                    ? 'bg-gray-900 dark:bg-white border-gray-900 dark:border-white text-white dark:text-gray-900'
                                    : 'bg-gray-100 dark:bg-slate-800 border-transparent text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700'
                                }`}
                              >
                                #{tag}
                              </button>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-3 ml-auto text-xs text-gray-400 dark:text-slate-500 flex-shrink-0">
                          <span className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            {post.readingTimeMinutes || 1} min
                          </span>

                          <button
                            onClick={(e) => handleLike(e, post.id)}
                            className={`flex items-center gap-1 transition-colors hover:text-red-500 ${post.likedByCurrentUser ? 'text-red-500' : ''}`}
                          >
                            <svg className="w-3.5 h-3.5" fill={post.likedByCurrentUser ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                            {post.likeCount || 0}
                          </button>

                          <span className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                            {post.commentCount || 0}
                          </span>

                          <span className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            {post.viewCount || 0}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className={`hidden sm:flex flex-shrink-0 w-20 h-20 ${authorColor} rounded-xl items-center justify-center text-white text-4xl font-black opacity-80 group-hover:opacity-100 transition-opacity select-none`}>
                      {post.title?.charAt(0)?.toUpperCase()}
                    </div>
                  </article>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-between border-t border-gray-100 dark:border-slate-800 pt-6">
                <button
                  onClick={handlePreviousPage}
                  disabled={isFirst}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full border transition-colors ${
                    isFirst
                      ? 'border-gray-100 dark:border-slate-800 text-gray-300 dark:text-slate-700 cursor-not-allowed'
                      : 'border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  Previous
                </button>

                <span className="text-sm text-gray-500 dark:text-slate-400">
                  Page <strong className="text-gray-900 dark:text-white">{currentPage + 1}</strong> of <strong className="text-gray-900 dark:text-white">{totalPages}</strong>
                  <span className="hidden sm:inline"> · {totalElements} stories</span>
                </span>

                <button
                  onClick={handleNextPage}
                  disabled={isLast}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full border transition-colors ${
                    isLast
                      ? 'border-gray-100 dark:border-slate-800 text-gray-300 dark:text-slate-700 cursor-not-allowed'
                      : 'border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  Next
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
