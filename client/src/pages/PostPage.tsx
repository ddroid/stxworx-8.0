import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, Heart, MessageCircle, MoreHorizontal } from 'lucide-react';
import * as Shared from '../shared';
import {
  createSocialPostComment,
  formatRelativeTime,
  getSocialPost,
  getSocialPostComments,
  toggleSocialPostLike,
  toApiAssetUrl,
  toDisplayName,
  type ApiSocialComment,
  type ApiSocialPost,
} from '../lib/api';

export const PostPage = () => {
  const { id } = useParams();
  const { isSignedIn, walletAddress } = Shared.useWallet();
  const [post, setPost] = useState<ApiSocialPost | null>(null);
  const [comments, setComments] = useState<ApiSocialComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [togglingLike, setTogglingLike] = useState(false);

  const postId = Number(id);
  const isValidPostId = Number.isInteger(postId) && postId > 0;
  const canInteract = isSignedIn && Boolean(walletAddress);

  useEffect(() => {
    let isMounted = true;

    if (!isValidPostId) {
      setPost(null);
      setComments([]);
      setLoading(false);
      return;
    }

    const loadPostData = async () => {
      setLoading(true);

      try {
        const [postResponse, commentsResponse] = await Promise.all([
          getSocialPost(postId),
          getSocialPostComments(postId),
        ]);

        if (!isMounted) {
          return;
        }

        setPost(postResponse);
        setComments(commentsResponse);
      } catch (error) {
        console.error('Failed to load post:', error);
        if (isMounted) {
          setPost(null);
          setComments([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadPostData();

    return () => {
      isMounted = false;
    };
  }, [isValidPostId, postId]);

  const handleToggleLike = async () => {
    if (!post || !canInteract || togglingLike) {
      return;
    }

    setTogglingLike(true);

    try {
      const response = await toggleSocialPostLike(post.id);
      setPost((current) =>
        current
          ? {
              ...current,
              likesCount: response.likesCount,
              likedByViewer: response.likedByViewer,
            }
          : current,
      );
    } catch (error) {
      console.error('Failed to toggle post like:', error);
    } finally {
      setTogglingLike(false);
    }
  };

  const handlePostComment = async () => {
    const content = newComment.trim();
    if (!post || !content || !canInteract || submittingComment) {
      return;
    }

    setSubmittingComment(true);

    try {
      const created = await createSocialPostComment(post.id, { content });
      setComments((current) => [created, ...current]);
      setPost((current) =>
        current
          ? {
              ...current,
              commentsCount: current.commentsCount + 1,
            }
          : current,
      );
      setNewComment('');
    } catch (error) {
      console.error('Failed to create comment:', error);
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <div className="pt-28 pb-20 px-6 md:pl-[92px]">
        <div className="container-custom max-w-3xl">
          <div className="card p-6 text-sm text-muted">Loading post...</div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="pt-28 pb-20 px-6 md:pl-[92px]">
        <div className="container-custom max-w-3xl">
          <div className="flex items-center gap-4 mb-8">
            <Link to="/" className="w-10 h-10 bg-surface border border-border rounded-[10px] flex items-center justify-center text-muted hover:text-ink hover:border-ink transition-colors">
              <ChevronLeft size={20} />
            </Link>
            <h1 className="text-2xl font-black tracking-tighter">Post</h1>
          </div>
          <div className="card p-6 text-sm text-muted">This post could not be found.</div>
        </div>
      </div>
    );
  }

  const authorName = toDisplayName({ name: post.authorName, username: post.authorUsername, stxAddress: post.authorStxAddress });
  const avatarUrl = toApiAssetUrl(post.authorAvatar);
  const imageUrl = toApiAssetUrl(post.imageUrl);

  return (
    <div className="pt-28 pb-20 px-6 md:pl-[92px]">
      <div className="container-custom max-w-3xl">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/" className="w-10 h-10 bg-surface border border-border rounded-[10px] flex items-center justify-center text-muted hover:text-ink hover:border-ink transition-colors">
            <ChevronLeft size={20} />
          </Link>
          <h1 className="text-2xl font-black tracking-tighter">Post</h1>
        </div>

        <div className="card p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {avatarUrl ? (
                <img src={avatarUrl} className="w-12 h-12 rounded-[10px] object-cover" alt={authorName} referrerPolicy="no-referrer" />
              ) : (
                <div className="w-12 h-12 rounded-[10px] bg-surface border border-border flex items-center justify-center text-xs font-black uppercase">
                  {authorName.slice(0, 2)}
                </div>
              )}
              <div>
                <h4 className="font-bold text-base">{authorName}</h4>
                <p className="text-xs text-muted">{formatRelativeTime(post.createdAt)}</p>
              </div>
            </div>
            <button className="text-muted hover:text-ink"><MoreHorizontal size={20} /></button>
          </div>
          {post.content && <p className="text-base mb-6 leading-relaxed">{post.content}</p>}
          {imageUrl && (
            <img src={imageUrl} className="w-full rounded-[15px] mb-6 object-cover max-h-96" alt="Post content" referrerPolicy="no-referrer" />
          )}
          <div className="flex items-center gap-8 text-muted border-t border-border pt-4">
            <button
              onClick={handleToggleLike}
              disabled={!canInteract || togglingLike}
              className={`flex items-center gap-2 text-sm font-bold transition-colors ${post.likedByViewer ? 'text-accent-red' : 'hover:text-accent-red'} ${canInteract ? '' : 'cursor-not-allowed opacity-60'}`}
            >
              <Heart size={20} /> {post.likesCount}
            </button>
            <div className="flex items-center gap-2 text-sm font-bold text-accent-blue">
              <MessageCircle size={20} /> {post.commentsCount}
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="font-black text-lg mb-6">Comments ({post.commentsCount})</h3>

          {canInteract ? (
            <div className="flex gap-4 items-start mb-8">
              <div className="w-10 h-10 rounded-[10px] bg-surface border border-border flex items-center justify-center text-[10px] font-black uppercase shrink-0">
                {(walletAddress || 'YO').slice(0, 2)}
              </div>
              <div className="flex-1">
                <textarea
                  value={newComment}
                  onChange={(event) => setNewComment(event.target.value)}
                  placeholder="Write a comment..."
                  className="w-full bg-ink/5 border border-border rounded-[15px] p-4 text-sm focus:ring-1 focus:ring-accent-orange outline-none resize-none h-24 mb-3"
                />
                <div className="flex justify-end">
                  <button onClick={handlePostComment} disabled={submittingComment || !newComment.trim()} className="btn-primary py-2 px-6 disabled:opacity-60">
                    {submittingComment ? 'Posting...' : 'Post Comment'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-8 text-sm text-muted">Sign in to join the conversation on this post.</div>
          )}

          <div className="space-y-6">
            {comments.map((comment) => {
              const commentAuthorName = toDisplayName({ name: comment.authorName, username: comment.authorUsername, stxAddress: comment.authorStxAddress });
              const commentAvatarUrl = toApiAssetUrl(comment.authorAvatar);

              return (
                <div key={comment.id} className="flex gap-4">
                  {commentAvatarUrl ? (
                    <img src={commentAvatarUrl} className="w-10 h-10 rounded-[10px] object-cover shrink-0" alt={commentAuthorName} referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-10 h-10 rounded-[10px] bg-surface border border-border flex items-center justify-center text-[10px] font-black uppercase shrink-0">
                      {commentAuthorName.slice(0, 2)}
                    </div>
                  )}
                  <div className="flex-1 bg-ink/5 rounded-[15px] p-4">
                    <div className="flex justify-between items-start mb-2 gap-4">
                      <h4 className="font-bold text-sm">{commentAuthorName}</h4>
                      <span className="text-xs text-muted shrink-0">{formatRelativeTime(comment.createdAt)}</span>
                    </div>
                    <p className="text-sm">{comment.content}</p>
                  </div>
                </div>
              );
            })}
            {comments.length === 0 && (
              <div className="text-sm text-muted">No comments yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
