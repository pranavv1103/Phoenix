import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import client from '../api/client';
import useAuthStore from '../store/authStore';
import { formatRelativeTime } from '../utils/dateUtils';
import { sanitizeHtml } from '../utils/sanitize';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import MarkdownPreview from '@uiw/react-markdown-preview';

export default function PostDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

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
    setDeleteError('');
    setIsDeleting(true);
    try {
      await client.delete(`/api/posts/${id}`);
      setIsDeleteModalOpen(false);
      navigate('/');
    } catch {
      setDeleteError('Failed to delete post');
    } finally {
      setIsDeleting(false);
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
      <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mb-4"></div>
          <p className="text-xl text-gray-700 dark:text-slate-300 font-medium">Loading post...</p>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900 bg-gradient-to-br from-red-50 to-pink-50 dark:from-slate-900 dark:to-slate-950">
        <div className="text-center bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl">
          <div className="text-6xl mb-4">😕</div>
          <div className="text-xl text-red-600 dark:text-red-400 font-semibold">{error || 'Post not found'}</div>
        </div>
      </div>
    );
  }

  const isAuthor = user?.email === post.authorEmail;
  const postAuthorName = (post.authorName || 'Unknown User').trim();
  const postAuthorInitial = postAuthorName.charAt(0).toUpperCase();
  const postContent = typeof post.content === 'string' ? post.content : String(post.content ?? '');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 bg-gradient-to-br from-slate-50 via-blue-50 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/')}
          className="mb-6 flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold transition-all duration-300 hover:gap-3 bg-white dark:bg-slate-800 px-4 py-2 rounded-xl shadow-md hover:shadow-lg"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to all posts
        </button>

        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-3xl shadow-2xl p-10 mb-8 animate-fade-in border border-white/50 dark:border-slate-700/50">
          <div className="mb-6">
            <h1 className="text-5xl font-bold mb-4 text-gray-900 dark:text-slate-100 leading-tight">{post.title}</h1>
            <div className="flex items-center gap-3 text-gray-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-violet-500 to-fuchsia-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg ring-2 ring-white">
                  {postAuthorInitial}
                </div>
                <Link 
                  to={`/profile/${postAuthorName}`}
                  className="font-bold text-gray-900 dark:text-slate-100 text-lg hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition-colors duration-200"
                >
                  {postAuthorName}
                </Link>
              </div>
              <span className="text-gray-400 dark:text-slate-500">•</span>
              <span className="text-sm font-medium">{formatRelativeTime(post.createdAt)}</span>
              {post.createdAt !== post.updatedAt && (
                <>
                  <span className="text-gray-400 dark:text-slate-500">•</span>
                  <span className="text-sm px-3 py-1 bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900 dark:to-teal-900 text-emerald-700 dark:text-emerald-300 font-bold rounded-full">Updated</span>
                </>
              )}
            </div>
          </div>
          
          <div className="h-1.5 bg-gradient-to-r from-cyan-500 via-blue-500 via-violet-500 to-fuchsia-500 rounded-full mb-8"></div>
          
          <div className="mb-6" data-color-mode="auto">
            <MarkdownPreview
              source={postContent}
              style={{ backgroundColor: 'transparent', padding: 0 }}
              className="!bg-transparent"
            />
          </div>

          <div className="flex items-center gap-4 py-4 border-t border-b border-gray-200 dark:border-slate-700 mb-2">
            <button
              onClick={handleLike}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg ${
                post.likedByCurrentUser
                  ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-md'
                  : 'bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:border-red-400 hover:text-red-500 dark:hover:border-red-400 dark:hover:text-red-400'
              }`}
            >
              <svg className="w-6 h-6" fill={post.likedByCurrentUser ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span>{post.likedByCurrentUser ? 'Liked' : 'Like'}</span>
              <span className={`px-2 py-0.5 rounded-full text-sm font-bold ${post.likedByCurrentUser ? 'bg-white/30' : 'bg-gray-100 dark:bg-slate-700'}`}>
                {post.likeCount || 0}
              </span>
            </button>
            {!isAuthenticated && (
              <span className="text-sm text-gray-500 dark:text-slate-400 italic">Sign in to like this post</span>
            )}
          </div>

          {isAuthor && isAuthenticated && (
            <div className="flex gap-4 pt-6 border-t border-gray-200 dark:border-slate-700">
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
                onClick={() => {
                  setDeleteError('');
                  setIsDeleteModalOpen(true);
                }}
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

        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-3xl shadow-2xl p-10 animate-fade-in border border-white/50 dark:border-slate-700/50">
          <h2 className="text-4xl font-bold mb-6 text-gray-900 dark:text-slate-100 flex items-center gap-3">
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
                  className="w-full px-4 py-3 border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 rounded-xl focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100 dark:focus:ring-violet-900/40 transition-all duration-300 resize-none"
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
            <div className="mb-8 p-5 bg-gradient-to-r from-violet-50 to-fuchsia-50 dark:from-slate-700 dark:to-slate-600 border-2 border-violet-200 dark:border-slate-600 rounded-2xl">
              <p className="text-gray-700 dark:text-slate-300 font-medium">
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
                <p className="text-gray-500 dark:text-slate-400">No comments yet. Be the first to share your thoughts!</p>
              </div>
            ) : (
              comments.map((comment, index) => {
                const commentAuthorName = (comment.authorName || 'Unknown User').trim();
                const commentAuthorInitial = commentAuthorName.charAt(0).toUpperCase();
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
                    className="bg-gradient-to-r from-violet-50 via-purple-50 to-fuchsia-50 dark:from-slate-700 dark:via-slate-700 dark:to-slate-600 border-l-4 border-violet-500 dark:border-violet-600 rounded-r-2xl p-5 hover:shadow-lg dark:hover:shadow-slate-900/50 transition-all duration-300 animate-slide-up"
                    style={{ animationDelay: `${index * 100}ms`}}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-10 h-10 bg-gradient-to-br ${gradient} rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg ring-2 ring-white`}>
                        {commentAuthorInitial}
                      </div>
                      <Link 
                        to={`/profile/${commentAuthorName}`}
                        className="font-bold text-gray-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition-colors duration-200"
                      >
                        {commentAuthorName}
                      </Link>
                      <span className="text-gray-400 dark:text-slate-500">•</span>
                      <span className="text-sm text-gray-600 dark:text-slate-400 font-medium">{formatRelativeTime(comment.createdAt)}</span>
                    </div>
                    <p className="text-gray-700 dark:text-slate-300 ml-12 whitespace-pre-wrap leading-relaxed">{comment.content}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!isDeleting) {
            setIsDeleteModalOpen(false);
            setDeleteError('');
          }
        }}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
        errorMessage={deleteError}
      />
    </div>
  );
}
