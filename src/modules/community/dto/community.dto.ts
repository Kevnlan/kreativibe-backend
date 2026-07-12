import { z } from 'zod';

export const createPostSchema = z.object({
  type: z.enum(['DISCUSSION', 'QUESTION', 'SHOWCASE', 'FEEDBACK']).default('DISCUSSION'),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  tags: z.array(z.string()).default([]),
  mediaUrls: z.array(z.string()).default([]),
});
export type CreatePostDto = z.infer<typeof createPostSchema>;

export const listPostsSchema = z.object({
  type: z.enum(['DISCUSSION', 'QUESTION', 'SHOWCASE', 'FEEDBACK']).optional(),
  tag: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type ListPostsDto = z.infer<typeof listPostsSchema>;

export const createCommentSchema = z.object({
  postId: z.string().min(1),
  body: z.string().min(1).max(2000),
  parentId: z.string().optional(),
});
export type CreateCommentDto = z.infer<typeof createCommentSchema>;

export const listCommentsSchema = z.object({
  postId: z.string().min(1),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});
export type ListCommentsDto = z.infer<typeof listCommentsSchema>;

export const updatePostSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200).optional(),
  body: z.string().min(1).max(5000).optional(),
  tags: z.array(z.string()).optional(),
  mediaUrls: z.array(z.string()).optional(),
});
export type UpdatePostDto = z.infer<typeof updatePostSchema>;

export const voteSchema = z.object({
  postId: z.string().optional(),
  commentId: z.string().optional(),
  direction: z.enum(['UP', 'DOWN']),
});
export type VoteDto = z.infer<typeof voteSchema>;
