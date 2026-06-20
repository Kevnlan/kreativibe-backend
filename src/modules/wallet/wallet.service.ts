import { Injectable } from '@nestjs/common';
import { Prisma, TransactionType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ListTransactionsDto, TopupDto, ExportTransactionsDto } from './dto/wallet.dto';

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService) {}

  // Wallet is created lazily on first access so every user has one on demand.
  private async getOrCreateWallet(userId: string) {
    const existing = await this.prisma.wallet.findUnique({ where: { userId } });
    if (existing) return existing;
    return this.prisma.wallet.create({ data: { userId } });
  }

  private ledgerWhere(walletId: string, query: Partial<ListTransactionsDto>): Prisma.LedgerEntryWhereInput {
    return {
      walletId,
      ...(query.type ? { type: query.type } : {}),
      ...(query.direction ? { direction: query.direction } : {}),
      ...(query.startDate || query.endDate
        ? {
            createdAt: {
              ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
              ...(query.endDate ? { lte: new Date(query.endDate) } : {}),
            },
          }
        : {}),
    };
  }

  async balance(userId: string) {
    const wallet = await this.getOrCreateWallet(userId);
    const recentTransactions = await this.prisma.ledgerEntry.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    return { wallet, recentTransactions };
  }

  async transactions(userId: string, query: ListTransactionsDto) {
    const wallet = await this.getOrCreateWallet(userId);
    const where = this.ledgerWhere(wallet.id, query);

    const [transactions, total] = await Promise.all([
      this.prisma.ledgerEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.ledgerEntry.count({ where }),
    ]);

    return { transactions, total, page: query.page, limit: query.limit };
  }

  // Topup records a Payment and, atomically, an append-only credit ledger entry.
  async topup(userId: string, dto: TopupDto) {
    const wallet = await this.getOrCreateWallet(userId);
    const amount = new Prisma.Decimal(dto.amount);

    const payment = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          walletId: wallet.id,
          amount,
          currency: wallet.currency,
          method: dto.paymentMethod,
          status: 'PENDING',
          externalRef: dto.reference,
        },
      });

      const balanceAfter = wallet.balance.add(amount);
      await tx.ledgerEntry.create({
        data: {
          walletId: wallet.id,
          type: TransactionType.TOPUP,
          amount,
          direction: 'CREDIT',
          balanceAfter,
          currency: wallet.currency,
          description: `Wallet top-up via ${dto.paymentMethod}`,
          referenceId: payment.id,
          referenceType: 'Payment',
        },
      });
      await tx.wallet.update({ where: { id: wallet.id }, data: { balance: balanceAfter } });
      return payment;
    });

    return {
      transactionId: payment.id,
      amount: dto.amount,
      status: payment.status,
      paymentUrl: null,
    };
  }

  async export(userId: string, query: ExportTransactionsDto) {
    const wallet = await this.getOrCreateWallet(userId);
    const where = this.ledgerWhere(wallet.id, query);
    const rows = await this.prisma.ledgerEntry.findMany({ where, orderBy: { createdAt: 'desc' } });

    if (query.format === 'CSV') {
      const header = 'id,type,direction,amount,currency,balanceAfter,description,createdAt';
      const lines = rows.map((r) =>
        [r.id, r.type, r.direction, r.amount, r.currency, r.balanceAfter, `"${r.description.replace(/"/g, '""')}"`, r.createdAt.toISOString()].join(','),
      );
      return { format: 'CSV', filename: `transactions-${Date.now()}.csv`, content: [header, ...lines].join('\n') };
    }
    // PDF generation is stubbed until a renderer is wired; return the raw rows.
    return { format: 'PDF', filename: `transactions-${Date.now()}.pdf`, rows };
  }
}
