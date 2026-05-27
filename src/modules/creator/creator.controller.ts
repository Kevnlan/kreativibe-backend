import {
  Controller, Get, Put, Post, Body, UseGuards, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { CreatorService } from './creator.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { updateCreatorProfileSchema, UpdateCreatorProfileDto } from './dto/update-creator-profile.dto';

@Controller('creator')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CREATOR)
export class CreatorController {
  constructor(private creator: CreatorService) {}

  @Get('profile')
  getProfile(@CurrentUser() user: any) {
    return this.creator.getProfile(user.id);
  }

  @Put('profile')
  updateProfile(
    @CurrentUser() user: any,
    @Body(new ZodValidationPipe(updateCreatorProfileSchema)) dto: UpdateCreatorProfileDto,
  ) {
    return this.creator.updateProfile(user.id, dto);
  }

  @Post('profile/avatar')
  @UseInterceptors(FileInterceptor('avatar'))
  uploadAvatar(@CurrentUser() user: any, @UploadedFile() file: Express.Multer.File) {
    return this.creator.uploadAvatar(user.id, file);
  }

  @Post('profile/cover')
  @UseInterceptors(FileInterceptor('cover'))
  uploadCover(@CurrentUser() user: any, @UploadedFile() file: Express.Multer.File) {
    return this.creator.uploadCover(user.id, file);
  }
}
