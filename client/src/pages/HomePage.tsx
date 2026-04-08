import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Bell, Globe, LayoutGrid, Users, BookOpen, Briefcase, Calendar, ShoppingBag, Newspaper,
  ChevronRight, Star, Plus, Heart, MessageSquare, Share2, MapPin, Link as LinkIcon, Twitter, Instagram,
  Facebook, MoreHorizontal, ArrowRight, Filter, CheckCircle2, Trophy, ChevronLeft, ChevronsRight, ChevronDown,
  Wallet, Send, X, Settings, ShieldCheck, LogOut, Mail, Phone, MessageCircle, Sun, Moon, Maximize2, Minimize2,
  HelpCircle, AlertTriangle, Folder, GraduationCap, Home, PenTool, Camera, Edit2, Share, Shield, Upload, FileText,
  Download, Sparkles, Bot, ZoomIn, ZoomOut
} from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import * as Shared from '../shared';
import { PostComposerInput } from '../components/social/PostComposerInput';
import { PostText } from '../components/social/PostText';
import {
  createSocialPostComment,
  deleteSocialPost,
  formatAddress,
  formatRelativeTime,
  getLeaderboard,
  getProjects,
  getSocialFeed,
  getSocialPostComments,
  getSocialPostPath,
  getSocialPostsPagePath,
  getSocialPostShareUrl,
  getUserProfile,
  getUserProfilePath,
  toApiAssetUrl,
  toAppJob,
  toDisplayName,
  toggleSocialPostLike,
  updateSocialPost,
  type ApiSocialComment,
  type ApiSocialPost,
} from '../lib/api';
import type { ApiLeaderboardEntry } from '../types/leaderboard';
import type { AppJob } from '../types/job';

type HomeLeaderboardEntry = ApiLeaderboardEntry & {
  avatar?: string | null;
};

export const HomePage = () => {
  const navigate = useNavigate();
  const { isSignedIn, walletAddress } = Shared.useWallet();
  const DESCRIPTION_PREVIEW_LIMIT = 120;
  const [featuredJobs, setFeaturedJobs] = useState<AppJob[]>([]);
  const [topFreelancers, setTopFreelancers] = useState<HomeLeaderboardEntry[]>([]);
  const [feedPosts, setFeedPosts] = useState<ApiSocialPost[]>([]);
  const [feedComments, setFeedComments] = useState<Record<number, ApiSocialComment[]>>({});
  const [expandedComments, setExpandedComments] = useState<Record<number, boolean>>({});
  const [expandedJobDescriptions, setExpandedJobDescriptions] = useState<Record<number, boolean>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<number, string>>({});
  const [loadingComments, setLoadingComments] = useState<Record<number, boolean>>({});
  const [submittingComments, setSubmittingComments] = useState<Record<number, boolean>>({});
  const [feedMenuPostId, setFeedMenuPostId] = useState<number | null>(null);
  const [editingFeedPostId, setEditingFeedPostId] = useState<number | null>(null);
  const [editingFeedPostContent, setEditingFeedPostContent] = useState('');
  const [feedActionPostId, setFeedActionPostId] = useState<number | null>(null);
  const [feedActionType, setFeedActionType] = useState<'edit' | 'delete' | null>(null);

  const canInteract = isSignedIn && Boolean(walletAddress);

  const loadCommentsForPost = useCallback(async (postId: number) => {
    setLoadingComments((current) => ({
      ...current,
      [postId]: true,
    }));

    try {
      const comments = await getSocialPostComments(postId);
      setFeedComments((current) => ({
        ...current,
        [postId]: comments,
      }));
    } catch (error) {
      console.error('Failed to load post comments:', error);
    } finally {
      setLoadingComments((current) => ({
        ...current,
        [postId]: false,
      }));
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadHomeData = async () => {
      try {
        const [projects, leaderboard, feed] = await Promise.all([
          getProjects(),
          getLeaderboard(),
          getSocialFeed(4).catch(() => []),
        ]);
        const featuredFreelancers = await Promise.all(
          leaderboard.slice(0, 4).map(async (entry) => {
            try {
              const profile = await getUserProfile(entry.stxAddress);
              return {
                ...entry,
                avatar: profile.avatar || null,
                name: profile.name ?? entry.name,
                username: profile.username ?? entry.username,
              };
            } catch {
              return { ...entry, avatar: null };
            }
          }),
        );

        const commentEntries = await Promise.all(
          feed.map(async (post) => [post.id, await getSocialPostComments(post.id).catch(() => [])] as const),
        );

        if (!isMounted) {
          return;
        }

        setFeaturedJobs(projects.slice(0, 2).map(toAppJob));
        setTopFreelancers(featuredFreelancers);
        setFeedPosts(feed);
        setFeedComments(Object.fromEntries(commentEntries) as Record<number, ApiSocialComment[]>);
      } catch (error) {
        console.error('Failed to load home page data:', error);
      }
    };

    loadHomeData();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleToggleFeedLike = async (postId: number) => {
    if (!canInteract) {
      return;
    }

    try {
      const response = await toggleSocialPostLike(postId);
      setFeedPosts((current) =>
        current.map((post) =>
          post.id === postId
            ? {
                ...post,
                likesCount: response.likesCount,
                likedByViewer: response.likedByViewer,
              }
            : post,
        ),
      );
    } catch (error) {
      console.error('Failed to toggle post like:', error);
    }
  };

  const handleToggleComments = async (postId: number) => {
    const nextExpanded = !expandedComments[postId];

    setExpandedComments((current) => ({
      ...current,
      [postId]: nextExpanded,
    }));

    if (nextExpanded && feedComments[postId] === undefined && !loadingComments[postId]) {
      await loadCommentsForPost(postId);
    }
  };

  const handleSubmitComment = async (postId: number) => {
    const content = commentDrafts[postId]?.trim() || '';
    if (!content || !canInteract || submittingComments[postId]) {
      return;
    }

    setSubmittingComments((current) => ({
      ...current,
      [postId]: true,
    }));

    try {
      const created = await createSocialPostComment(postId, { content });
      setFeedComments((current) => ({
        ...current,
        [postId]: [created, ...(current[postId] || [])],
      }));
      setFeedPosts((current) =>
        current.map((post) =>
          post.id === postId
            ? {
                ...post,
                commentsCount: post.commentsCount + 1,
              }
            : post,
        ),
      );
      setCommentDrafts((current) => ({
        ...current,
        [postId]: '',
      }));
      setExpandedComments((current) => ({
        ...current,
        [postId]: true,
      }));
    } catch (error) {
      console.error('Failed to create comment:', error);
    } finally {
      setSubmittingComments((current) => ({
        ...current,
        [postId]: false,
      }));
    }
  };

  const handleCopyFeedPostLink = async (postId: number) => {
    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
        throw new Error('Clipboard is not available in this browser.');
      }

      await navigator.clipboard.writeText(getSocialPostShareUrl(postId));
    } catch (error) {
      console.error('Failed to copy post link:', error);
    }
  };

  const handleStartEditFeedPost = (post: ApiSocialPost) => {
    setFeedMenuPostId(null);
    setEditingFeedPostId(post.id);
    setEditingFeedPostContent(post.content || '');
  };

  const handleCancelEditFeedPost = () => {
    setFeedMenuPostId(null);
    setEditingFeedPostId(null);
    setEditingFeedPostContent('');
  };

  const handleSaveFeedPost = async (postId: number) => {
    if (feedActionPostId !== null) {
      return;
    }

    setFeedActionPostId(postId);
    setFeedActionType('edit');
    setFeedMenuPostId(null);

    try {
      const updated = await updateSocialPost(postId, { content: editingFeedPostContent });
      setFeedPosts((current) => current.map((post) => (
        post.id === postId ? updated : post
      )));
      setEditingFeedPostId(null);
      setEditingFeedPostContent('');
    } catch (error) {
      console.error('Failed to update feed post:', error);
    } finally {
      setFeedActionPostId(null);
      setFeedActionType(null);
    }
  };

  const handleDeleteFeedPost = async (postId: number) => {
    if (feedActionPostId !== null || !window.confirm('Delete this post?')) {
      return;
    }

    setFeedActionPostId(postId);
    setFeedActionType('delete');
    setFeedMenuPostId(null);

    try {
      await deleteSocialPost(postId);
      setFeedPosts((current) => current.filter((post) => post.id !== postId));
      setFeedComments((current) => {
        const next = { ...current };
        delete next[postId];
        return next;
      });
      setExpandedComments((current) => {
        const next = { ...current };
        delete next[postId];
        return next;
      });
      setCommentDrafts((current) => {
        const next = { ...current };
        delete next[postId];
        return next;
      });
      if (editingFeedPostId === postId) {
        setEditingFeedPostId(null);
        setEditingFeedPostContent('');
      }
    } catch (error) {
      console.error('Failed to delete feed post:', error);
    } finally {
      setFeedActionPostId(null);
      setFeedActionType(null);
    }
  };

  const completedJobs = topFreelancers.reduce((sum, freelancer) => sum + freelancer.jobsCompleted, 0);
  const averageRating =
    topFreelancers.length > 0
      ? (
          topFreelancers.reduce((sum, freelancer) => sum + freelancer.avgRating, 0) / topFreelancers.length
        ).toFixed(1)
      : '4.0';
  return (
    <div className="pt-28 pb-20 md:pl-[92px]">
      <div className="container-custom">
        {/* Hero Section */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-20">
          <div className="lg:col-span-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-12"
            >
              <h1 className="text-[clamp(3.2rem,11vw,3.75rem)] sm:text-6xl md:text-8xl font-black tracking-tighter leading-[0.85] mb-8">
                JOIN THE ULTIMATE <br />
                <span className="text-accent-orange">COMMUNITY</span> FOR <br />
                DESIGNERS AND <br />
                CREATIVES.
              </h1>
              <div className="flex flex-wrap gap-4">
                <button className="btn-primary" onClick={() => navigate('/freelancers')}>
                  Search Freelancers <ArrowRight size={18} />
                </button>
                <div className="flex -space-x-3 items-center ml-4">
                  {topFreelancers.map((freelancer) => {
                    const avatarUrl = toApiAssetUrl(freelancer.avatar);

                    return avatarUrl ? (
                      <img
                        key={freelancer.id}
                        src={avatarUrl}
                        alt={toDisplayName(freelancer)}
                        title={toDisplayName(freelancer)}
                        className="w-10 h-10 rounded-[10px] border-2 border-bg object-cover bg-surface"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div
                        key={freelancer.id}
                        className="w-10 h-10 rounded-[10px] border-2 border-bg bg-surface flex items-center justify-center text-[10px] font-black uppercase"
                        title={toDisplayName(freelancer)}
                      >
                        {toDisplayName(freelancer).slice(0, 2)}
                      </div>
                    );
                  })}
                  <div className="w-10 h-10 rounded-[10px] border-2 border-bg bg-surface flex items-center justify-center text-[10px] font-bold">
                    +{topFreelancers.length}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <Shared.StatCard value={`${topFreelancers.length}`} label="Top Freelancers Ranked" color="bg-accent-orange" />
            <Shared.StatCard value={`${featuredJobs.length}`} label="Featured Open Jobs" color="bg-accent-red" />
            <Shared.StatCard value={`${completedJobs}`} label="Completed Jobs by Leaders" color="bg-accent-blue" />
            <div className="p-6 rounded-[15px] bg-surface border border-border h-40 flex flex-col justify-between">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(i => <Star key={i} size={16} className="text-accent-orange fill-accent-orange" />)}
              </div>
              <p className="text-sm font-bold">{averageRating} Star Average from our current top freelancers</p>
            </div>
          </div>
        </section>

        {/* Top Featured Jobs */}
        <section className="mb-20">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black">Top Featured Jobs</h2>
            <button onClick={() => navigate('/jobs')} className="text-accent-orange text-sm font-bold flex items-center gap-2">
              Explore All <ChevronRight size={16} />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-6">
            {featuredJobs.map((job) => (
              <div key={job.id} onClick={() => navigate('/jobs')} className="card p-4 sm:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sm:gap-6 group hover:border-accent-orange transition-all cursor-pointer">
                <div className="w-full min-w-0">
                  <h3 className="text-base sm:text-xl font-black mb-2 group-hover:text-accent-orange transition-colors">{job.title}</h3>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-muted">{job.category}</span>
                    <span className="text-muted text-xs">•</span>
                    <span className="text-xs text-muted">{job.subCategory}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-muted mb-2">
                    {expandedJobDescriptions[job.id] || job.description.length <= DESCRIPTION_PREVIEW_LIMIT
                      ? job.description
                      : `${job.description.slice(0, DESCRIPTION_PREVIEW_LIMIT).trimEnd()}...`}
                  </p>
                  {job.description.length > DESCRIPTION_PREVIEW_LIMIT && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setExpandedJobDescriptions((current) => ({
                          ...current,
                          [job.id]: !current[job.id],
                        }));
                      }}
                      className="text-[10px] font-bold uppercase tracking-widest text-accent-orange hover:underline mb-4"
                    >
                      {expandedJobDescriptions[job.id] ? 'View less' : 'View more'}
                    </button>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {job.tags.map((tag, i) => (
                      <span key={i} className="px-3 py-1 bg-ink/5 rounded-[15px] text-[10px] font-bold">{tag}</span>
                    ))}
                  </div>
                </div>
                <div className="text-left md:text-right shrink-0 w-full md:w-auto">
                  <p className={`text-xl sm:text-2xl font-black ${job.color}`}>{job.budget} {job.currency}</p>
                  <p className="text-[10px] font-bold text-muted uppercase mb-4">Budget</p>
                  <button className="btn-outline py-2 px-4 sm:px-6 text-xs w-full sm:w-auto justify-center">Apply Now</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Main Feed */}
        <section className="mb-20">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black">Main Feed</h2>
            <button onClick={() => navigate(getSocialPostsPagePath())} className="text-accent-orange text-sm font-bold flex items-center gap-2">
              View All <ChevronRight size={16} />
            </button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {feedPosts.map((post) => {
              const authorName = toDisplayName({ name: post.authorName, username: post.authorUsername, stxAddress: post.authorStxAddress });
              const avatarUrl = toApiAssetUrl(post.authorAvatar);
              const authorProfilePath = getUserProfilePath({ username: post.authorUsername, stxAddress: post.authorStxAddress });
              const postPath = getSocialPostPath(post.id);
              const isOwnPost = Boolean(walletAddress && post.authorStxAddress && walletAddress.toLowerCase() === post.authorStxAddress.toLowerCase());
              const isEditingPost = editingFeedPostId === post.id;
              const comments = feedComments[post.id] || [];
              const isCommentsOpen = Boolean(expandedComments[post.id]);
              const isLoadingPostComments = Boolean(loadingComments[post.id]);
              const isSubmittingPostComment = Boolean(submittingComments[post.id]);

              return (
              <div key={post.id} className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {avatarUrl ? (
                      <img src={avatarUrl} className="w-10 h-10 rounded-[10px] object-cover" alt="Avatar" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-10 h-10 rounded-[10px] bg-surface border border-border flex items-center justify-center text-[10px] font-black uppercase">
                        {authorName.slice(0, 2)}
                      </div>
                    )}
                    <div>
                      <Link to={authorProfilePath} className="font-bold text-sm hover:text-accent-orange transition-colors">{authorName}</Link>
                      <p className="text-xs text-muted">{formatRelativeTime(post.createdAt)}</p>
                    </div>
                  </div>
                  {isOwnPost ? (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setFeedMenuPostId((current) => current === post.id ? null : post.id)}
                        disabled={feedActionPostId === post.id}
                        className="text-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <MoreHorizontal size={16} />
                      </button>
                      {feedMenuPostId === post.id ? (
                        <div className="absolute right-0 top-full z-20 mt-2 w-36 overflow-hidden rounded-[15px] border border-border bg-surface shadow-xl">
                          <button type="button" onClick={() => handleStartEditFeedPost(post)} className="flex w-full items-center gap-2 px-4 py-3 text-left text-xs font-bold text-muted transition-colors hover:bg-ink/5 hover:text-ink">
                            <Edit2 size={14} />
                            Edit
                          </button>
                          <button type="button" onClick={() => handleDeleteFeedPost(post.id)} className="flex w-full items-center gap-2 px-4 py-3 text-left text-xs font-bold text-muted transition-colors hover:bg-ink/5 hover:text-accent-red">
                            <X size={14} />
                            Delete
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                {isEditingPost ? (
                  <div className="mb-4 space-y-3">
                    <PostComposerInput
                      value={editingFeedPostContent}
                      onChange={setEditingFeedPostContent}
                      rows={4}
                      className="w-full rounded-[15px] border border-border bg-ink/5 px-4 py-3 text-sm outline-none focus:border-accent-orange"
                      placeholder={post.imageUrl ? 'Add a caption for your post' : 'Update your post'}
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button type="button" onClick={handleCancelEditFeedPost} className="px-4 py-2 text-xs font-bold text-muted hover:text-ink transition-colors">Cancel</button>
                      <button
                        type="button"
                        onClick={() => handleSaveFeedPost(post.id)}
                        disabled={feedActionPostId === post.id && feedActionType === 'edit'}
                        className="btn-primary py-2 px-4 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {post.content ? <PostText content={post.content} className="text-sm mb-4" /> : null}
                    {post.imageUrl && <img src={toApiAssetUrl(post.imageUrl)} className="w-full rounded-[15px] mb-4 object-cover max-h-64" alt="Post content" referrerPolicy="no-referrer" />}
                  </>
                )}
                {isEditingPost && post.imageUrl ? <img src={toApiAssetUrl(post.imageUrl)} className="w-full rounded-[15px] mb-4 object-cover max-h-64" alt="Post content" referrerPolicy="no-referrer" /> : null}
                <div className="flex items-center gap-6 text-muted border-t border-border pt-4">
                  <button
                    onClick={() => handleToggleFeedLike(post.id)}
                    disabled={!canInteract}
                    className={`flex items-center gap-2 text-xs font-bold transition-colors ${post.likedByViewer ? 'text-accent-red' : 'hover:text-accent-red'} ${canInteract ? '' : 'cursor-not-allowed opacity-60'}`}
                  >
                    <Heart size={16} /> {post.likesCount}
                  </button>
                  <button
                    onClick={() => handleToggleComments(post.id)}
                    className="flex items-center gap-2 text-xs font-bold hover:text-accent-blue transition-colors"
                  >
                    <MessageCircle size={16} /> {post.commentsCount}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopyFeedPostLink(post.id)}
                    className="flex items-center gap-2 text-xs font-bold hover:text-accent-orange transition-colors"
                  >
                    <Share2 size={16} /> Share
                  </button>
                  <button
                    onClick={() => navigate(postPath)}
                    className="flex items-center gap-2 text-xs font-bold hover:text-accent-orange transition-colors ml-auto"
                  >
                    <ArrowRight size={16} /> Open
                  </button>
                </div>
                {isCommentsOpen && (
                  <div className="mt-4 border-t border-border pt-4 space-y-4">
                    {canInteract ? (
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-[10px] bg-surface border border-border flex items-center justify-center text-[10px] font-black uppercase shrink-0">
                          {(walletAddress || 'YO').slice(0, 2)}
                        </div>
                        <div className="flex-1 space-y-3">
                          <textarea
                            value={commentDrafts[post.id] || ''}
                            onChange={(event) =>
                              setCommentDrafts((current) => ({
                                ...current,
                                [post.id]: event.target.value,
                              }))
                            }
                            placeholder="Write a comment..."
                            className="w-full bg-ink/5 border border-border rounded-[15px] p-4 text-sm focus:ring-1 focus:ring-accent-orange outline-none resize-none h-24"
                          />
                          <div className="flex justify-end">
                            <button
                              onClick={() => handleSubmitComment(post.id)}
                              disabled={isSubmittingPostComment || !(commentDrafts[post.id] || '').trim()}
                              className="btn-primary py-2 px-6 disabled:opacity-60"
                            >
                              {isSubmittingPostComment ? 'Posting...' : 'Post Comment'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-muted">Sign in to like and comment on posts from the homepage.</div>
                    )}

                    {isLoadingPostComments ? (
                      <div className="text-sm text-muted">Loading comments...</div>
                    ) : comments.length > 0 ? (
                      <div className="space-y-4">
                        {comments.map((comment) => {
                          const commentAuthorName = toDisplayName({ name: comment.authorName, username: comment.authorUsername, stxAddress: comment.authorStxAddress });
                          const commentAvatarUrl = toApiAssetUrl(comment.authorAvatar);
                          const commentAuthorProfilePath = getUserProfilePath({ username: comment.authorUsername, stxAddress: comment.authorStxAddress });

                          return (
                            <div key={comment.id} className="flex gap-3">
                              {commentAvatarUrl ? (
                                <img src={commentAvatarUrl} className="w-10 h-10 rounded-[10px] object-cover shrink-0" alt={commentAuthorName} referrerPolicy="no-referrer" />
                              ) : (
                                <div className="w-10 h-10 rounded-[10px] bg-surface border border-border flex items-center justify-center text-[10px] font-black uppercase shrink-0">
                                  {commentAuthorName.slice(0, 2)}
                                </div>
                              )}
                              <div className="flex-1 bg-ink/5 rounded-[15px] p-4">
                                <div className="flex justify-between items-start gap-4 mb-2">
                                  <Link to={commentAuthorProfilePath} className="font-bold text-sm hover:text-accent-orange transition-colors">{commentAuthorName}</Link>
                                  <span className="text-xs text-muted shrink-0">{formatRelativeTime(comment.createdAt)}</span>
                                </div>
                                <p className="text-sm">{comment.content}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-sm text-muted">No comments yet.</div>
                    )}
                  </div>
                )}
              </div>
            )})}
            {feedPosts.length === 0 && (
              <div className="card p-6 text-sm text-muted lg:col-span-2">No posts have been shared yet.</div>
            )}
          </div>
        </section>

        {/* Event Banner */}
        <section className="mb-20">
          <div className="relative rounded-[15px] overflow-hidden bg-accent-blue p-12 md:p-20 flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="relative z-10 max-w-xl">
              <span className="bg-white/20 backdrop-blur-md px-4 py-1 rounded-[15px] text-xs font-bold mb-6 inline-block">Live now</span>
              <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-none mb-8">
                BUILD THE FUTURE OF DECENTRALIZED TECH
              </h2>
              <p className="text-white/90 text-sm md:text-base font-bold uppercase tracking-widest mb-8">
                STXWORX LIVE ON DORA HACKS
              </p>
              <a
                href="https://dorahacks.io/buidl/41161"
                target="_blank"
                rel="noreferrer"
                className="inline-flex bg-white text-[#0A0A0A] px-8 py-4 rounded-[15px] font-bold hover:bg-accent-orange hover:text-white transition-all"
              >
                Vote now
              </a>
            </div>
            {/* Abstract shapes */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-accent-red/30 rounded-full blur-[100px] -mr-48 -mt-48"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent-orange/30 rounded-full blur-[80px] -ml-32 -mb-32"></div>
          </div>
        </section>

        {/* Banners Grid */}
        <section className="mb-20">
          <div className="grid grid-cols-1 gap-6">
            {/* Stacks Africa Banner */}
            <div className="relative rounded-[20px] overflow-hidden bg-gradient-to-br from-[#FF6B35] via-[#F7931E] to-[#FF8C42] p-6 shadow-2xl transform hover:scale-[1.02] transition-all duration-300">
              {/* Animated background elements */}
              <div className="absolute inset-0">
                <div className="absolute top-0 right-0 w-48 h-48 bg-yellow-300/20 rounded-full blur-[40px] animate-pulse"></div>
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-orange-400/20 rounded-full blur-[30px] animate-pulse delay-75"></div>
              </div>
              
              <div className="relative flex items-center gap-4">
                {/* Stacks Africa Logo */}
                <div className="relative group shrink-0">
                  <div className="absolute -inset-1 bg-white/30 rounded-full blur-md group-hover:bg-white/40 transition-all duration-300"></div>
                  <img 
                    src="/stacksafrica1.png" 
                    alt="Stacks Africa" 
                    className="relative w-16 h-16 object-contain filter drop-shadow-lg transform group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm md:text-base font-bold leading-tight drop-shadow-sm">
                    1% Royalty to Stacks Africa
                  </p>
                  <p className="text-white/90 text-xs md:text-sm font-medium mt-1 drop-shadow-sm">
                    Empowering Youth Education & Hackathons
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
