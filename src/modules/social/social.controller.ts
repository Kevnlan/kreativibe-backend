import { Controller, Post, Param, Body, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { SocialService } from './social.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { connectSchema, ConnectDto, oauthCallbackSchema, OauthCallbackDto, refreshTokenSchema, RefreshTokenDto } from './dto/social.dto';

@Controller('social')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.BRAND, Role.CREATOR)
export class SocialController {
  constructor(private social: SocialService) {}

  @Post('accounts/list')
  list(@CurrentUser() user: any) {
    return this.social.list(user.id);
  }

  @Post('accounts/:id/get')
  get(@CurrentUser() user: any, @Param('id') id: string) {
    return this.social.get(user.id, id);
  }

  @Post('connect')
  connect(@Body(new ZodValidationPipe(connectSchema)) dto: ConnectDto) {
    return this.social.connect(dto);
  }

  @Post('callback/:platform')
  callback(
    @CurrentUser() user: any,
    @Param('platform') platform: string,
    @Body(new ZodValidationPipe(oauthCallbackSchema)) dto: OauthCallbackDto,
  ) {
    return this.social.callback(user.id, platform, dto);
  }

  @Post('accounts/:id/disconnect')
  disconnect(@CurrentUser() user: any, @Param('id') id: string) {
    return this.social.disconnect(user.id, id);
  }

  @Post('refresh-token')
  refreshToken(@CurrentUser() user: any, @Body(new ZodValidationPipe(refreshTokenSchema)) dto: RefreshTokenDto) {
    return this.social.refreshToken(user.id, dto);
  }

  @Post('accounts/:id/sync')
  sync(@CurrentUser() user: any, @Param('id') id: string) {
    return this.social.sync(user.id, id);
  }
}
