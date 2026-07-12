import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TicketStatus, TicketPriority, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { NotificationService } from '../notification/notification.service';
import {
  CreateTicketDto,
  ListTicketsDto,
  SendMessageDto,
  UpdateTicketDto,
  RateTicketDto,
} from './dto/support.dto';

const SLA_HOURS_BY_PRIORITY: Record<TicketPriority, number> = {
  LOW: 72,
  MEDIUM: 48,
  HIGH: 24,
  URGENT: 4,
};

@Injectable()
export class SupportService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationService,
  ) {}

  // ── User endpoints ────────────────────────────────────────────────────────

  async create(userId: string, dto: CreateTicketDto) {
    const slaDeadline = new Date(Date.now() + SLA_HOURS_BY_PRIORITY[dto.priority as TicketPriority] * 60 * 60 * 1000);

    const ticket = await this.prisma.supportTicket.create({
      data: {
        subject: dto.subject,
        description: dto.description,
        category: dto.category,
        priority: dto.priority,
        status: TicketStatus.OPEN,
        requesterId: userId,
        slaDeadline,
      },
    });

    return ticket;
  }

  async listMine(userId: string, query: ListTicketsDto) {
    const where: Prisma.SupportTicketWhereInput = {
      requesterId: userId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: { _count: { select: { messages: true } } },
      }),
      this.prisma.supportTicket.count({ where }),
    ]);

    return { items, total, page: query.page, limit: query.limit };
  }

  async getMine(userId: string, ticketId: string) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id: ticketId, requesterId: userId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        assignedAgent: { select: { id: true, name: true } },
      },
    });
    if (!ticket) throw new NotFoundException({ message: 'Ticket not found', code: 'TICKET_NOT_FOUND' });
    return ticket;
  }

  async sendMessage(userId: string, dto: SendMessageDto) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id: dto.ticketId, requesterId: userId },
    });
    if (!ticket) throw new NotFoundException({ message: 'Ticket not found', code: 'TICKET_NOT_FOUND' });
    if (ticket.status === 'CLOSED') {
      throw new BadRequestException({ message: 'Ticket is closed', code: 'TICKET_CLOSED' });
    }

    const message = await this.prisma.ticketMessage.create({
      data: {
        ticketId: dto.ticketId,
        senderId: userId,
        body: dto.body,
        attachments: dto.attachments,
        isInternal: false,
      },
    });

    // If ticket was waiting on customer, move back to in_progress
    if (ticket.status === 'WAITING_ON_CUSTOMER') {
      await this.prisma.supportTicket.update({
        where: { id: dto.ticketId },
        data: { status: TicketStatus.IN_PROGRESS },
      });
    }

    // Notify assigned agent
    if (ticket.assignedAgentId) {
      await this.notifications.create(
        ticket.assignedAgentId,
        'SUPPORT_UPDATE',
        'New message on ticket',
        `${ticket.subject}: New message from customer`,
        { ticketId: ticket.id },
      );
    }

    return message;
  }

  async rate(userId: string, dto: RateTicketDto) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id: dto.ticketId, requesterId: userId },
    });
    if (!ticket) throw new NotFoundException({ message: 'Ticket not found', code: 'TICKET_NOT_FOUND' });
    if (ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED') {
      throw new BadRequestException({ message: 'Can only rate resolved or closed tickets', code: 'TICKET_NOT_RESOLVED' });
    }

    return this.prisma.supportTicket.update({
      where: { id: dto.ticketId },
      data: { rating: dto.rating, ratingComment: dto.ratingComment },
    });
  }

  // ── Agent/Admin endpoints ─────────────────────────────────────────────────

  async listAll(query: ListTicketsDto) {
    const where: Prisma.SupportTicketWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          requester: { select: { id: true, name: true, email: true, role: true } },
          assignedAgent: { select: { id: true, name: true } },
          _count: { select: { messages: true } },
        },
      }),
      this.prisma.supportTicket.count({ where }),
    ]);

    return { items, total, page: query.page, limit: query.limit };
  }

  async get(ticketId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        requester: { select: { id: true, name: true, email: true, role: true } },
        assignedAgent: { select: { id: true, name: true } },
      },
    });
    if (!ticket) throw new NotFoundException({ message: 'Ticket not found', code: 'TICKET_NOT_FOUND' });
    return ticket;
  }

  async assign(agentId: string, ticketId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException({ message: 'Ticket not found', code: 'TICKET_NOT_FOUND' });

    const updated = await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        assignedAgentId: agentId,
        status: ticket.status === 'OPEN' ? TicketStatus.IN_PROGRESS : ticket.status,
      },
    });

    await this.notifications.create(
      ticket.requesterId,
      'SUPPORT_UPDATE',
      'Support agent assigned',
      `Your ticket "${ticket.subject}" has been assigned to an agent.`,
      { ticketId: ticket.id },
    );

    return updated;
  }

  async update(agentId: string, dto: UpdateTicketDto) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: dto.ticketId } });
    if (!ticket) throw new NotFoundException({ message: 'Ticket not found', code: 'TICKET_NOT_FOUND' });

    const data: Prisma.SupportTicketUpdateInput = {};
    if (dto.status) {
      data.status = dto.status;
      if (dto.status === 'RESOLVED') data.resolvedAt = new Date();
      if (dto.status === 'CLOSED') data.closedAt = new Date();
    }
    if (dto.priority) data.priority = dto.priority;
    if (dto.category) data.category = dto.category;

    const updated = await this.prisma.supportTicket.update({
      where: { id: dto.ticketId },
      data,
    });

    if (dto.status && (dto.status === 'RESOLVED' || dto.status === 'CLOSED')) {
      await this.notifications.create(
        ticket.requesterId,
        'SUPPORT_UPDATE',
        `Ticket ${dto.status.toLowerCase()}`,
        `Your ticket "${ticket.subject}" has been ${dto.status.toLowerCase()}.`,
        { ticketId: ticket.id },
      );
    }

    return updated;
  }

  async agentMessage(agentId: string, dto: SendMessageDto) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: dto.ticketId } });
    if (!ticket) throw new NotFoundException({ message: 'Ticket not found', code: 'TICKET_NOT_FOUND' });

    const message = await this.prisma.ticketMessage.create({
      data: {
        ticketId: dto.ticketId,
        senderId: agentId,
        body: dto.body,
        attachments: dto.attachments,
        isInternal: dto.isInternal,
      },
    });

    if (!dto.isInternal) {
      // Set to waiting on customer after agent replies publicly
      await this.prisma.supportTicket.update({
        where: { id: dto.ticketId },
        data: { status: TicketStatus.WAITING_ON_CUSTOMER },
      });

      await this.notifications.create(
        ticket.requesterId,
        'SUPPORT_UPDATE',
        'New reply on your ticket',
        `${ticket.subject}: ${dto.body.slice(0, 100)}`,
        { ticketId: ticket.id },
      );
    }

    return message;
  }

  // ── Analytics ──────────────────────────────────────────────────────────────

  async stats() {
    const [byStatus, byPriority, total, resolved, avgRating] = await Promise.all([
      this.prisma.supportTicket.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.supportTicket.groupBy({ by: ['priority'], _count: { _all: true } }),
      this.prisma.supportTicket.count(),
      this.prisma.supportTicket.count({ where: { status: { in: ['RESOLVED', 'CLOSED'] } } }),
      this.prisma.supportTicket.aggregate({ where: { rating: { not: null } }, _avg: { rating: true } }),
    ]);

    return {
      total,
      resolved,
      resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 0,
      averageRating: avgRating._avg.rating ?? 0,
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count._all })),
      byPriority: byPriority.map((p) => ({ priority: p.priority, count: p._count._all })),
    };
  }
}
