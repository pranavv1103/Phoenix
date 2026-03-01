import { useState, useEffect } from 'react';
import client from '../api/client';
import useAuthStore from '../store/authStore';
import { formatRelativeTime } from '../utils/dateUtils';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('posts');
  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuthStore();

  useEffect(() => {
    if (activeTab === 'posts') fetchPosts();
    else fetchUsers();
  }, [activeTab]);

  const fetchPosts = async () => {
    try { setLoading(true); const r = await client.get('/api/admin/posts'); setPosts(r.data.data); setError(''); }
    catch { setError('Failed to load posts'); }
    finally { setLoading(false); }
  };

  const fetchUsers = async () => {
    try { setLoading(true); const r = await client.get('/api/admin/users'); setUsers(r.data.data); setError(''); }
    catch { setError('Failed to load users'); }
    finally { setLoading(false); }
  };

  const handleDeletePost = async (postId, postTitle) => {
    if (!window.confirm(`Delete "${postTitle}"?`)) return;
    try { await client.delete(`/api/admin/posts/${postId}`); setPosts(posts.filter(p => p.id !== postId)); }
    catch { alert('Failed to delete post'); }
  };

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-slate-950">
        <div className="text-center p-8 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800">
          <p className="text-xl font-semibold text-red-600 dark:text-red-400 mb-2">Access Denied</p>
          <p className="text-sm text-gray-500 dark:text-slate-400">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">

        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Manage all posts and users</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-gray-200 dark:border-slate-800 mb-6">
          {['posts', 'users'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium capitalize border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white'
                  : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'posts' && posts.length > 0 && <span className="ml-1.5 text-xs text-gray-400 dark:text-slate-500">({posts.length})</span>}
              {tab === 'users' && users.length > 0 && <span className="ml-1.5 text-xs text-gray-400 dark:text-slate-500">({users.length})</span>}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-7 h-7 border-2 border-gray-200 dark:border-slate-700 border-t-green-600 rounded-full animate-spin"></div>
            <p className="text-sm text-gray-500 dark:text-slate-400">Loading...</p>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        ) : activeTab === 'posts' ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-slate-800">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Title</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Author</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide hidden sm:table-cell">Date</th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-800/60">
                {posts.length === 0 ? (
                  <tr><td colSpan="4" className="px-5 py-12 text-center text-gray-400 dark:text-slate-500">No posts found</td></tr>
                ) : posts.map((post) => (
                  <tr key={post.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="font-medium text-gray-900 dark:text-slate-100 line-clamp-1">{post.title}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-gray-700 dark:text-slate-300">{post.authorName}</span>
                      <span className="block text-xs text-gray-400 dark:text-slate-500">{post.authorEmail}</span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 dark:text-slate-400 hidden sm:table-cell">{formatRelativeTime(post.createdAt)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => handleDeletePost(post.id, post.title)}
                        className="px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-slate-800">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Name</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide hidden sm:table-cell">Email</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Role</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide hidden md:table-cell">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-800/60">
                {users.length === 0 ? (
                  <tr><td colSpan="4" className="px-5 py-12 text-center text-gray-400 dark:text-slate-500">No users found</td></tr>
                ) : users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-gray-900 dark:text-slate-100">{u.name}</td>
                    <td className="px-5 py-3.5 text-gray-600 dark:text-slate-400 hidden sm:table-cell">{u.email}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        u.role === 'ADMIN'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/50'
                          : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 border border-gray-200 dark:border-slate-700'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 dark:text-slate-400 hidden md:table-cell">{formatRelativeTime(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
