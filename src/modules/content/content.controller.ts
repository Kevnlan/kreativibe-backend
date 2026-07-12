import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ContentService } from './content.service';
import { ContentAiService } from './content-ai.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { listContentSchema, ListContentDto } from './dto/list-content.dto';
import { createContentSchema, CreateContentDto } from './dto/create-content.dto';
import { updateContentSchema, UpdateContentDto } from './dto/update-content.dto';
import { adviseContentSchema, AdviseContentDto } from './dto/advise.dto';
import { idSchema, IdDto } from '../../common/dto/id.dto';

@Controller('contents')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CREATOR)
export class ContentController {
  constructor(
    private content: ContentService,
    private ai: ContentAiService,
  ) {}

  @Post('me/list')
  list(@CurrentUser() user: any, @Body(new ZodValidationPipe(listContentSchema)) dto: ListContentDto) {
    return this.content.list(user.id, dto);
  }

  @Post('get')
  get(@CurrentUser() user: any, @Body(new ZodValidationPipe(idSchema)) dto: IdDto) {
    return this.content.get(user.id, dto.id);
  }

  @Post('create')
  create(@CurrentUser() user: any, @Body(new ZodValidationPipe(createContentSchema)) dto: CreateContentDto) {
    return this.content.create(user.id, dto);
  }

  @Post('update')
  update(
    @CurrentUser() user: any,
    @Body(new ZodValidationPipe(updateContentSchema)) dto: UpdateContentDto,
  ) {
    return this.content.update(user.id, dto.id, dto);
  }

  @Post('delete')
  remove(@CurrentUser() user: any, @Body(new ZodValidationPipe(idSchema)) dto: IdDto) {
    return this.content.remove(user.id, dto.id);
  }

  @Post('duplicate')
  duplicate(@CurrentUser() user: any, @Body(new ZodValidationPipe(idSchema)) dto: IdDto) {
    return this.content.duplicate(user.id, dto.id);
  }

  @Post('versions/list')
  listVersions(@CurrentUser() user: any, @Body(new ZodValidationPipe(idSchema)) dto: IdDto) {
    return this.content.listVersions(user.id, dto.id);
  }

  @Post('optimize/advise')
  advise(@Body(new ZodValidationPipe(adviseContentSchema)) dto: AdviseContentDto) {
    return this.ai.advise(dto);
  }
}
