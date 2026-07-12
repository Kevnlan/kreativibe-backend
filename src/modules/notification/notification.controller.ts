import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { listNotificationsSchema, ListNotificationsDto } from './dto/notification.dto';
import { idSchema, IdDto } from '../../common/dto/id.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private notifications: NotificationService) {}

  @Post('list')
  list(@CurrentUser() user: any, @Body(new ZodValidationPipe(listNotificationsSchema)) query: ListNotificationsDto) {
    return this.notifications.list(user.id, query);
  }

  @Post('mark-read')
  markRead(@CurrentUser() user: any, @Body(new ZodValidationPipe(idSchema)) dto: IdDto) {
    return this.notifications.markRead(user.id, dto.id);
  }

  @Post('mark-all-read')
  markAllRead(@CurrentUser() user: any) {
    return this.notifications.markAllRead(user.id);
  }

  @Post('delete')
  delete(@CurrentUser() user: any, @Body(new ZodValidationPipe(idSchema)) dto: IdDto) {
    return this.notifications.delete(user.id, dto.id);
  }
}
