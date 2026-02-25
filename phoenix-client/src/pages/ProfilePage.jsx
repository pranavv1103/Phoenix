import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import client from '../api/client';
import { formatRelativeTime } from '../utils/dateUtils';
import useAuthStore from '../store/authStore';

export default function ProfilePage() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [drafts, setDrafts] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [activeTab, setActiveTab] = useState('posts'); // 'posts' | 'saved' | 'drafts'

  const isOwnProfile = user?.name === username;

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const response = await client.get(`/api/users/${username}`);
        setProfile(response.data.data);
      } catch {
        setError('User not found');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [username]);

  useEffect(() => {
    if (!isOwnProfile) return;
    const fetchDrafts = async () => {
      try {
        const res = await client.get('/api/posts/my-drafts');
        setDrafts(res.data.data || []);
      } catch {
        // silently ignore if not authenticated
      }
    };
    fetchDrafts();
  }, [isOwnProfile]);

  useEffect(() => {
    if (!isOwnProfile) return;
    const fetchBookmarks = async () => {
      try {
        const res = await client.get('/api/bookmarks');
        setBookmarks(res.data.data || []);
      } catch {
        // silently ignore
      }
    };
    fetchBookmarks();
  }, [isOwnProfile]);

  const handleFollow = async () => {
    try {
      const res = await client.post(`/api/users/${username}/follow`);
      const nowFollowing = res.data.data;
      setProfile(prev => ({
        ...prev,
        followedByCurrentUser: nowFollowing,
        followersCount: prev.followersCount + (nowFollowing ? 1 : -1),
      }));
    } catch (err) {
      console.error('Failed to toggle follow', err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mb-4"></div>
          <p className="text-xl text-gray-700 dark:text-slate-300 font-medium">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900 bg-gradient-to-br from-red-50 to-pink-50 dark:from-slate-900 dark:to-slate-950">
        <div className="text-center bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl">
          <div className="text-6xl mb-4">😕</div>
          <div className="text-xl text-red-600 dark:text-red-400 font-semibold mb-4">{error}</div>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 bg-gradient-to-br from-slate-50 via-blue-50 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => navigate('/')}
          className="mb-6 flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold transition-all duration-300 hover:gap-3 bg-white dark:bg-slate-800 px-4 py-2 rounded-xl shadow-md hover:shadow-lg"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Home
        </button>

        {/* Profile Header */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-3xl shadow-2xl p-12 mb-8 animate-fade-in border border-white/50 dark:border-slate-700/50">
          <div className="flex items-start gap-8">
            <div className="w-32 h-32 bg-gradient-to-br from-blue-500 via-violet-500 to-fuchsia-500 rounded-full flex items-center justify-center text-6xl font-bold text-white shadow-lg ring-4 ring-white dark:ring-slate-700">
              {profile.username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                <h1 className="text-5xl font-bold text-gray-900 dark:text-slate-100">{profile.username}</h1>
                {!isOwnProfile && user && (
                  <button
                    onClick={handleFollow}
                    className={`px-5 py-2 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 ${
                      profile.followedByCurrentUser
                        ? 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400'
                        : 'bg-gradient-to-r from-blue-600 to-violet-600 text-white hover:from-blue-700 hover:to-violet-700 shadow-md'
                    }`}
                  >
                    {profile.followedByCurrentUser ? 'Following' : 'Follow'}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-slate-700 dark:to-slate-600 p-4 rounded-xl border border-blue-200 dark:border-slate-600">
                  <p className="text-gray-600 dark:text-slate-300 font-medium text-sm">Joined</p>
                  <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                    {formatRelativeTime(profile.joinedDate)}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-slate-700 dark:to-slate-600 p-4 rounded-xl border border-purple-200 dark:border-slate-600">
                  <p className="text-gray-600 dark:text-slate-300 font-medium text-sm">Posts</p>
                  <p className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-1">{profile.totalPosts}</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-slate-700 dark:to-slate-600 p-4 rounded-xl border border-emerald-200 dark:border-slate-600">
                  <p className="text-gray-600 dark:text-slate-300 font-medium text-sm">Followers</p>
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{profile.followersCount || 0}</p>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-700 dark:to-slate-600 p-4 rounded-xl border border-amber-200 dark:border-slate-600">
                  <p className="text-gray-600 dark:text-slate-300 font-medium text-sm">Following</p>
                  <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">{profile.followingCount || 0}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {['posts', ...(isOwnProfile ? ['saved', 'drafts'] : [])].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2.5 rounded-xl font-semibold capitalize transition-all duration-300 ${
                activeTab === tab
                  ? 'bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-md'
                  : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-400 border border-gray-200 dark:border-slate-700 hover:border-blue-400 hover:text-blue-600'
              }`}
            >
              {tab === 'posts' && `Posts (${profile.totalPosts})`}
              {tab === 'saved' && `Saved (${bookmarks.length})`}
              {tab === 'drafts' && `Drafts (${drafts.length})`}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'posts' && (
          <div>
            {profile.totalPosts === 0 ? (
              <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-3xl shadow-2xl p-12 text-center border border-white/50 dark:border-slate-700/50">
                <div className="text-6xl mb-4">📝</div>
                <p className="text-xl text-gray-600 dark:text-slate-300 font-medium">
                  {isOwnProfile ? "You haven't written any posts yet" : `${profile.username} hasn't written any posts yet`}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {profile.posts.map((post, index) => (
                  <Link
                    key={post.id}
                    to={`/posts/${post.id}`}
                    className="group animate-fade-in"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border border-white/50 dark:border-slate-700/50 overflow-hidden h-full flex flex-col hover:bg-white dark:hover:bg-slate-700">
                      <div className="h-1.5 bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-500 group-hover:via-purple-500"></div>
                      <div className="p-6 flex flex-col flex-grow">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-2 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {post.title}
                        </h3>
                        <p className="text-gray-600 dark:text-slate-300 text-sm mb-4 flex-grow line-clamp-3">
                          {post.content}
                        </p>
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400 pt-4 border-t border-gray-100 dark:border-slate-700">
                          <span>{formatRelativeTime(post.createdAt)}</span>
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                            </svg>
                            {post.commentCount}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'saved' && (
          <div>
            {bookmarks.length === 0 ? (
              <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-3xl shadow-2xl p-12 text-center border border-white/50 dark:border-slate-700/50">
                <div className="text-6xl mb-4">🔖</div>
                <p className="text-xl text-gray-600 dark:text-slate-300 font-medium">No bookmarks yet. Save posts to see them here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {bookmarks.map((post) => (
                  <Link key={post.id} to={`/posts/${post.id}`} className="group">
                    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border border-white/50 dark:border-slate-700/50 overflow-hidden h-full flex flex-col hover:bg-white dark:hover:bg-slate-700">
                      <div className="h-1.5 bg-gradient-to-r from-amber-400 to-orange-500"></div>
                      <div className="p-6 flex flex-col flex-grow">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-2 line-clamp-2 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">{post.title}</h3>
                        <p className="text-gray-500 dark:text-slate-400 text-sm mb-3 flex-grow line-clamp-3">{post.content}</p>
                        <div className="text-xs text-gray-500 dark:text-slate-400 pt-3 border-t border-gray-100 dark:border-slate-700">
                          by <span className="font-semibold">{post.authorName}</span> · {formatRelativeTime(post.createdAt)}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'drafts' && isOwnProfile && (
          <div>
            {drafts.length === 0 ? (
              <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-3xl shadow-xl p-10 text-center border border-white/50 dark:border-slate-700/50">
                <div className="text-5xl mb-4">📝</div>
                <p className="text-gray-500 dark:text-slate-400 font-medium">No drafts yet. Save a post as draft to see it here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {drafts.map((draft) => (
                  <div key={draft.id} className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-lg border border-amber-200 dark:border-amber-800/40 overflow-hidden flex flex-col">
                    <div className="h-1.5 bg-gradient-to-r from-amber-400 to-orange-400"></div>
                    <div className="p-6 flex flex-col flex-grow">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 line-clamp-2 flex-1">{draft.title}</h3>
                        <span className="ml-2 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-xs font-semibold rounded-full border border-amber-300 dark:border-amber-700 whitespace-nowrap">Draft</span>
                      </div>
                      <p className="text-gray-500 dark:text-slate-400 text-sm mb-4 flex-grow line-clamp-3">{draft.content}</p>
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-slate-700">
                        <span className="text-xs text-gray-400 dark:text-slate-500">{formatRelativeTime(draft.createdAt)}</span>
                        <Link to={`/posts/${draft.id}/edit`} className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                          Edit →
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
