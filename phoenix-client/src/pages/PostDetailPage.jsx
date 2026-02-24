import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import client from '../api/client';
import useAuthStore from '../store/authStore';

export default function PostDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPost = useCallback(async () => {
    try {
      const response = await client.get(`/api/posts/${id}`);
      setPost(response.data.data);
    } catch {
      setError('Failed to load post');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const handleLike = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    try {
      const response = await client.post(`/api/posts/${id}/like`);
      const { likeCount, likedByCurrentUser } = response.data.data;
      setPost(prev => ({ ...prev, likeCount, likedByCurrentUser }));
    } catch (err) {
      console.error('Failed to toggle like', err);
    }
  };

  const fetchComments = useCallback(async () => {
    try {
      const response = await client.get(`/api/posts/${id}/comments`);
      setComments(response.data.data);
    } catch {
      console.error('Failed to load comments');
    }
  }, [id]);

  useEffect(() => {
    fetchPost();
    fetchComments();
  }, [fetchPost, fetchComments]);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;

    try {
      await client.delete(`/api/posts/${id}`);
      navigate('/');
    } catch {
      alert('Failed to delete post');
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      await client.post(`/api/posts/${id}/comments`, { content: newComment });
      setNewComment('');
      fetchComments();
    } catch {
      alert('Failed to post comment');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mb-4"></div>
          <p className="text-xl text-gray-700 font-medium">Loading post...</p>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-red-50 to-pink-50">
        <div className="text-center bg-white p-8 rounded-2xl shadow-xl">
          <div className="text-6xl mb-4">😕</div>
          <div className="text-xl text-red-600 font-semibold">{error || 'Post not found'}</div>
        </div>
      </div>
    );
  }

  const isAuthor = user?.email === post.authorEmail;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 via-purple-50 to-pink-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/')}
          className="mb-6 flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold transition-all duration-300 hover:gap-3 bg-white px-4 py-2 rounded-xl shadow-md hover:shadow-lg"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to all posts
        </button>

        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-10 mb-8 animate-fade-in border border-white/50">
          <div className="mb-6">
            <h1 className="text-5xl font-bold mb-4 text-gray-900 leading-tight">{post.title}</h1>
            <div className="flex items-center gap-3 text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-violet-500 to-fuchsia-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg ring-2 ring-white">
                  {post.authorName.charAt(0).toUpperCase()}
                </div>
                <Link 
                  to={`/profile/${post.authorName}`}
                  className="font-bold text-gray-900 text-lg hover:text-blue-600 hover:underline transition-colors duration-200"
                >
                  {post.authorName}
                </Link>
              </div>
              <span className="text-gray-400">•</span>
              <span className="text-sm font-medium">{new Date(post.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
              {post.createdAt !== post.updatedAt && (
                <>
                  <span className="text-gray-400">•</span>
                  <span className="text-sm px-3 py-1 bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700 font-bold rounded-full">Updated</span>
                </>
              )}
            </div>
          </div>
          
          <div className="h-1.5 bg-gradient-to-r from-cyan-500 via-blue-500 via-violet-500 to-fuchsia-500 rounded-full mb-8"></div>
          
          <div className="prose prose-lg max-w-none mb-6 whitespace-pre-wrap text-gray-700 leading-relaxed">
            {post.content}
          </div>

          <div className="flex items-center gap-4 py-4 border-t border-b border-gray-200 mb-2">
            <button
              onClick={handleLike}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg ${
                post.likedByCurrentUser
                  ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-md'
                  : 'bg-white border-2 border-gray-200 text-gray-600 hover:border-red-400 hover:text-red-500'
              }`}
            >
              <svg className="w-6 h-6" fill={post.likedByCurrentUser ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span>{post.likedByCurrentUser ? 'Liked' : 'Like'}</span>
              <span className={`px-2 py-0.5 rounded-full text-sm font-bold ${post.likedByCurrentUser ? 'bg-white/30' : 'bg-gray-100'}`}>
                {post.likeCount || 0}
              </span>
            </button>
            {!isAuthenticated && (
              <span className="text-sm text-gray-500 italic">Sign in to like this post</span>
            )}
          </div>

          {isAuthor && isAuthenticated && (
            <div className="flex gap-4 pt-6 border-t border-gray-200">
              <Link
                to={`/posts/${id}/edit`}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 transform hover:scale-105 hover:shadow-xl font-semibold"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Post
              </Link>
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-600 to-pink-600 text-white rounded-xl hover:from-rose-700 hover:to-pink-700 transition-all duration-300 transform hover:scale-105 hover:shadow-xl font-semibold"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete Post
              </button>
            </div>
          )}
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-10 animate-fade-in border border-white/50">
          <h2 className="text-4xl font-bold mb-6 text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-xl">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
              </svg>
            </div>
            <span>Comments ({comments.length})</span>
          </h2>

          {isAuthenticated && (
            <form onSubmit={handleCommentSubmit} className="mb-8">
              <div className="mb-4">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Share your thoughts..."
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100 transition-all duration-300 resize-none"
                  rows="4"
                  required
                />
              </div>
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl hover:from-violet-700 hover:to-fuchsia-700 transition-all duration-300 transform hover:scale-105 hover:shadow-xl font-semibold"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Post Comment
              </button>
            </form>
          )}

          {!isAuthenticated && (
            <div className="mb-8 p-5 bg-gradient-to-r from-violet-50 to-fuchsia-50 border-2 border-violet-200 rounded-2xl">
              <p className="text-gray-700 font-medium">
                <Link to="/login" className="text-violet-600 hover:text-violet-700 font-bold hover:underline">
                  Sign in
                </Link>{' '}
                to join the conversation
              </p>
            </div>
          )}

          <div className="space-y-4">
            {comments.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">💬</div>
                <p className="text-gray-500">No comments yet. Be the first to share your thoughts!</p>
              </div>
            ) : (
              comments.map((comment, index) => {
                const gradients = [
                  'from-violet-500 to-fuchsia-500',
                  'from-blue-500 to-cyan-500',
                  'from-emerald-500 to-teal-500',
                  'from-orange-500 to-rose-500',
                  'from-pink-500 to-rose-500',
                ];
                const gradient = gradients[index % gradients.length];
                
                return (
                  <div 
                    key={comment.id} 
                    className="bg-gradient-to-r from-violet-50 via-purple-50 to-fuchsia-50 border-l-4 border-violet-500 rounded-r-2xl p-5 hover:shadow-lg transition-all duration-300 animate-slide-up"
                    style={{ animationDelay: `${index * 100}ms`}}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-10 h-10 bg-gradient-to-br ${gradient} rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg ring-2 ring-white`}>
                        {comment.authorName.charAt(0).toUpperCase()}
                      </div>
                      <Link 
                        to={`/profile/${comment.authorName}`}
                        className="font-bold text-gray-900 hover:text-blue-600 hover:underline transition-colors duration-200"
                      >
                        {comment.authorName}
                      </Link>
                      <span className="text-gray-400">•</span>
                      <span className="text-sm text-gray-600 font-medium">{new Date(comment.createdAt).toLocalDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                    <p className="text-gray-700 ml-12 whitespace-pre-wrap leading-relaxed">{comment.content}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
