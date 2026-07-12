import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { updateSettingsSchema, UpdateSettingsDto } from './dto/settings.dto';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private settings: SettingsService) {}

  @Post('get')
  get(@CurrentUser() user: any) {
    return this.settings.getOrCreate(user.id);
  }

  @Post('update')
  update(@CurrentUser() user: any, @Body(new ZodValidationPipe(updateSettingsSchema)) dto: UpdateSettingsDto) {
    return this.settings.update(user.id, dto);
  }

  @Post('reset')
  reset(@CurrentUser() user: any) {
    return this.settings.reset(user.id);
  }
}
