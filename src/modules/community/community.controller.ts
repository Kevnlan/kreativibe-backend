import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CommunityService } from './community.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  createPostSchema, CreatePostDto,
  listPostsSchema, ListPostsDto,
  createCommentSchema, CreateCommentDto,
  listCommentsSchema, ListCommentsDto,
  updatePostSchema, UpdatePostDto,
  voteSchema, VoteDto,
} from './dto/community.dto';
import { idSchema, IdDto } from '../../common/dto/id.dto';

@Controller('community')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CREATOR, Role.BRAND)
export class CommunityController {
  constructor(private community: CommunityService) {}

  @Post('posts/create')
  createPost(@CurrentUser() user: any, @Body(new ZodValidationPipe(createPostSchema)) dto: CreatePostDto) {
    return this.community.createPost(user.id, dto);
  }

  @Post('posts/list')
  listPosts(@Body(new ZodValidationPipe(listPostsSchema)) query: ListPostsDto) {
    return this.community.listPosts(query);
  }

  @Post('posts/get')
  getPost(@Body(new ZodValidationPipe(idSchema)) dto: IdDto) {
    return this.community.getPost(dto.id);
  }

  @Post('posts/update')
  updatePost(@CurrentUser() user: any, @Body(new ZodValidationPipe(updatePostSchema)) dto: UpdatePostDto) {
    const { id, ...rest } = dto;
    return this.community.updatePost(user.id, id, rest);
  }

  @Post('posts/delete')
  deletePost(@CurrentUser() user: any, @Body(new ZodValidationPipe(idSchema)) dto: IdDto) {
    return this.community.deletePost(user.id, dto.id);
  }

  @Post('posts/vote')
  votePost(@CurrentUser() user: any, @Body(new ZodValidationPipe(voteSchema)) dto: VoteDto) {
    return this.community.votePost(user.id, dto);
  }

  @Post('comments/create')
  createComment(@CurrentUser() user: any, @Body(new ZodValidationPipe(createCommentSchema)) dto: CreateCommentDto) {
    return this.community.createComment(user.id, dto);
  }

  @Post('comments/list')
  listComments(@Body(new ZodValidationPipe(listCommentsSchema)) query: ListCommentsDto) {
    return this.community.listComments(query);
  }

  @Post('comments/delete')
  deleteComment(@CurrentUser() user: any, @Body(new ZodValidationPipe(idSchema)) dto: IdDto) {
    return this.community.deleteComment(user.id, dto.id);
  }

  @Post('comments/vote')
  voteComment(@CurrentUser() user: any, @Body(new ZodValidationPipe(voteSchema)) dto: VoteDto) {
    return this.community.voteComment(user.id, dto);
  }
}

@Controller('admin/community')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminCommunityController {
  constructor(private community: CommunityService) {}

  @Post('posts/pin')
  pin(@Body(new ZodValidationPipe(idSchema)) dto: IdDto) {
    return this.community.pinPost(dto.id);
  }

  @Post('posts/lock')
  lock(@Body(new ZodValidationPipe(idSchema)) dto: IdDto) {
    return this.community.lockPost(dto.id);
  }

  @Post('posts/delete')
  delete(@Body(new ZodValidationPipe(idSchema)) dto: IdDto) {
    return this.community.adminDeletePost(dto.id);
  }
}
