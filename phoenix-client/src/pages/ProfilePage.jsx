import { useState, useEffect, useRef } from 'react';
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
  const { user, updateUser } = useAuthStore();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [drafts, setDrafts] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [activeTab, setActiveTab] = useState('posts');
  const [emailDigestEnabled, setEmailDigestEnabled] = useState(true);
  const [digestLoading, setDigestLoading] = useState(false);

  // Edit profile modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editBio, setEditBio] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [editWebsiteUrl, setEditWebsiteUrl] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [avatarTab, setAvatarTab] = useState('url'); // 'url' | 'upload'
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Change password state
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);
  const [showPwCurrent, setShowPwCurrent] = useState(false);
  const [showPwNew, setShowPwNew] = useState(false);
  const [showPwConfirm, setShowPwConfirm] = useState(false);

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

  useEffect(() => {
    if (!isOwnProfile) return;
    client.get('/api/users/digest-preferences')
      .then(res => setEmailDigestEnabled(res.data.data))
      .catch(() => {});
  }, [isOwnProfile]);

  const handleFollow = async () => {
    try {
      const res = await client.post(`/api/users/${encodeURIComponent(username?.trim())}/follow`);
      const nowFollowing = res.data.data;
      setProfile(prev => ({ ...prev, followedByCurrentUser: nowFollowing, followersCount: prev.followersCount + (nowFollowing ? 1 : -1) }));
    } catch (err) { console.error('Failed to toggle follow', err); }
  };

  const handleDigestToggle = async () => {
    try {
      setDigestLoading(true);
      const res = await client.put(`/api/users/digest-preferences?enabled=${!emailDigestEnabled}`);
      setEmailDigestEnabled(res.data.data);
    } catch (err) {
      console.error('Failed to update digest preferences', err);
    } finally {
      setDigestLoading(false);
    }
  };

  // Resize + compress an uploaded image to a base64 JPEG (max 300×300)
  const processImageFile = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 300;
        const scale = Math.min(MAX / img.width, MAX / img.height, 1);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const handleAvatarFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setEditError('Please select an image file.'); return; }
    if (file.size > 5 * 1024 * 1024) { setEditError('Image must be under 5 MB.'); return; }
    setAvatarUploading(true);
    setEditError('');
    try {
      const dataUrl = await processImageFile(file);
      setEditAvatarUrl(dataUrl);
    } catch {
      setEditError('Failed to process image. Please try another file.');
    } finally {
      setAvatarUploading(false);
    }
  };

  const openEditModal = () => {
    setEditBio(profile?.bio || '');
    setEditAvatarUrl(profile?.avatarUrl || '');
    setEditWebsiteUrl(profile?.websiteUrl || '');
    setEditError('');
    setAvatarTab('url');
    setEditModalOpen(true);
  };

  const handleEditSave = async () => {
    setEditSaving(true);
    setEditError('');
    try {
      const res = await client.put('/api/users/me', {
        bio: editBio,
        avatarUrl: editAvatarUrl,
        websiteUrl: editWebsiteUrl,
      });
      const updated = res.data.data;
      setProfile(prev => ({ ...prev, bio: updated.bio, avatarUrl: updated.avatarUrl, websiteUrl: updated.websiteUrl }));
      updateUser({ avatarUrl: updated.avatarUrl });
      setEditModalOpen(false);
    } catch (err) {
      setEditError(err.response?.data?.message || 'Failed to save changes');
    } finally {
      setEditSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess(false);
    if (pwNew !== pwConfirm) { setPwError('New passwords do not match.'); return; }
    if (pwNew.length < 6) { setPwError('New password must be at least 6 characters.'); return; }
    setPwSaving(true);
    try {
      await client.put('/api/users/me/password', {
        currentPassword: pwCurrent,
        newPassword: pwNew,
        confirmPassword: pwConfirm,
      });
      setPwSuccess(true);
      setPwCurrent(''); setPwNew(''); setPwConfirm('');
    } catch (err) {
      setPwError(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setPwSaving(false);
    }
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
  const tabs = ['posts', ...(isOwnProfile ? ['saved', 'drafts', 'stats', 'settings'] : [])];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">

        {/* Profile header */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 sm:p-8 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.username}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-2 border-gray-100 dark:border-slate-800"
                  onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
                />
              ) : null}
              <div className={`w-20 h-20 sm:w-24 sm:h-24 ${avatarColor} rounded-full flex items-center justify-center text-white text-3xl sm:text-4xl font-black ${profile.avatarUrl ? 'hidden' : ''}`}>
                {profile.username.charAt(0).toUpperCase()}
              </div>
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
                {isOwnProfile && (
                  <button
                    onClick={openEditModal}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-slate-400 border border-gray-200 dark:border-slate-700 rounded-full hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Edit profile
                  </button>
                )}
              </div>

              {/* Bio */}
              {profile.bio && (
                <p className="text-sm text-gray-600 dark:text-slate-400 mb-2 leading-relaxed max-w-lg">{profile.bio}</p>
              )}

              {/* Website */}
              {profile.websiteUrl && (
                <a
                  href={profile.websiteUrl.startsWith('http') ? profile.websiteUrl : `https://${profile.websiteUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 hover:underline mb-2"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  {profile.websiteUrl.replace(/^https?:\/\//, '')}
                </a>
              )}

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
              {tab === 'settings' && '⚙️ Settings'}
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
                      <span className={`flex-shrink-0 px-2 py-0.5 text-xs font-semibold rounded-full border ${draft.status === 'SCHEDULED' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-700/50' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700/50'}`}>
                        {draft.status === 'SCHEDULED' ? 'Scheduled' : 'Draft'}
                      </span>
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

        {/* Settings tab */}
        {activeTab === 'settings' && isOwnProfile && (
          <div className="space-y-4">
            {/* Email Digest Setting */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">📬</span>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">Weekly Email Digest</h3>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-slate-400 leading-relaxed">
                    Receive a curated weekly email with the top 5 most popular posts from the past week. Delivered every Monday at 9 AM.
                  </p>
                </div>
                <button
                  onClick={handleDigestToggle}
                  disabled={digestLoading}
                  className={`relative flex-shrink-0 w-12 h-7 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-offset-slate-900 ${
                    emailDigestEnabled
                      ? 'bg-green-600'
                      : 'bg-gray-200 dark:bg-slate-700'
                  } ${digestLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  aria-label="Toggle email digest"
                >
                  <span
                    className={`inline-block w-5 h-5 bg-white rounded-full shadow transform transition-transform duration-200 mt-1 ${
                      emailDigestEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              {emailDigestEnabled && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800">
                  <div className="flex items-start gap-2 text-sm text-green-700 dark:text-green-400">
                    <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>You're subscribed to weekly digests</span>
                  </div>
                </div>
              )}
            </div>

            {/* Info card */}
            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-1">About Email Digests</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300/90 leading-relaxed">
                    Stay updated with the best content from Phoenix without checking the site every day. Your digest includes post titles, author names, engagement metrics, and direct links.
                  </p>
                </div>
              </div>
            </div>

            {/* Change Password */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-5 h-5 text-gray-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Change Password</h3>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-3">
                {/* Current password */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Current password</label>
                  <div className="relative">
                    <input
                      type={showPwCurrent ? 'text' : 'password'}
                      value={pwCurrent}
                      onChange={e => setPwCurrent(e.target.value)}
                      required
                      className="w-full px-3 py-2 pr-9 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-600"
                    />
                    <button type="button" onClick={() => setShowPwCurrent(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300">
                      {showPwCurrent
                        ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                        : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      }
                    </button>
                  </div>
                </div>

                {/* New password */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">New password <span className="text-gray-400 dark:text-slate-500 font-normal">(min 6 chars)</span></label>
                  <div className="relative">
                    <input
                      type={showPwNew ? 'text' : 'password'}
                      value={pwNew}
                      onChange={e => setPwNew(e.target.value)}
                      required
                      minLength={6}
                      className="w-full px-3 py-2 pr-9 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-600"
                    />
                    <button type="button" onClick={() => setShowPwNew(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300">
                      {showPwNew
                        ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                        : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      }
                    </button>
                  </div>
                </div>

                {/* Confirm password */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Confirm new password</label>
                  <div className="relative">
                    <input
                      type={showPwConfirm ? 'text' : 'password'}
                      value={pwConfirm}
                      onChange={e => setPwConfirm(e.target.value)}
                      required
                      className={`w-full px-3 py-2 pr-9 text-sm rounded-xl border bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-600 ${
                        pwConfirm && pwNew !== pwConfirm
                          ? 'border-red-400 dark:border-red-600'
                          : 'border-gray-200 dark:border-slate-700'
                      }`}
                    />
                    <button type="button" onClick={() => setShowPwConfirm(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300">
                      {showPwConfirm
                        ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                        : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      }
                    </button>
                  </div>
                  {pwConfirm && pwNew !== pwConfirm && (
                    <p className="text-xs text-red-500 dark:text-red-400 mt-1">Passwords don't match</p>
                  )}
                </div>

                {pwError && <p className="text-sm text-red-600 dark:text-red-400">{pwError}</p>}
                {pwSuccess && (
                  <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Password changed successfully!
                  </div>
                )}

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={pwSaving || !pwCurrent || !pwNew || !pwConfirm}
                    className="px-5 py-2 text-sm font-semibold text-white bg-gray-900 dark:bg-white dark:text-gray-900 rounded-full hover:bg-gray-700 dark:hover:bg-gray-200 transition-colors disabled:opacity-40 flex items-center gap-2"
                  >
                    {pwSaving && <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 12 0 12 4.291z" /></svg>}
                    {pwSaving ? 'Updating...' : 'Update password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>

      {/* Edit Profile Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-slate-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Profile</h2>
              <button
                onClick={() => setEditModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Bio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Bio</label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  rows={3}
                  maxLength={300}
                  placeholder="Tell people a little about yourself..."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-600 resize-none"
                />
                <p className="text-right text-xs text-gray-400 dark:text-slate-500 mt-1">{editBio.length}/300</p>
              </div>

              {/* Avatar */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Avatar</label>

                {/* Tab toggle */}
                <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 mb-3 text-sm">
                  <button
                    type="button"
                    onClick={() => setAvatarTab('url')}
                    className={`flex-1 py-2 font-medium transition-colors ${
                      avatarTab === 'url'
                        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                        : 'bg-transparent text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    Paste URL
                  </button>
                  <button
                    type="button"
                    onClick={() => setAvatarTab('upload')}
                    className={`flex-1 py-2 font-medium transition-colors ${
                      avatarTab === 'upload'
                        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                        : 'bg-transparent text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    Upload photo
                  </button>
                </div>

                {avatarTab === 'url' ? (
                  <input
                    type="url"
                    value={editAvatarUrl.startsWith('data:') ? '' : editAvatarUrl}
                    onChange={(e) => setEditAvatarUrl(e.target.value)}
                    placeholder="https://example.com/your-photo.jpg"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-600"
                  />
                ) : (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarFileChange}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={avatarUploading}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-700 text-sm text-gray-500 dark:text-slate-400 hover:border-green-400 dark:hover:border-green-600 hover:text-green-600 dark:hover:text-green-400 transition-colors disabled:opacity-50"
                    >
                      {avatarUploading ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 12 0 12 4.291z"/>
                          </svg>
                          Processing...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {editAvatarUrl.startsWith('data:') ? 'Change photo' : 'Choose a photo'}
                        </>
                      )}
                    </button>
                    <p className="mt-1.5 text-xs text-gray-400 dark:text-slate-500 text-center">JPG, PNG, GIF, WebP · max 5 MB</p>
                  </div>
                )}

                {/* Preview */}
                {editAvatarUrl && (
                  <div className="mt-3 flex items-center gap-3">
                    <img
                      src={editAvatarUrl}
                      alt="Preview"
                      className="w-12 h-12 rounded-full object-cover border-2 border-gray-200 dark:border-slate-700 flex-shrink-0"
                      onError={(e) => { e.currentTarget.style.opacity = '0.3'; }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700 dark:text-slate-300">Preview</p>
                      <p className="text-xs text-gray-400 dark:text-slate-500 truncate">
                        {editAvatarUrl.startsWith('data:') ? 'Uploaded photo (compressed)' : editAvatarUrl}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditAvatarUrl('')}
                      className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 flex-shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {/* Website URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Website</label>
                <input
                  type="text"
                  value={editWebsiteUrl}
                  onChange={(e) => setEditWebsiteUrl(e.target.value)}
                  placeholder="yoursite.com"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-600"
                />
              </div>

              {editError && (
                <p className="text-sm text-red-600 dark:text-red-400">{editError}</p>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 dark:border-slate-800">
              <button
                onClick={() => setEditModalOpen(false)}
                disabled={editSaving}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                disabled={editSaving}
                className="px-5 py-2 text-sm font-semibold text-white bg-gray-900 dark:bg-white dark:text-gray-900 rounded-full hover:bg-gray-700 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {editSaving && (
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 12 0 12 4.291z" />
                  </svg>
                )}
                {editSaving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
