import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import client from '../api/client';
import useAuthStore from '../store/authStore';
import { formatRelativeTime } from '../utils/dateUtils';
import { sanitizeHtml } from '../utils/sanitize';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import MarkdownPreview from '@uiw/react-markdown-preview';

const colorFromString = (str) => {
  const colors = ['bg-rose-500','bg-orange-500','bg-amber-500','bg-green-600','bg-teal-600','bg-cyan-600','bg-blue-600','bg-indigo-600','bg-violet-600','bg-purple-600'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

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
  const [replyingToId, setReplyingToId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [commentPage, setCommentPage] = useState(null);
  const [commentPageNum, setCommentPageNum] = useState(0);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  const [relatedPosts, setRelatedPosts] = useState([]);
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
    const handleScroll = () => {
      setShowBackTop(window.scrollY > 300);
      const el = document.documentElement;
      const scrolled = el.scrollTop || document.body.scrollTop;
      const total = el.scrollHeight - el.clientHeight;
      setReadingProgress(total > 0 ? Math.min(100, (scrolled / total) * 100) : 0);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLike = async () => {
    if (!isAuthenticated) { navigate('/login'); return; }
    try {
      const response = await client.post(`/api/posts/${id}/like`);
      const { likeCount, likedByCurrentUser } = response.data.data;
      setPost(prev => ({ ...prev, likeCount, likedByCurrentUser }));
    } catch (err) { console.error('Failed to toggle like', err); }
  };

  const handleBookmark = async () => {
    if (!isAuthenticated) { navigate('/login'); return; }
    try {
      const response = await client.post(`/api/bookmarks/${id}`);
      const saved = response.data.data;
      setPost(prev => ({ ...prev, bookmarkedByCurrentUser: saved }));
    } catch (err) { console.error('Failed to toggle bookmark', err); }
  };

  const fetchComments = useCallback(async (page = 0) => {
    setCommentsLoading(true);
    try {
      const response = await client.get(`/api/posts/${id}/comments`, { params: { page, size: COMMENTS_PAGE_SIZE } });
      const paged = response.data.data;
      setCommentPage(paged);
      setComments(paged.content);
      setCommentPageNum(paged.pageNumber);
    } catch { console.error('Failed to load comments'); }
    finally { setCommentsLoading(false); }
  }, [id]);

  useEffect(() => {
    fetchPost();
    fetchComments(0);
  }, [fetchPost, fetchComments]);

  useEffect(() => {
    if (!id) return;
    client.get(`/api/posts/${id}/related`).then(res => {
      setRelatedPosts(res.data.data || []);
    }).catch(() => {});
  }, [id]);

  const handlePay = async () => {
    if (!isAuthenticated) { navigate('/login'); return; }
    setPayLoading(true);
    try {
      const orderRes = await client.post('/api/payments/create-order', { postId: id });
      const { orderId, amount, currency, keyId } = orderRes.data;
      const options = {
        key: keyId, amount, currency,
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
            await fetchPost();
          } catch { alert('Payment verification failed. Please contact support.'); }
        },
        prefill: { email: user?.email || '' },
        theme: { color: '#16a34a' },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to initiate payment');
    } finally { setPayLoading(false); }
  };

  const handleDelete = async () => {
    setDeleteError('');
    setIsDeleting(true);
    try {
      await client.delete(`/api/posts/${id}`);
      setIsDeleteModalOpen(false);
      navigate('/');
    } catch { setDeleteError('Failed to delete post'); }
    finally { setIsDeleting(false); }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      await client.post(`/api/posts/${id}/comments`, { content: newComment });
      setNewComment('');
      fetchComments(0);
    } catch { alert('Failed to post comment'); }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await client.delete(`/api/posts/${id}/comments/${commentId}`);
      const remainingOnPage = comments.length - 1;
      const targetPage = remainingOnPage === 0 && commentPageNum > 0 ? commentPageNum - 1 : commentPageNum;
      fetchComments(targetPage);
    } catch { alert('Failed to delete comment'); }
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
    } catch { alert('Failed to update comment'); }
  };

  const handleReplySubmit = async (parentId) => {
    if (!replyText.trim()) return;
    try {
      await client.post(`/api/posts/${id}/comments`, { content: replyText, parentId });
      setReplyText('');
      setReplyingToId(null);
      fetchComments(0);
    } catch { alert('Failed to post reply'); }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-slate-950 gap-3">
        <div className="w-8 h-8 border-2 border-gray-200 dark:border-slate-700 border-t-green-600 rounded-full animate-spin"></div>
        <p className="text-sm text-gray-500 dark:text-slate-400">Loading post...</p>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-slate-950 gap-4">
        <p className="text-gray-600 dark:text-slate-400">{error || 'Post not found'}</p>
        <button onClick={() => navigate('/')} className="text-sm text-green-600 dark:text-green-400 hover:underline font-medium">Back to Home</button>
      </div>
    );
  }

  const isAuthor = user?.email === post.authorEmail;
  const postAuthorName = (post.authorName || 'Unknown User').trim();
  const postAuthorInitial = postAuthorName.charAt(0).toUpperCase();
  const postContent = typeof post.content === 'string' ? post.content : String(post.content ?? '');
  const authorColor = colorFromString(postAuthorName);

  return (
    <>
      {/* Reading progress bar */}
      <div className="fixed top-0 left-0 z-50 h-0.5 bg-green-500 transition-all duration-100" style={{ width: `${readingProgress}%` }} />

      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 py-10 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Back link */}
          <button
            onClick={() => navigate('/')}
            className="mb-6 flex items-center gap-1.5 text-sm text-gray-500 dark:text-slate-400 hover:text-green-600 dark:hover:text-green-400 font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to all posts
          </button>

          {/* Main post card */}
          <article className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm p-6 sm:p-10 mb-6">
            {/* Header */}
            <div className="mb-6">
              <div className="flex flex-wrap items-start gap-3 mb-4">
                <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-white leading-tight">{post.title}</h1>
                {post.isPremium && (
                  <span className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold rounded-full border border-amber-200 dark:border-amber-700/50 mt-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    Premium · ₹{(post.price / 100).toFixed(0)}
                  </span>
                )}
              </div>

              {/* Author + meta */}
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <div className={`w-9 h-9 ${authorColor} rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                    {postAuthorInitial}
                  </div>
                  <Link
                    to={`/profile/${encodeURIComponent(postAuthorName)}`}
                    className="font-semibold text-gray-900 dark:text-white hover:text-green-600 dark:hover:text-green-400 transition-colors"
                  >
                    {postAuthorName}
                  </Link>
                </div>
                <span className="text-gray-300 dark:text-slate-700">·</span>
                <span>{formatRelativeTime(post.createdAt)}</span>
                {post.createdAt !== post.updatedAt && (
                  <>
                    <span className="text-gray-300 dark:text-slate-700">·</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">Updated</span>
                  </>
                )}
                <span className="text-gray-300 dark:text-slate-700">·</span>
                <span>{post.readingTimeMinutes || 1} min read</span>
                <span className="text-gray-300 dark:text-slate-700">·</span>
                <span>{post.viewCount || 0} views</span>
              </div>
            </div>

            <hr className="border-gray-100 dark:border-slate-800 mb-6" />

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8">
                {post.tags.map(tag => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 rounded-full text-xs font-medium border border-gray-200 dark:border-slate-700"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Content — gated for premium posts */}
            {post.isPremium && !post.paidByCurrentUser && !isAuthor ? (
              <div className="rounded-2xl border border-amber-200 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-900/10 p-8 text-center mb-6">
                <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">This is a Premium Post</h3>
                <p className="text-sm text-gray-600 dark:text-slate-400 mb-5 max-w-sm mx-auto">
                  Unlock the full article for <span className="font-bold text-amber-600 dark:text-amber-400">₹{(post.price / 100).toFixed(0)}</span>. One-time payment, read anytime.
                </p>
                {isAuthenticated ? (
                  <button
                    onClick={handlePay}
                    disabled={payLoading}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-full transition-colors disabled:opacity-60 text-sm"
                  >
                    {payLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        Unlock for ₹{(post.price / 100).toFixed(0)}
                      </>
                    )}
                  </button>
                ) : (
                  <p className="text-sm text-gray-600 dark:text-slate-400">
                    <Link to="/login" className="text-amber-600 hover:underline font-semibold">Sign in</Link> to unlock this post
                  </p>
                )}
              </div>
            ) : (
              <div className="mb-6 prose-sm sm:prose dark:prose-invert max-w-none" data-color-mode="auto">
                <MarkdownPreview
                  source={postContent}
                  style={{ backgroundColor: 'transparent', padding: 0 }}
                  className="!bg-transparent"
                />
              </div>
            )}

            {/* Action bar */}
            <div className="flex items-center gap-3 py-4 border-t border-gray-100 dark:border-slate-800 flex-wrap">
              <button
                onClick={handleLike}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
                  post.likedByCurrentUser
                    ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800'
                    : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:border-red-300 hover:text-red-500'
                }`}
              >
                <svg className="w-4 h-4" fill={post.likedByCurrentUser ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                {post.likeCount || 0}
              </button>

              <button
                onClick={handleBookmark}
                title={post.bookmarkedByCurrentUser ? 'Remove bookmark' : 'Bookmark'}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
                  post.bookmarkedByCurrentUser
                    ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                    : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:border-amber-300 hover:text-amber-500'
                }`}
              >
                <svg className="w-4 h-4" fill={post.bookmarkedByCurrentUser ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                {post.bookmarkedByCurrentUser ? 'Saved' : 'Save'}
              </button>

              {!isAuthenticated && (
                <span className="text-xs text-gray-400 dark:text-slate-500">Sign in to interact</span>
              )}

              {/* Share */}
              <div className="relative ml-auto">
                <button
                  onClick={() => setShowShare(!showShare)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:border-gray-300 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Share
                </button>
                {showShare && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-gray-200 dark:border-slate-800 z-20 overflow-hidden">
                    <button
                      onClick={() => { navigator.clipboard.writeText(window.location.href); setShowShare(false); }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy link
                    </button>
                    <a
                      href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(post.title)}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                      onClick={() => setShowShare(false)}
                    >
                      <svg className="w-4 h-4 text-sky-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.736-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                      Share on X
                    </a>
                    <a
                      href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                      onClick={() => setShowShare(false)}
                    >
                      <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                      Share on LinkedIn
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Author actions */}
            {isAuthor && isAuthenticated && (
              <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
                <Link
                  to={`/posts/${id}/edit`}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full hover:bg-gray-700 dark:hover:bg-gray-200 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Post
                </Link>
                <button
                  onClick={() => { setDeleteError(''); setIsDeleteModalOpen(true); }}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete Post
                </button>
              </div>
            )}
          </article>

          {/* Related Posts */}
          {relatedPosts.length > 0 && (
            <div className="mb-6">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <span className="w-1 h-5 bg-green-500 rounded-full inline-block"></span>
                More to Read
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {relatedPosts.map(rp => (
                  <Link
                    key={rp.id}
                    to={`/posts/${rp.id}`}
                    className="group flex flex-col bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4 hover:border-green-300 dark:hover:border-green-700/50 hover:shadow-md transition-all"
                  >
                    {/* Tags row */}
                    {rp.tags && rp.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {rp.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="px-2 py-0.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full text-xs font-medium border border-green-100 dark:border-green-800/40">#{tag}</span>
                        ))}
                      </div>
                    )}
                    {/* Title */}
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 mb-2 group-hover:text-green-700 dark:group-hover:text-green-400 transition-colors leading-snug flex-1">{rp.title}</h3>
                    {/* Meta */}
                    <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${colorFromString(rp.authorName || 'A')}`}>
                          {(rp.authorName || 'A')[0].toUpperCase()}
                        </div>
                        <span className="text-xs text-gray-500 dark:text-slate-400 truncate max-w-[100px]">{rp.authorName}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-slate-500">
                        <span>{rp.readingTimeMinutes || 1} min read</span>
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                          {rp.likeCount || 0}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Comments */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm p-6 sm:p-8">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">
              Comments ({commentPage ? commentPage.totalElements : comments.length})
            </h2>

            {isAuthenticated ? (
              <form onSubmit={handleCommentSubmit} className="mb-8">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Share your thoughts..."
                  className="w-full px-4 py-3 text-sm border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 rounded-xl focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 dark:focus:ring-green-900/20 transition-all resize-none mb-3"
                  rows="4"
                  required
                />
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full hover:bg-gray-700 dark:hover:bg-gray-200 transition-colors"
                >
                  Post Comment
                </button>
              </form>
            ) : (
              <div className="mb-8 p-4 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-600 dark:text-slate-400">
                <Link to="/login" className="text-green-600 dark:text-green-400 font-semibold hover:underline">Sign in</Link> to join the conversation
              </div>
            )}

            {/* Comment list */}
            <div className="space-y-1">
              {comments.length === 0 ? (
                <div className="text-center py-10 text-gray-400 dark:text-slate-500 text-sm">
                  No comments yet. Be the first to share your thoughts!
                </div>
              ) : (
                comments.map((comment) => {
                  const commentAuthorName = (comment.authorName || 'Unknown User').trim();
                  const commentColor = colorFromString(commentAuthorName);
                  return (
                    <div key={comment.id} className="py-4 border-b border-gray-50 dark:border-slate-800/60 last:border-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-7 h-7 ${commentColor} rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                          {commentAuthorName.charAt(0).toUpperCase()}
                        </div>
                        <Link
                          to={`/profile/${encodeURIComponent(commentAuthorName)}`}
                          className="text-sm font-semibold text-gray-900 dark:text-white hover:text-green-600 dark:hover:text-green-400 transition-colors"
                        >
                          {commentAuthorName}
                        </Link>
                        <span className="text-xs text-gray-400 dark:text-slate-500">{formatRelativeTime(comment.createdAt)}</span>
                        {isAuthenticated && user?.email === comment.authorEmail && (
                          <div className="ml-auto flex items-center gap-1">
                            <button onClick={() => handleEditComment(comment)} className="p-1 rounded text-gray-400 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors" title="Edit">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            <button onClick={() => handleDeleteComment(comment.id)} className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors" title="Delete">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        )}
                      </div>
                      {editingCommentId === comment.id ? (
                        <div className="ml-9">
                          <textarea
                            value={editingContent}
                            onChange={(e) => setEditingContent(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg resize-none focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-200"
                            rows="3"
                          />
                          <div className="flex gap-2 mt-2">
                            <button onClick={() => handleUpdateComment(comment.id)} className="px-3 py-1.5 text-xs font-semibold bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg">Save</button>
                            <button onClick={() => { setEditingCommentId(null); setEditingContent(''); }} className="px-3 py-1.5 text-xs font-semibold bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <p className="ml-9 text-sm text-gray-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{comment.content}</p>
                      )}

                      {/* Reply button */}
                      {isAuthenticated && editingCommentId !== comment.id && (
                        <div className="ml-9 mt-2">
                          <button
                            onClick={() => setReplyingToId(replyingToId === comment.id ? null : comment.id)}
                            className="text-xs font-medium text-gray-400 dark:text-slate-500 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                          >
                            {replyingToId === comment.id ? 'Cancel' : `↩ Reply${comment.replies?.length ? ` · ${comment.replies.length}` : ''}`}
                          </button>
                        </div>
                      )}

                      {/* Inline reply input */}
                      {replyingToId === comment.id && (
                        <div className="ml-9 mt-3">
                          <div className="flex gap-2">
                            <textarea
                              autoFocus
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder={`Reply to ${commentAuthorName}…`}
                              className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 rounded-xl resize-none focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 dark:focus:ring-green-900/20"
                              rows="2"
                            />
                            <button
                              onClick={() => handleReplySubmit(comment.id)}
                              disabled={!replyText.trim()}
                              className="self-end px-3 py-2 text-xs font-semibold bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              Reply
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Nested replies */}
                      {comment.replies && comment.replies.length > 0 && (
                        <div className="ml-9 mt-3 space-y-3 border-l-2 border-gray-100 dark:border-slate-800 pl-4">
                          {comment.replies.map((reply) => {
                            const replyAuthorName = (reply.authorName || 'Unknown User').trim();
                            const replyColor = colorFromString(replyAuthorName);
                            return (
                              <div key={reply.id} className="pt-3 first:pt-0">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <div className={`w-6 h-6 ${replyColor} rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                                    {replyAuthorName.charAt(0).toUpperCase()}
                                  </div>
                                  <Link
                                    to={`/profile/${encodeURIComponent(replyAuthorName)}`}
                                    className="text-sm font-semibold text-gray-900 dark:text-white hover:text-green-600 dark:hover:text-green-400 transition-colors"
                                  >
                                    {replyAuthorName}
                                  </Link>
                                  <span className="text-xs text-gray-400 dark:text-slate-500">{formatRelativeTime(reply.createdAt)}</span>
                                  {isAuthenticated && user?.email === reply.authorEmail && (
                                    <div className="ml-auto flex items-center gap-1">
                                      <button onClick={() => handleEditComment(reply)} className="p-1 rounded text-gray-400 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors" title="Edit">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                      </button>
                                      <button onClick={() => handleDeleteComment(reply.id)} className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors" title="Delete">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                      </button>
                                    </div>
                                  )}
                                </div>
                                {editingCommentId === reply.id ? (
                                  <div className="ml-8">
                                    <textarea
                                      value={editingContent}
                                      onChange={(e) => setEditingContent(e.target.value)}
                                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg resize-none focus:outline-none focus:border-green-500"
                                      rows="2"
                                    />
                                    <div className="flex gap-2 mt-1.5">
                                      <button onClick={() => handleUpdateComment(reply.id)} className="px-3 py-1.5 text-xs font-semibold bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg">Save</button>
                                      <button onClick={() => { setEditingCommentId(null); setEditingContent(''); }} className="px-3 py-1.5 text-xs font-semibold bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg">Cancel</button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="ml-8 text-sm text-gray-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{reply.content}</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {commentsLoading && (
              <div className="flex justify-center py-4">
                <div className="w-5 h-5 border-2 border-gray-200 dark:border-slate-700 border-t-green-600 rounded-full animate-spin"></div>
              </div>
            )}

            {/* Comment pagination */}
            {commentPage && commentPage.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100 dark:border-slate-800">
                <button
                  onClick={() => fetchComments(commentPageNum - 1)}
                  disabled={commentPage.first || commentsLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: commentPage.totalPages }, (_, i) => {
                    const total = commentPage.totalPages;
                    const cur = commentPageNum;
                    const show = total <= 5 || i === 0 || i === total - 1 || Math.abs(i - cur) <= 1;
                    const showLeft = i === 1 && cur > 2 && total > 5;
                    const showRight = i === total - 2 && cur < total - 3 && total > 5;
                    if (showLeft || showRight) return <span key={i} className="px-1 text-gray-400 dark:text-slate-500">…</span>;
                    if (!show) return null;
                    return (
                      <button
                        key={i}
                        onClick={() => fetchComments(i)}
                        disabled={commentsLoading}
                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                          i === commentPageNum
                            ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                            : 'border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'
                        }`}
                      >{i + 1}</button>
                    );
                  })}
                </div>
                <button
                  onClick={() => fetchComments(commentPageNum + 1)}
                  disabled={commentPage.last || commentsLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            )}
            {commentPage && commentPage.totalPages > 1 && (
              <p className="text-center text-xs text-gray-400 dark:text-slate-500 mt-2">
                Page {commentPageNum + 1} of {commentPage.totalPages} · {commentPage.totalElements} comments
              </p>
            )}
          </div>
        </div>

        {/* Back to top */}
        {showBackTop && (
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-8 right-8 z-50 p-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full shadow-lg hover:bg-gray-700 dark:hover:bg-gray-200 transition-colors"
            aria-label="Back to top"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          </button>
        )}

        <ConfirmDeleteModal
          isOpen={isDeleteModalOpen}
          onClose={() => { if (!isDeleting) { setIsDeleteModalOpen(false); setDeleteError(''); } }}
          onConfirm={handleDelete}
          isDeleting={isDeleting}
          errorMessage={deleteError}
        />
      </div>
    </>
  );
}
