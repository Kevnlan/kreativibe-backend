import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { MessagingService } from './messaging.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  startConversationSchema, StartConversationDto,
  sendMessageSchema, SendMessageDto,
  listConversationsSchema, ListConversationsDto,
  listMessagesSchema, ListMessagesDto,
  markReadSchema, MarkReadDto,
} from './dto/messaging.dto';

@Controller('messaging')
@UseGuards(JwtAuthGuard)
export class MessagingController {
  constructor(private messaging: MessagingService) {}

  @Post('conversations/start')
  start(@CurrentUser() user: any, @Body(new ZodValidationPipe(startConversationSchema)) dto: StartConversationDto) {
    return this.messaging.startConversation(user.id, dto);
  }

  @Post('conversations/list')
  list(@CurrentUser() user: any, @Body(new ZodValidationPipe(listConversationsSchema)) dto: ListConversationsDto) {
    return this.messaging.listConversations(user.id, dto);
  }

  @Post('messages/list')
  messages(@CurrentUser() user: any, @Body(new ZodValidationPipe(listMessagesSchema)) dto: ListMessagesDto) {
    return this.messaging.listMessages(user.id, dto);
  }

  @Post('messages/send')
  send(@CurrentUser() user: any, @Body(new ZodValidationPipe(sendMessageSchema)) dto: SendMessageDto) {
    return this.messaging.sendMessage(user.id, dto);
  }

  @Post('conversations/mark-read')
  markRead(@CurrentUser() user: any, @Body(new ZodValidationPipe(markReadSchema)) dto: MarkReadDto) {
    return this.messaging.markRead(user.id, dto.conversationId);
  }

  @Post('unread-count')
  unreadCount(@CurrentUser() user: any) {
    return this.messaging.getUnreadCount(user.id);
  }
}
