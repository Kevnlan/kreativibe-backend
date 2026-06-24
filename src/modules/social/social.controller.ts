import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { SocialService } from './social.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { connectSchema, ConnectDto, oauthCallbackSchema, OauthCallbackDto, refreshTokenSchema, RefreshTokenDto } from './dto/social.dto';
import { idSchema, IdDto } from '../../common/dto/id.dto';

@Controller('social')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.BRAND, Role.CREATOR)
export class SocialController {
  constructor(private social: SocialService) {}

  @Post('accounts/list')
  list(@CurrentUser() user: any) {
    return this.social.list(user.id);
  }

  @Post('accounts/get')
  get(@CurrentUser() user: any, @Body(new ZodValidationPipe(idSchema)) dto: IdDto) {
    return this.social.get(user.id, dto.id);
  }

  @Post('connect')
  connect(@Body(new ZodValidationPipe(connectSchema)) dto: ConnectDto) {
    return this.social.connect(dto);
  }

  @Post('callback')
  callback(@CurrentUser() user: any, @Body(new ZodValidationPipe(oauthCallbackSchema)) dto: OauthCallbackDto) {
    return this.social.callback(user.id, dto.platform, dto);
  }

  @Post('accounts/disconnect')
  disconnect(@CurrentUser() user: any, @Body(new ZodValidationPipe(idSchema)) dto: IdDto) {
    return this.social.disconnect(user.id, dto.id);
  }

  @Post('refresh-token')
  refreshToken(@CurrentUser() user: any, @Body(new ZodValidationPipe(refreshTokenSchema)) dto: RefreshTokenDto) {
    return this.social.refreshToken(user.id, dto);
  }

  @Post('accounts/sync')
  sync(@CurrentUser() user: any, @Body(new ZodValidationPipe(idSchema)) dto: IdDto) {
    return this.social.sync(user.id, dto.id);
  }
}
