import { Injectable } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ListNotificationsDto } from './dto/notification.dto';

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  // Called by other services to create a notification
  async create(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    data?: Record<string, any>,
  ) {
    return this.prisma.notification.create({
      data: { userId, type, title, body, data: data as Prisma.InputJsonValue },
    });
  }

  async list(userId: string, query: ListNotificationsDto) {
    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(query.isRead !== undefined ? { isRead: query.isRead } : {}),
      ...(query.type ? { type: query.type } : {}),
    };

    const [items, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return { items, total, unreadCount, page: query.page, limit: query.limit };
  }

  async markRead(userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({ where: { id, userId } });
    if (!notification) return null;
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { marked: result.count };
  }

  async delete(userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({ where: { id, userId } });
    if (!notification) return null;
    await this.prisma.notification.delete({ where: { id } });
    return { success: true };
  }
}
