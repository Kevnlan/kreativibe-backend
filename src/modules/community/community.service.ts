import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { NotificationService } from '../notification/notification.service';
import {
  CreatePostDto,
  ListPostsDto,
  CreateCommentDto,
  ListCommentsDto,
  VoteDto,
} from './dto/community.dto';

@Injectable()
export class CommunityService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationService,
  ) {}

  // ── Posts ──────────────────────────────────────────────────────────────────

  async createPost(userId: string, dto: CreatePostDto) {
    return this.prisma.communityPost.create({
      data: {
        authorId: userId,
        type: dto.type,
        title: dto.title,
        body: dto.body,
        tags: dto.tags,
        mediaUrls: dto.mediaUrls,
      },
      include: {
        author: { select: { id: true, name: true, role: true } },
        _count: { select: { comments: true } },
      },
    });
  }

  async listPosts(query: ListPostsDto) {
    const where: Prisma.CommunityPostWhereInput = {
      ...(query.type ? { type: query.type } : {}),
      ...(query.tag ? { tags: { has: query.tag } } : {}),
      ...(query.search ? {
        OR: [
          { title: { contains: query.search, mode: 'insensitive' } },
          { body: { contains: query.search, mode: 'insensitive' } },
        ],
      } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.communityPost.findMany({
        where,
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          author: { select: { id: true, name: true, role: true } },
          _count: { select: { comments: true } },
        },
      }),
      this.prisma.communityPost.count({ where }),
    ]);

    return { items, total, page: query.page, limit: query.limit };
  }

  async getPost(id: string) {
    const post = await this.prisma.communityPost.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, name: true, role: true } },
        _count: { select: { comments: true } },
      },
    });
    if (!post) throw new NotFoundException({ message: 'Post not found', code: 'POST_NOT_FOUND' });

    // Increment views
    await this.prisma.communityPost.update({ where: { id }, data: { views: { increment: 1 } } });

    return post;
  }

  async updatePost(userId: string, id: string, dto: Partial<CreatePostDto>) {
    const post = await this.prisma.communityPost.findFirst({ where: { id, authorId: userId } });
    if (!post) throw new NotFoundException({ message: 'Post not found', code: 'POST_NOT_FOUND' });
    if (post.isLocked) throw new BadRequestException({ message: 'Post is locked', code: 'POST_LOCKED' });

    return this.prisma.communityPost.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.body !== undefined ? { body: dto.body } : {}),
        ...(dto.tags !== undefined ? { tags: dto.tags } : {}),
        ...(dto.mediaUrls !== undefined ? { mediaUrls: dto.mediaUrls } : {}),
      },
    });
  }

  async deletePost(userId: string, id: string) {
    const post = await this.prisma.communityPost.findFirst({ where: { id, authorId: userId } });
    if (!post) throw new NotFoundException({ message: 'Post not found', code: 'POST_NOT_FOUND' });
    await this.prisma.communityPost.delete({ where: { id } });
    return { success: true };
  }

  async votePost(userId: string, dto: VoteDto) {
    if (!dto.postId) throw new BadRequestException({ message: 'postId required', code: 'VALIDATION_ERROR' });
    const post = await this.prisma.communityPost.findUnique({ where: { id: dto.postId } });
    if (!post) throw new NotFoundException({ message: 'Post not found', code: 'POST_NOT_FOUND' });

    const field = dto.direction === 'UP' ? 'upvotes' : 'downvotes';
    return this.prisma.communityPost.update({
      where: { id: dto.postId },
      data: { [field]: { increment: 1 } },
      select: { id: true, upvotes: true, downvotes: true },
    });
  }

  // ── Comments ───────────────────────────────────────────────────────────────

  async createComment(userId: string, dto: CreateCommentDto) {
    const post = await this.prisma.communityPost.findUnique({ where: { id: dto.postId } });
    if (!post) throw new NotFoundException({ message: 'Post not found', code: 'POST_NOT_FOUND' });
    if (post.isLocked) throw new BadRequestException({ message: 'Post is locked', code: 'POST_LOCKED' });

    if (dto.parentId) {
      const parent = await this.prisma.communityComment.findUnique({ where: { id: dto.parentId } });
      if (!parent || parent.postId !== dto.postId) {
        throw new BadRequestException({ message: 'Invalid parent comment', code: 'INVALID_PARENT' });
      }
    }

    const comment = await this.prisma.communityComment.create({
      data: {
        postId: dto.postId,
        authorId: userId,
        body: dto.body,
        parentId: dto.parentId,
      },
      include: {
        author: { select: { id: true, name: true, role: true } },
      },
    });

    // Notify post author of new comment (if not self)
    if (post.authorId !== userId) {
      await this.notifications.create(
        post.authorId,
        'COMMUNITY_REPLY',
        'New comment on your post',
        `${comment.author.name} commented on "${post.title}"`,
        { postId: post.id, commentId: comment.id },
      );
    }

    return comment;
  }

  async listComments(query: ListCommentsDto) {
    const where: Prisma.CommunityCommentWhereInput = { postId: query.postId };

    const [items, total] = await Promise.all([
      this.prisma.communityComment.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          author: { select: { id: true, name: true, role: true } },
          replies: {
            include: { author: { select: { id: true, name: true, role: true } } },
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
      this.prisma.communityComment.count({ where }),
    ]);

    return { items, total, page: query.page, limit: query.limit };
  }

  async deleteComment(userId: string, commentId: string) {
    const comment = await this.prisma.communityComment.findFirst({ where: { id: commentId, authorId: userId } });
    if (!comment) throw new NotFoundException({ message: 'Comment not found', code: 'COMMENT_NOT_FOUND' });
    await this.prisma.communityComment.delete({ where: { id: commentId } });
    return { success: true };
  }

  async voteComment(userId: string, dto: VoteDto) {
    if (!dto.commentId) throw new BadRequestException({ message: 'commentId required', code: 'VALIDATION_ERROR' });
    const comment = await this.prisma.communityComment.findUnique({ where: { id: dto.commentId } });
    if (!comment) throw new NotFoundException({ message: 'Comment not found', code: 'COMMENT_NOT_FOUND' });

    const field = dto.direction === 'UP' ? 'upvotes' : 'downvotes';
    return this.prisma.communityComment.update({
      where: { id: dto.commentId },
      data: { [field]: { increment: 1 } },
      select: { id: true, upvotes: true, downvotes: true },
    });
  }

  // ── Admin ──────────────────────────────────────────────────────────────────

  async pinPost(id: string) {
    const post = await this.prisma.communityPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException({ message: 'Post not found', code: 'POST_NOT_FOUND' });
    return this.prisma.communityPost.update({ where: { id }, data: { isPinned: !post.isPinned } });
  }

  async lockPost(id: string) {
    const post = await this.prisma.communityPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException({ message: 'Post not found', code: 'POST_NOT_FOUND' });
    return this.prisma.communityPost.update({ where: { id }, data: { isLocked: !post.isLocked } });
  }

  async adminDeletePost(id: string) {
    const post = await this.prisma.communityPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException({ message: 'Post not found', code: 'POST_NOT_FOUND' });
    await this.prisma.communityPost.delete({ where: { id } });
    return { success: true };
  }
}
