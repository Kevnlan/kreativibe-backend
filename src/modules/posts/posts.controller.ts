import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PostsService } from './posts.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { listPostsSchema, ListPostsDto } from './dto/list-posts.dto';

@Controller('posts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CREATOR)
export class PostsController {
  constructor(private posts: PostsService) {}

  @Post('me/list')
  list(@CurrentUser() user: any, @Body(new ZodValidationPipe(listPostsSchema)) dto: ListPostsDto) {
    return this.posts.list(user.id, dto);
  }
}
