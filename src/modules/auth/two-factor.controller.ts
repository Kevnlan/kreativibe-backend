import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { TwoFactorService } from './two-factor.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { verifyTwoFactorSchema, VerifyTwoFactorDto, disableTwoFactorSchema, DisableTwoFactorDto } from './dto/two-factor.dto';
import { loginTwoFactorSchema, LoginTwoFactorDto } from './dto/two-factor.dto';

@Controller('auth/2fa')
@UseGuards(JwtAuthGuard)
export class TwoFactorController {
  constructor(private twoFactor: TwoFactorService) {}

  @Post('setup')
  setup(@CurrentUser() user: any) {
    return this.twoFactor.setup(user.id);
  }

  @Post('verify')
  verify(@CurrentUser() user: any, @Body(new ZodValidationPipe(verifyTwoFactorSchema)) dto: VerifyTwoFactorDto) {
    return this.twoFactor.verify(user.id, dto.code);
  }

  @Get('status')
  status(@CurrentUser() user: any) {
    return this.twoFactor.status(user.id);
  }

  @Post('disable')
  disable(@CurrentUser() user: any, @Body(new ZodValidationPipe(disableTwoFactorSchema)) dto: DisableTwoFactorDto) {
    return this.twoFactor.disable(user.id, dto);
  }

  @Post('backup-codes/regenerate')
  regenerateBackupCodes(@CurrentUser() user: any) {
    return this.twoFactor.regenerateBackupCodes(user.id);
  }
}

@Controller('auth/login')
export class TwoFactorLoginController {
  constructor(private twoFactor: TwoFactorService) {}

  @Post('2fa')
  loginWithTwoFactor(@Body(new ZodValidationPipe(loginTwoFactorSchema)) dto: LoginTwoFactorDto) {
    return this.twoFactor.loginWithTwoFactor(dto);
  }
}
