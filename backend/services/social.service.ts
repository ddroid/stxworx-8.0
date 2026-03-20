import { db } from "../db";
import { postComments, postLikes, socialPosts, users } from "@shared/schema";
import { and, desc, eq } from "drizzle-orm";

type SocialPostRecord = {
  id: number;
  userId: number;
  content: string;
  imageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  authorStxAddress: string | null;
  authorName: string | null;
  authorUsername: string | null;
  authorAvatar: string | null;
};

type SocialCommentRecord = {
  id: number;
  postId: number;
  userId: number;
  content: string;
  createdAt: Date;
  authorStxAddress: string | null;
  authorName: string | null;
  authorUsername: string | null;
  authorAvatar: string | null;
};

async function getPostRecord(postId: number): Promise<SocialPostRecord | null> {
  const [post] = await db
    .select({
      id: socialPosts.id,
      userId: socialPosts.userId,
      content: socialPosts.content,
      imageUrl: socialPosts.imageUrl,
      createdAt: socialPosts.createdAt,
      updatedAt: socialPosts.updatedAt,
      authorStxAddress: users.stxAddress,
      authorName: users.name,
      authorUsername: users.username,
      authorAvatar: users.avatar,
    })
    .from(socialPosts)
    .leftJoin(users, eq(socialPosts.userId, users.id))
    .where(eq(socialPosts.id, postId));

  return post ?? null;
}

async function postExists(postId: number) {
  const [post] = await db
    .select({ id: socialPosts.id })
    .from(socialPosts)
    .where(eq(socialPosts.id, postId));

  return Boolean(post);
}

async function enrichPosts(posts: SocialPostRecord[], viewerId?: number) {
  return Promise.all(
    posts.map(async (post) => {
      const [likes, comments] = await Promise.all([
        db.select({ id: postLikes.id, userId: postLikes.userId }).from(postLikes).where(eq(postLikes.postId, post.id)),
        db.select({ id: postComments.id }).from(postComments).where(eq(postComments.postId, post.id)),
      ]);
      const likedByViewer = viewerId ? likes.some((like) => like.userId === viewerId) : false;

      return {
        ...post,
        likesCount: likes.length,
        commentsCount: comments.length,
        likedByViewer,
      };
    }),
  );
}

export const socialService = {
  async getFeed(viewerId?: number, limit = 12) {
    const posts = await db
      .select({
        id: socialPosts.id,
        userId: socialPosts.userId,
        content: socialPosts.content,
        imageUrl: socialPosts.imageUrl,
        createdAt: socialPosts.createdAt,
        updatedAt: socialPosts.updatedAt,
        authorStxAddress: users.stxAddress,
        authorName: users.name,
        authorUsername: users.username,
        authorAvatar: users.avatar,
      })
      .from(socialPosts)
      .leftJoin(users, eq(socialPosts.userId, users.id))
      .orderBy(desc(socialPosts.createdAt))
      .limit(limit);

    return enrichPosts(posts, viewerId);
  },

  async getById(postId: number, viewerId?: number) {
    const post = await getPostRecord(postId);
    if (!post) {
      return null;
    }

    const [enriched] = await enrichPosts([post], viewerId);
    return enriched ?? null;
  },

  async getByUserId(userId: number, viewerId?: number) {
    const posts = await db
      .select({
        id: socialPosts.id,
        userId: socialPosts.userId,
        content: socialPosts.content,
        imageUrl: socialPosts.imageUrl,
        createdAt: socialPosts.createdAt,
        updatedAt: socialPosts.updatedAt,
        authorStxAddress: users.stxAddress,
        authorName: users.name,
        authorUsername: users.username,
        authorAvatar: users.avatar,
      })
      .from(socialPosts)
      .leftJoin(users, eq(socialPosts.userId, users.id))
      .where(eq(socialPosts.userId, userId))
      .orderBy(desc(socialPosts.createdAt));

    return enrichPosts(posts, viewerId);
  },

  async create(userId: number, content: string, imageUrl?: string) {
    const [result] = await db.insert(socialPosts).values({
      userId,
      content,
      imageUrl: imageUrl ?? null,
    });

    const [created] = await db
      .select({
        id: socialPosts.id,
        userId: socialPosts.userId,
        content: socialPosts.content,
        imageUrl: socialPosts.imageUrl,
        createdAt: socialPosts.createdAt,
        updatedAt: socialPosts.updatedAt,
        authorStxAddress: users.stxAddress,
        authorName: users.name,
        authorUsername: users.username,
        authorAvatar: users.avatar,
      })
      .from(socialPosts)
      .leftJoin(users, eq(socialPosts.userId, users.id))
      .where(eq(socialPosts.id, result.insertId));

    if (!created) {
      return null;
    }

    const [enriched] = await enrichPosts([created], userId);
    return enriched || null;
  },

  async toggleLike(postId: number, userId: number) {
    if (!(await postExists(postId))) {
      return null;
    }

    const [existing] = await db
      .select()
      .from(postLikes)
      .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)));

    if (existing) {
      await db.delete(postLikes).where(eq(postLikes.id, existing.id));
    } else {
      await db.insert(postLikes).values({ postId, userId });
    }

    const likes = await db.select().from(postLikes).where(eq(postLikes.postId, postId));
    return {
      likesCount: likes.length,
      likedByViewer: !existing,
    };
  },

  async listComments(postId: number) {
    if (!(await postExists(postId))) {
      return null;
    }

    const comments = await db
      .select({
        id: postComments.id,
        postId: postComments.postId,
        userId: postComments.userId,
        content: postComments.content,
        createdAt: postComments.createdAt,
        authorStxAddress: users.stxAddress,
        authorName: users.name,
        authorUsername: users.username,
        authorAvatar: users.avatar,
      })
      .from(postComments)
      .leftJoin(users, eq(postComments.userId, users.id))
      .where(eq(postComments.postId, postId))
      .orderBy(desc(postComments.createdAt));

    return comments satisfies SocialCommentRecord[];
  },

  async createComment(postId: number, userId: number, content: string) {
    if (!(await postExists(postId))) {
      return null;
    }

    const [result] = await db.insert(postComments).values({
      postId,
      userId,
      content,
    });

    const [comment] = await db
      .select({
        id: postComments.id,
        postId: postComments.postId,
        userId: postComments.userId,
        content: postComments.content,
        createdAt: postComments.createdAt,
        authorStxAddress: users.stxAddress,
        authorName: users.name,
        authorUsername: users.username,
        authorAvatar: users.avatar,
      })
      .from(postComments)
      .leftJoin(users, eq(postComments.userId, users.id))
      .where(eq(postComments.id, result.insertId));

    return comment ?? null;
  },

  async getUserIdByAddress(address: string) {
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.stxAddress, address));

    return user?.id ?? null;
  },
};
