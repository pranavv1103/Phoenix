import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import client from '../api/client';
import { formatRelativeTime } from '../utils/dateUtils';
import useAuthStore from '../store/authStore';

const colorFromString = (str) => {
  const colors = ['bg-rose-500','bg-orange-500','bg-amber-500','bg-green-600','bg-teal-600','bg-cyan-600','bg-blue-600','bg-indigo-600','bg-violet-600','bg-purple-600'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

export default function ProfilePage() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [drafts, setDrafts] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [activeTab, setActiveTab] = useState('posts');

  const isOwnProfile = user?.name?.trim() === username?.trim();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const trimmedName = username?.trim();
        const response = await client.get(`/api/users/${encodeURIComponent(trimmedName)}`);
        setProfile(response.data.data);
      } catch { setError('User not found'); }
      finally { setLoading(false); }
    };
    fetchProfile();
  }, [username]);

  useEffect(() => {
    if (!isOwnProfile) return;
    client.get('/api/posts/my-drafts').then(res => setDrafts(res.data.data || [])).catch(() => {});
  }, [isOwnProfile]);

  useEffect(() => {
    if (!isOwnProfile) return;
    client.get('/api/bookmarks').then(res => setBookmarks(res.data.data || [])).catch(() => {});
  }, [isOwnProfile]);

  const handleFollow = async () => {
    try {
      const res = await client.post(`/api/users/${encodeURIComponent(username?.trim())}/follow`);
      const nowFollowing = res.data.data;
      setProfile(prev => ({ ...prev, followedByCurrentUser: nowFollowing, followersCount: prev.followersCount + (nowFollowing ? 1 : -1) }));
    } catch (err) { console.error('Failed to toggle follow', err); }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-slate-950 gap-3">
        <div className="w-8 h-8 border-2 border-gray-200 dark:border-slate-700 border-t-green-600 rounded-full animate-spin"></div>
        <p className="text-sm text-gray-500 dark:text-slate-400">Loading profile...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-slate-950 gap-4">
        <p className="text-gray-600 dark:text-slate-400">{error || 'Profile not found'}</p>
        <button onClick={() => navigate('/')} className="text-sm text-green-600 dark:text-green-400 hover:underline font-medium">Back to Home</button>
      </div>
    );
  }

  const avatarColor = colorFromString(profile.username || 'A');
  const tabs = ['posts', ...(isOwnProfile ? ['saved', 'drafts', 'stats'] : [])];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">

        {/* Profile header */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 sm:p-8 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Avatar */}
            <div className={`w-20 h-20 sm:w-24 sm:h-24 ${avatarColor} rounded-full flex items-center justify-center text-white text-3xl sm:text-4xl font-black flex-shrink-0`}>
              {profile.username.charAt(0).toUpperCase()}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{profile.username}</h1>
                {!isOwnProfile && user && (
                  <button
                    onClick={handleFollow}
                    className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                      profile.followedByCurrentUser
                        ? 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-700 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-800'
                        : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-200'
                    }`}
                  >
                    {profile.followedByCurrentUser ? 'Following' : 'Follow'}
                  </button>
                )}
              </div>

              {/* Stats inline */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-slate-400">
                <span><strong className="text-gray-900 dark:text-white font-semibold">{profile.totalPosts}</strong> posts</span>
                <span className="text-gray-300 dark:text-slate-700">·</span>
                <span><strong className="text-gray-900 dark:text-white font-semibold">{profile.followersCount || 0}</strong> followers</span>
                <span className="text-gray-300 dark:text-slate-700">·</span>
                <span><strong className="text-gray-900 dark:text-white font-semibold">{profile.followingCount || 0}</strong> following</span>
                <span className="text-gray-300 dark:text-slate-700">·</span>
                <span>Joined {formatRelativeTime(profile.joinedDate)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-gray-200 dark:border-slate-800 mb-6">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium capitalize border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white'
                  : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
              }`}
            >
              {tab === 'posts' && `Posts (${profile.totalPosts})`}
              {tab === 'saved' && `Saved (${bookmarks.length})`}
              {tab === 'drafts' && `Drafts (${drafts.length})`}
              {tab === 'stats' && '📊 Stats'}
            </button>
          ))}
        </div>

        {/* Posts tab */}
        {activeTab === 'posts' && (
          profile.totalPosts === 0 ? (
            <div className="text-center py-16 text-gray-500 dark:text-slate-400">
              <p>{isOwnProfile ? "You haven't written any posts yet." : `${profile.username} hasn't written any posts yet.`}</p>
              {isOwnProfile && (
                <Link to="/create" className="mt-4 inline-block px-5 py-2.5 text-sm font-semibold text-white bg-gray-900 dark:bg-white dark:text-gray-900 rounded-full hover:bg-gray-700 dark:hover:bg-gray-200 transition-colors">
                  Write a story
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-slate-800/80">
              {profile.posts.map((post) => (
                <Link key={post.id} to={`/posts/${post.id}`} className="group block py-5 hover:bg-gray-50/60 dark:hover:bg-slate-900/40 -mx-3 px-3 rounded-xl transition-colors">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white group-hover:text-green-700 dark:group-hover:text-green-400 transition-colors line-clamp-2 mb-1">
                    {post.title}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-slate-500">
                    <span>{formatRelativeTime(post.createdAt)}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                      {post.commentCount}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )
        )}

        {/* Saved tab */}
        {activeTab === 'saved' && (
          bookmarks.length === 0 ? (
            <div className="text-center py-16 text-gray-500 dark:text-slate-400">
              <p>No bookmarks yet. Save posts to see them here.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-slate-800/80">
              {bookmarks.map((post) => (
                <Link key={post.id} to={`/posts/${post.id}`} className="group block py-5 hover:bg-gray-50/60 dark:hover:bg-slate-900/40 -mx-3 px-3 rounded-xl transition-colors">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-green-700 dark:group-hover:text-green-400 transition-colors line-clamp-2 mb-1">{post.title}</h3>
                  <div className="text-xs text-gray-400 dark:text-slate-500">by {post.authorName} · {formatRelativeTime(post.createdAt)}</div>
                </Link>
              ))}
            </div>
          )
        )}

        {/* Drafts tab */}
        {activeTab === 'drafts' && isOwnProfile && (
          drafts.length === 0 ? (
            <div className="text-center py-16 text-gray-500 dark:text-slate-400">
              <p>No drafts yet. Save a post as draft to see it here.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-slate-800/80">
              {drafts.map((draft) => (
                <div key={draft.id} className="py-5 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white line-clamp-1">{draft.title}</h3>
                      <span className="flex-shrink-0 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-semibold rounded-full border border-amber-200 dark:border-amber-700/50">Draft</span>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-slate-500">{formatRelativeTime(draft.createdAt)}</p>
                  </div>
                  <Link to={`/posts/${draft.id}/edit`} className="flex-shrink-0 text-sm font-medium text-green-600 dark:text-green-400 hover:underline">
                    Edit
                  </Link>
                </div>
              ))}
            </div>
          )
        )}
        {/* Stats tab */}
        {activeTab === 'stats' && isOwnProfile && (() => {
          const posts = profile.posts || [];
          const totalViews = posts.reduce((s, p) => s + (p.viewCount || 0), 0);
          const totalLikes = posts.reduce((s, p) => s + (p.likeCount || 0), 0);
          const totalComments = posts.reduce((s, p) => s + (p.commentCount || 0), 0);
          const totalFollowers = profile.followersCount || 0;

          const byViews = [...posts].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0)).slice(0, 5);
          const byLikes = [...posts].sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0)).slice(0, 5);
          const maxViews = byViews[0]?.viewCount || 1;
          const maxLikes = byLikes[0]?.likeCount || 1;

          return (
            <div className="space-y-6">
              {/* Summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[{ label: 'Total Views', value: totalViews, icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  ), color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                  { label: 'Total Likes', value: totalLikes, icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                  ), color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
                  { label: 'Comments', value: totalComments, icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                  ), color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
                  { label: 'Followers', value: totalFollowers, icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  ), color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20' },
                ].map(stat => (
                  <div key={stat.label} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col gap-2">
                    <div className={`w-9 h-9 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center`}>{stat.icon}</div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">{stat.label}</p>
                  </div>
                ))}
              </div>

              {posts.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl">
                  <p className="text-gray-500 dark:text-slate-400">Publish some posts to see analytics.</p>
                  <Link to="/create" className="mt-4 inline-block px-5 py-2.5 text-sm font-semibold text-white bg-gray-900 dark:bg-white dark:text-gray-900 rounded-full transition-colors">Write a story</Link>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Top by views */}
                  <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      Top by Views
                    </h3>
                    <div className="space-y-3">
                      {byViews.map((post) => (
                        <Link key={post.id} to={`/posts/${post.id}`} className="block group">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-700 dark:text-slate-300 font-medium group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors line-clamp-1 flex-1 mr-3">{post.title}</span>
                            <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 flex-shrink-0">{(post.viewCount || 0).toLocaleString()}</span>
                          </div>
                          <div className="h-1.5 w-full bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full transition-all"
                              style={{ width: `${Math.round(((post.viewCount || 0) / maxViews) * 100)}%` }}
                            />
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* Top by likes */}
                  <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                      Top by Likes
                    </h3>
                    <div className="space-y-3">
                      {byLikes.map((post) => (
                        <Link key={post.id} to={`/posts/${post.id}`} className="block group">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-700 dark:text-slate-300 font-medium group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors line-clamp-1 flex-1 mr-3">{post.title}</span>
                            <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 flex-shrink-0">{(post.likeCount || 0).toLocaleString()}</span>
                          </div>
                          <div className="h-1.5 w-full bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-red-400 rounded-full transition-all"
                              style={{ width: `${Math.round(((post.likeCount || 0) / maxLikes) * 100)}%` }}
                            />
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* Post-level table */}
                  <div className="sm:col-span-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">All Posts Performance</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100 dark:border-slate-800">
                            <th className="text-left text-xs font-semibold text-gray-500 dark:text-slate-400 pb-2 pr-4">Post</th>
                            <th className="text-right text-xs font-semibold text-gray-500 dark:text-slate-400 pb-2 px-3">
                              <svg className="w-3.5 h-3.5 inline text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            </th>
                            <th className="text-right text-xs font-semibold text-gray-500 dark:text-slate-400 pb-2 px-3">
                              <svg className="w-3.5 h-3.5 inline text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                            </th>
                            <th className="text-right text-xs font-semibold text-gray-500 dark:text-slate-400 pb-2 pl-3">
                              <svg className="w-3.5 h-3.5 inline text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-slate-800/60">
                          {[...posts].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0)).map((post) => (
                            <tr key={post.id} className="group">
                              <td className="py-2.5 pr-4">
                                <Link to={`/posts/${post.id}`} className="text-gray-800 dark:text-slate-200 group-hover:text-green-600 dark:group-hover:text-green-400 font-medium transition-colors line-clamp-1">{post.title}</Link>
                                <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{formatRelativeTime(post.createdAt)}</p>
                              </td>
                              <td className="text-right text-gray-700 dark:text-slate-300 tabular-nums px-3 py-2.5 font-medium">{(post.viewCount || 0).toLocaleString()}</td>
                              <td className="text-right text-gray-700 dark:text-slate-300 tabular-nums px-3 py-2.5 font-medium">{(post.likeCount || 0).toLocaleString()}</td>
                              <td className="text-right text-gray-700 dark:text-slate-300 tabular-nums pl-3 py-2.5 font-medium">{(post.commentCount || 0).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-gray-200 dark:border-slate-700">
                            <td className="pt-3 pr-4 text-xs font-semibold text-gray-500 dark:text-slate-400">Total</td>
                            <td className="text-right pt-3 px-3 text-sm font-bold text-gray-900 dark:text-white tabular-nums">{totalViews.toLocaleString()}</td>
                            <td className="text-right pt-3 px-3 text-sm font-bold text-gray-900 dark:text-white tabular-nums">{totalLikes.toLocaleString()}</td>
                            <td className="text-right pt-3 pl-3 text-sm font-bold text-gray-900 dark:text-white tabular-nums">{totalComments.toLocaleString()}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

      </div>
    </div>
  );
}
