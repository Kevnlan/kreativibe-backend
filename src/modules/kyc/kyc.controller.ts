import {
  Controller, Post, Body, UseGuards, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { KycService } from './kyc.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { submitKycSchema, SubmitKycDto, resubmitKycSchema, ResubmitKycDto } from './dto/kyc.dto';

@Controller('kyc')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CREATOR)
export class KycController {
  constructor(private kyc: KycService) {}

  @Post('submit')
  submit(@CurrentUser() user: any, @Body(new ZodValidationPipe(submitKycSchema)) dto: SubmitKycDto) {
    return this.kyc.submit(user.id, dto);
  }

  @Post('status')
  status(@CurrentUser() user: any) {
    return this.kyc.status(user.id);
  }

  @Post('resubmit')
  resubmit(@CurrentUser() user: any, @Body(new ZodValidationPipe(resubmitKycSchema)) dto: ResubmitKycDto) {
    return this.kyc.resubmit(user.id, dto);
  }
}

// Shared upload endpoint (CREATOR + BRAND) — returns a URL for use in later submits.
@Controller('upload')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CREATOR, Role.BRAND)
export class UploadController {
  constructor(private kyc: KycService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
    @Body('purpose') purpose?: string,
  ) {
    return this.kyc.upload(user.id, file, purpose);
  }
}
