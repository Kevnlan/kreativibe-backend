import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { NotificationService } from '../notification/notification.service';
import {
  StartConversationDto,
  SendMessageDto,
  ListConversationsDto,
  ListMessagesDto,
} from './dto/messaging.dto';

@Injectable()
export class MessagingService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationService,
  ) {}

  async startConversation(userId: string, dto: StartConversationDto) {
    if (userId === dto.recipientId) {
      throw new BadRequestException({ message: 'Cannot message yourself', code: 'SELF_MESSAGE_FORBIDDEN' });
    }

    const recipient = await this.prisma.user.findUnique({ where: { id: dto.recipientId } });
    if (!recipient) throw new NotFoundException({ message: 'Recipient not found', code: 'RECIPIENT_NOT_FOUND' });

    // Check if conversation already exists
    const existing = await this.prisma.conversation.findFirst({
      where: {
        OR: [
          { initiatorId: userId, recipientId: dto.recipientId, campaignId: dto.campaignId ?? null },
          { initiatorId: dto.recipientId, recipientId: userId, campaignId: dto.campaignId ?? null },
        ],
      },
    });

    if (existing) {
      // Send message in existing conversation
      return this.sendMessage(userId, {
        conversationId: existing.id,
        body: dto.initialMessage,
      });
    }

    const conversation = await this.prisma.conversation.create({
      data: {
        initiatorId: userId,
        recipientId: dto.recipientId,
        campaignId: dto.campaignId,
        type: dto.campaignId ? 'CAMPAIGN' : 'DIRECT',
        lastMessageAt: new Date(),
        lastMessageText: dto.initialMessage.slice(0, 500),
        messages: {
          create: {
            senderId: userId,
            body: dto.initialMessage,
          },
        },
      },
      include: {
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    await this.notifications.create(
      dto.recipientId,
      'COMMUNITY_REPLY',
      'New message',
      dto.initialMessage.slice(0, 100),
      { conversationId: conversation.id },
    );

    return conversation;
  }

  async listConversations(userId: string, dto: ListConversationsDto) {
    const where: Prisma.ConversationWhereInput = {
      OR: [{ initiatorId: userId }, { recipientId: userId }],
    };

    const [items, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where,
        orderBy: { lastMessageAt: 'desc' },
        skip: (dto.page - 1) * dto.limit,
        take: dto.limit,
        include: {
          initiator: { select: { id: true, name: true, role: true, creatorProfile: { select: { avatar: true } }, brandProfile: { select: { logo: true, companyName: true } } } },
          recipient: { select: { id: true, name: true, role: true, creatorProfile: { select: { avatar: true } }, brandProfile: { select: { logo: true, companyName: true } } } },
        },
      }),
      this.prisma.conversation.count({ where }),
    ]);

    // Get unread counts for each conversation
    const conversationsWithUnread = await Promise.all(
      items.map(async (conv) => {
        const unreadCount = await this.prisma.message.count({
          where: {
            conversationId: conv.id,
            senderId: { not: userId },
            readAt: null,
          },
        });
        return { ...conv, unreadCount };
      }),
    );

    return { items: conversationsWithUnread, total, page: dto.page, limit: dto.limit };
  }

  async listMessages(userId: string, dto: ListMessagesDto) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: dto.conversationId },
    });
    if (!conversation) throw new NotFoundException({ message: 'Conversation not found', code: 'CONVERSATION_NOT_FOUND' });

    // Verify user is part of the conversation
    if (conversation.initiatorId !== userId && conversation.recipientId !== userId) {
      throw new ForbiddenException({ message: 'Not part of this conversation', code: 'NOT_PARTICIPANT' });
    }

    const where: Prisma.MessageWhereInput = { conversationId: dto.conversationId };

    const [items, total] = await Promise.all([
      this.prisma.message.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip: (dto.page - 1) * dto.limit,
        take: dto.limit,
        include: {
          sender: { select: { id: true, name: true, role: true } },
        },
      }),
      this.prisma.message.count({ where }),
    ]);

    return { items, total, page: dto.page, limit: dto.limit };
  }

  async sendMessage(userId: string, dto: SendMessageDto) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: dto.conversationId },
    });
    if (!conversation) throw new NotFoundException({ message: 'Conversation not found', code: 'CONVERSATION_NOT_FOUND' });

    if (conversation.initiatorId !== userId && conversation.recipientId !== userId) {
      throw new ForbiddenException({ message: 'Not part of this conversation', code: 'NOT_PARTICIPANT' });
    }

    const message = await this.prisma.message.create({
      data: {
        conversationId: dto.conversationId,
        senderId: userId,
        body: dto.body,
        attachments: dto.attachments ?? undefined,
      },
      include: {
        sender: { select: { id: true, name: true, role: true } },
      },
    });

    // Update conversation's last message
    await this.prisma.conversation.update({
      where: { id: dto.conversationId },
      data: {
        lastMessageAt: new Date(),
        lastMessageText: dto.body.slice(0, 500),
      },
    });

    // Notify the other participant
    const recipientId = conversation.initiatorId === userId ? conversation.recipientId : conversation.initiatorId;
    await this.notifications.create(
      recipientId,
      'COMMUNITY_REPLY',
      'New message',
      dto.body.slice(0, 100),
      { conversationId: dto.conversationId, messageId: message.id },
    );

    return message;
  }

  async markRead(userId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) throw new NotFoundException({ message: 'Conversation not found', code: 'CONVERSATION_NOT_FOUND' });

    if (conversation.initiatorId !== userId && conversation.recipientId !== userId) {
      throw new ForbiddenException({ message: 'Not part of this conversation', code: 'NOT_PARTICIPANT' });
    }

    await this.prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        readAt: null,
      },
      data: { readAt: new Date(), status: 'READ' },
    });

    return { success: true };
  }

  async getUnreadCount(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: { OR: [{ initiatorId: userId }, { recipientId: userId }] },
      select: { id: true },
    });

    const conversationIds = conversations.map((c) => c.id);

    const count = await this.prisma.message.count({
      where: {
        conversationId: { in: conversationIds },
        senderId: { not: userId },
        readAt: null,
      },
    });

    return { unreadCount: count };
  }
}
