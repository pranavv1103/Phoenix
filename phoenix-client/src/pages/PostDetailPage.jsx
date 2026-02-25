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
  const [payLoading, setPayLoading] = useState(false);
  const [showBackTop, setShowBackTop] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingContent, setEditingContent] = useState('');
  const [commentPage, setCommentPage] = useState(null);  // PagedResponse from backend
  const [commentPageNum, setCommentPageNum] = useState(0);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const COMMENTS_PAGE_SIZE = 10;

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

  useEffect(() => {
    const handleScroll = () => setShowBackTop(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  const fetchComments = useCallback(async (page = 0) => {
    setCommentsLoading(true);
    try {
      const response = await client.get(`/api/posts/${id}/comments`, {
        params: { page, size: COMMENTS_PAGE_SIZE },
      });
      const paged = response.data.data;          // PagedResponse
      setCommentPage(paged);
      setComments(paged.content);
      setCommentPageNum(paged.pageNumber);
    } catch {
      console.error('Failed to load comments');
    } finally {
      setCommentsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPost();
    fetchComments(0);
  }, [fetchPost, fetchComments]);

  const handlePay = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setPayLoading(true);
    try {
      const orderRes = await client.post('/api/payments/create-order', { postId: id });
      const { orderId, amount, currency, keyId } = orderRes.data;

      const options = {
        key: keyId,
        amount: amount,
        currency: currency,
        name: 'Phoenix Blog',
        description: post?.title,
        order_id: orderId,
        handler: async (response) => {
          try {
            await client.post('/api/payments/verify', {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            await fetchPost(); // reload full content
          } catch {
            alert('Payment verification failed. Please contact support.');
          }
        },
        prefill: { email: user?.email || '' },
        theme: { color: '#6366f1' },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to initiate payment');
    } finally {
      setPayLoading(false);
    }
  };

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
      // After posting, jump to last page to see the new comment
      // We'll find the last page from current totalElements + 1
      const newTotal = (commentPage?.totalElements ?? 0) + 1;
      const newLastPage = Math.max(0, Math.ceil(newTotal / COMMENTS_PAGE_SIZE) - 1);
      fetchComments(newLastPage);
    } catch {
      alert('Failed to post comment');
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await client.delete(`/api/posts/${id}/comments/${commentId}`);
      // After deletion, if this was the last item on a non-first page, go back one page
      const remainingOnPage = comments.length - 1;
      const targetPage = remainingOnPage === 0 && commentPageNum > 0
        ? commentPageNum - 1
        : commentPageNum;
      fetchComments(targetPage);
    } catch {
      alert('Failed to delete comment');
    }
  };

  const handleEditComment = (comment) => {
    setEditingCommentId(comment.id);
    setEditingContent(comment.content);
  };

  const handleUpdateComment = async (commentId) => {
    if (!editingContent.trim()) return;
    try {
      await client.put(`/api/posts/${id}/comments/${commentId}`, { content: editingContent });
      setEditingCommentId(null);
      setEditingContent('');
      fetchComments(commentPageNum);
    } catch {
      alert('Failed to update comment');
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
            <div className="flex items-start gap-3 flex-wrap mb-4">
              <h1 className="text-5xl font-bold text-gray-900 dark:text-slate-100 leading-tight">{post.title}</h1>
              {post.isPremium && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-amber-400 to-orange-400 text-white text-sm font-bold rounded-full shadow-md mt-2 whitespace-nowrap">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  Premium • ₹{(post.price / 100).toFixed(0)}
                </span>
              )}
            </div>
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
              <span className="text-gray-400 dark:text-slate-500">•</span>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {post.readingTimeMinutes || 1} min read
              </span>
              <span className="text-gray-400 dark:text-slate-500">•</span>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 dark:text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                {post.viewCount || 0} views
              </span>
            </div>
          </div>
          
          <div className="h-1.5 bg-gradient-to-r from-cyan-500 via-blue-500 via-violet-500 to-fuchsia-500 rounded-full mb-6"></div>

          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8">
              {post.tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center px-3 py-1 bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 rounded-full text-sm font-semibold border border-violet-300 dark:border-violet-700"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
          
          {/* Content — gated for premium posts */}
          {post.isPremium && !post.paidByCurrentUser && !isAuthor ? (
            <div className="mb-6">
              <div data-color-mode="auto" className="mb-4">
                <MarkdownPreview
                  source={postContent}
                  style={{ backgroundColor: 'transparent', padding: 0 }}
                  className="!bg-transparent"
                />
              </div>
              {/* Paywall banner */}
              <div className="relative mt-4 rounded-2xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/70 to-white dark:via-slate-900/70 dark:to-slate-900 pointer-events-none" />
                <div className="relative z-10 flex flex-col items-center text-center px-8 py-10 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-800 dark:to-slate-700 border-2 border-amber-300 dark:border-amber-600 rounded-2xl shadow-xl">
                  <div className="p-4 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl shadow-lg mb-4">
                    <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">This is a Premium Post</h3>
                  <p className="text-gray-600 dark:text-slate-300 mb-6 max-w-md">
                    Unlock the full article for <span className="font-bold text-amber-600 dark:text-amber-400">₹{(post.price / 100).toFixed(0)}</span>. One-time payment, read anytime.
                  </p>
                  {isAuthenticated ? (
                    <button
                      onClick={handlePay}
                      disabled={payLoading}
                      className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl shadow-lg disabled:opacity-60 disabled:cursor-not-allowed text-lg"
                    >
                      {payLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                          Unlock for ₹{(post.price / 100).toFixed(0)}
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <p className="text-gray-600 dark:text-slate-400">
                        <Link to="/login" className="text-amber-600 hover:underline font-bold">Sign in</Link> to unlock this post
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-6" data-color-mode="auto">
              <MarkdownPreview
                source={postContent}
                style={{ backgroundColor: 'transparent', padding: 0 }}
                className="!bg-transparent"
              />
            </div>
          )}

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
            <div className="relative ml-auto">
              <button
                onClick={() => setShowShare(!showShare)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:border-blue-400 hover:text-blue-500 dark:hover:border-blue-500 dark:hover:text-blue-400 transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                <span>Share</span>
              </button>
              {showShare && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 z-20 overflow-hidden">
                  <button
                    onClick={() => { navigator.clipboard.writeText(window.location.href); setShowShare(false); }}
                    className="flex items-center gap-3 w-full px-4 py-3 text-sm font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy link
                  </button>
                  <a
                    href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(post.title)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 w-full px-4 py-3 text-sm font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    onClick={() => setShowShare(false)}
                  >
                    <svg className="w-5 h-5 text-sky-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.736-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    Share on X
                  </a>
                  <a
                    href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 w-full px-4 py-3 text-sm font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    onClick={() => setShowShare(false)}
                  >
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                    Share on LinkedIn
                  </a>
                </div>
              )}
            </div>
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
            <span>Comments ({commentPage ? commentPage.totalElements : comments.length})</span>
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
                      {isAuthenticated && user?.email === comment.authorEmail && (
                        <div className="ml-auto flex items-center gap-1">
                          <button
                            onClick={() => handleEditComment(comment)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-slate-600 dark:hover:text-blue-400 transition-colors"
                            title="Edit comment"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-slate-600 dark:hover:text-red-400 transition-colors"
                            title="Delete comment"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                    {editingCommentId === comment.id ? (
                      <div className="ml-12">
                        <textarea
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          className="w-full px-3 py-2 border-2 border-violet-400 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 resize-none focus:outline-none focus:ring-2 focus:ring-violet-300 transition-all"
                          rows="3"
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handleUpdateComment(comment.id)}
                            className="px-4 py-1.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-semibold rounded-lg hover:from-violet-700 hover:to-fuchsia-700 transition-all"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => { setEditingCommentId(null); setEditingContent(''); }}
                            className="px-4 py-1.5 bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-slate-300 text-sm font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-slate-500 transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-700 dark:text-slate-300 ml-12 whitespace-pre-wrap leading-relaxed">{comment.content}</p>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Comments loading spinner (page transitions) */}
          {commentsLoading && (
            <div className="flex justify-center py-4">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
            </div>
          )}

          {/* Pagination controls */}
          {commentPage && commentPage.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-slate-700">
              <button
                onClick={() => fetchComments(commentPageNum - 1)}
                disabled={commentPage.first || commentsLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-violet-50 dark:hover:bg-slate-600 hover:text-violet-600 dark:hover:text-violet-400 hover:border-violet-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: commentPage.totalPages }, (_, i) => {
                  // Show at most 5 page buttons; ellipsis otherwise
                  const total = commentPage.totalPages;
                  const cur = commentPageNum;
                  const show =
                    total <= 5 ||
                    i === 0 ||
                    i === total - 1 ||
                    Math.abs(i - cur) <= 1;
                  const showLeft = i === 1 && cur > 2 && total > 5;
                  const showRight = i === total - 2 && cur < total - 3 && total > 5;
                  if (showLeft || showRight) {
                    return (
                      <span key={i} className="px-1 text-gray-400 dark:text-slate-500 select-none">…</span>
                    );
                  }
                  if (!show) return null;
                  return (
                    <button
                      key={i}
                      onClick={() => fetchComments(i)}
                      disabled={commentsLoading}
                      className={`w-9 h-9 rounded-xl font-semibold text-sm transition-all shadow-sm ${
                        i === commentPageNum
                          ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-violet-200 dark:shadow-violet-900'
                          : 'bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-violet-50 dark:hover:bg-slate-600 hover:text-violet-600 dark:hover:text-violet-400'
                      }`}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => fetchComments(commentPageNum + 1)}
                disabled={commentPage.last || commentsLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-violet-50 dark:hover:bg-slate-600 hover:text-violet-600 dark:hover:text-violet-400 hover:border-violet-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              >
                Next
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}

          {/* Page info text when there are multiple pages */}
          {commentPage && commentPage.totalPages > 1 && (
            <p className="text-center text-sm text-gray-500 dark:text-slate-500 mt-2">
              Page {commentPageNum + 1} of {commentPage.totalPages} · {commentPage.totalElements} comments
            </p>
          )}
        </div>
      </div>

      {showBackTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-8 right-8 z-50 p-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-full shadow-2xl hover:shadow-violet-500/30 hover:scale-110 transition-all duration-300"
          aria-label="Back to top"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      )}

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
