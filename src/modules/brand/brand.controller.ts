import {
  Controller, Get, Put, Post, Body, UseGuards, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { BrandService } from './brand.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { updateBrandProfileSchema, UpdateBrandProfileDto } from './dto/update-brand-profile.dto';
import { z } from 'zod';

const documentBodySchema = z.object({ type: z.enum(['registration_cert', 'tax_compliance']) });

@Controller('brand')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.BRAND)
export class BrandController {
  constructor(private brand: BrandService) {}

  @Get('profile')
  getProfile(@CurrentUser() user: any) {
    return this.brand.getProfile(user.id);
  }

  @Put('profile')
  updateProfile(
    @CurrentUser() user: any,
    @Body(new ZodValidationPipe(updateBrandProfileSchema)) dto: UpdateBrandProfileDto,
  ) {
    return this.brand.updateProfile(user.id, dto);
  }

  @Post('profile/logo')
  @UseInterceptors(FileInterceptor('logo'))
  uploadLogo(@CurrentUser() user: any, @UploadedFile() file: Express.Multer.File) {
    return this.brand.uploadLogo(user.id, file);
  }

  @Post('profile/cover')
  @UseInterceptors(FileInterceptor('cover'))
  uploadCover(@CurrentUser() user: any, @UploadedFile() file: Express.Multer.File) {
    return this.brand.uploadCover(user.id, file);
  }

  @Post('profile/documents')
  @UseInterceptors(FileInterceptor('document'))
  uploadDocument(
    @CurrentUser() user: any,
    @Body(new ZodValidationPipe(documentBodySchema)) body: { type: 'registration_cert' | 'tax_compliance' },
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.brand.uploadDocument(user.id, body.type, file);
  }
}
