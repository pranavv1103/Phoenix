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
  const tabs = ['posts', ...(isOwnProfile ? ['saved', 'drafts'] : [])];

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
      </div>
    </div>
  );
}
