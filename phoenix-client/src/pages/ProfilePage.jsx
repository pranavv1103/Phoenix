import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import client from '../api/client';

export default function ProfilePage() {
  const { username } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mb-4"></div>
          <p className="text-xl text-gray-700 font-medium">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-red-50 to-pink-50">
        <div className="text-center bg-white p-8 rounded-2xl shadow-xl">
          <div className="text-6xl mb-4">😕</div>
          <div className="text-xl text-red-600 font-semibold mb-4">{error}</div>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 via-purple-50 to-pink-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => navigate('/')}
          className="mb-6 flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold transition-all duration-300 hover:gap-3 bg-white px-4 py-2 rounded-xl shadow-md hover:shadow-lg"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Home
        </button>

        {/* Profile Header */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-12 mb-8 animate-fade-in border border-white/50">
          <div className="flex items-start gap-8">
            <div className="w-32 h-32 bg-gradient-to-br from-blue-500 via-violet-500 to-fuchsia-500 rounded-full flex items-center justify-center text-6xl font-bold text-white shadow-lg ring-4 ring-white">
              {profile.username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h1 className="text-5xl font-bold text-gray-900 mb-4">{profile.username}</h1>
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-xl border border-blue-200">
                  <p className="text-gray-600 font-medium text-sm">Joined Date</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">
                    {new Date(profile.joinedDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-200">
                  <p className="text-gray-600 font-medium text-sm">Total Posts</p>
                  <p className="text-2xl font-bold text-purple-600 mt-1">{profile.totalPosts}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Posts Section */}
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            {profile.totalPosts === 0 ? "No posts yet" : `Posts (${profile.totalPosts})`}
          </h2>

          {profile.totalPosts === 0 ? (
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-12 text-center border border-white/50">
              <div className="text-6xl mb-4">📝</div>
              <p className="text-xl text-gray-600 font-medium">
                {profile.username} hasn't written any posts yet
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
                  <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border border-white/50 overflow-hidden h-full flex flex-col hover:bg-white">
                    <div className="h-1.5 bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-500 group-hover:via-purple-500"></div>
                    <div className="p-6 flex flex-col flex-grow">
                      <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                        {post.title}
                      </h3>
                      <p className="text-gray-600 text-sm mb-4 flex-grow line-clamp-3">
                        {post.content}
                      </p>
                      <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t border-gray-100">
                        <span>
                          {new Date(post.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
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
      </div>
    </div>
  );
}
