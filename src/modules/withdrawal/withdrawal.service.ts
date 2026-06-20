import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Prisma, PayoutStatus, TransactionType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  ListWithdrawalsDto, CreateWithdrawalDto, ApproveWithdrawalDto, RejectWithdrawalDto,
} from './dto/withdrawal.dto';

// Flat fee for MPESA payouts; bank transfers are free at this tier.
const MPESA_FEE = 50;

@Injectable()
export class WithdrawalService {
  constructor(private prisma: PrismaService) {}

  private async wallet(userId: string) {
    const existing = await this.prisma.wallet.findUnique({ where: { userId } });
    if (existing) return existing;
    return this.prisma.wallet.create({ data: { userId } });
  }

  // Map the contract's MPESA|BANK to the schema's PaymentMethod enum.
  private toPaymentMethod(method: 'MPESA' | 'BANK') {
    return method === 'MPESA' ? 'MPESA' : 'BANK_TRANSFER';
  }

  // Contract exposes PENDING; internally a fresh request sits at PENDING_APPROVAL.
  private toPayoutStatus(status: NonNullable<ListWithdrawalsDto['status']>): PayoutStatus {
    return status === 'PENDING' ? PayoutStatus.PENDING_APPROVAL : (status as PayoutStatus);
  }

  private serialize(p: any) {
    const accountDetails =
      p.method === 'MPESA'
        ? { phoneNumber: p.mpesaPhone, accountName: p.bankAccountName }
        : {
            bankName: p.bankName,
            accountNumber: p.bankAccountNo,
            accountName: p.bankAccountName,
            branchCode: p.bankBranchCode,
            swiftCode: p.bankSwiftCode,
          };
    return {
      id: p.id,
      amount: p.amount,
      fee: p.fee,
      netAmount: p.netAmount,
      currency: p.currency,
      method: p.method === 'MPESA' ? 'MPESA' : 'BANK',
      // Surface the internal PENDING_APPROVAL state as PENDING per the contract.
      status: p.status === 'PENDING_APPROVAL' ? 'PENDING' : p.status,
      accountDetails,
      adminComments: p.adminComments,
      rejectionReason: p.rejectionReason,
      createdAt: p.createdAt,
      processedAt: p.processedAt,
      completedAt: p.completedAt,
    };
  }

  async list(userId: string, query: ListWithdrawalsDto) {
    const wallet = await this.wallet(userId);
    const where: Prisma.PayoutWhereInput = {
      walletId: wallet.id,
      ...(query.status ? { status: this.toPayoutStatus(query.status) } : {}),
      ...(query.method ? { method: this.toPaymentMethod(query.method) } : {}),
      ...(query.startDate || query.endDate
        ? {
            createdAt: {
              ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
              ...(query.endDate ? { lte: new Date(query.endDate) } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.payout.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.payout.count({ where }),
    ]);

    return { withdrawals: items.map((p) => this.serialize(p)), total, page: query.page, limit: query.limit };
  }

  async get(userId: string, role: string, id: string) {
    const payout = await this.prisma.payout.findUnique({ where: { id }, include: { wallet: true } });
    if (!payout) throw new NotFoundException({ message: 'Withdrawal not found', code: 'WITHDRAWAL_NOT_FOUND' });
    if (role !== 'ADMIN' && payout.wallet.userId !== userId) {
      throw new ForbiddenException({ message: 'Not your withdrawal', code: 'FORBIDDEN' });
    }
    return this.serialize(payout);
  }

  async create(userId: string, dto: CreateWithdrawalDto) {
    const wallet = await this.wallet(userId);
    const amount = new Prisma.Decimal(dto.amount);
    if (wallet.balance.lessThan(amount)) {
      throw new BadRequestException({ message: 'Insufficient balance', code: 'INSUFFICIENT_BALANCE' });
    }

    const fee = new Prisma.Decimal(dto.method === 'MPESA' ? MPESA_FEE : 0);
    const netAmount = amount.minus(fee);

    const dest =
      dto.method === 'MPESA'
        ? { mpesaPhone: dto.accountDetails.phoneNumber, bankAccountName: dto.accountDetails.accountName }
        : {
            bankName: dto.accountDetails.bankName,
            bankAccountNo: dto.accountDetails.accountNumber,
            bankAccountName: dto.accountDetails.accountName,
            bankBranchCode: dto.accountDetails.branchCode,
            bankSwiftCode: dto.accountDetails.swiftCode,
          };

    // Reserve funds immediately: debit wallet + append ledger entry, atomically.
    const payout = await this.prisma.$transaction(async (tx) => {
      const payout = await tx.payout.create({
        data: {
          walletId: wallet.id,
          amount,
          fee,
          netAmount,
          currency: wallet.currency,
          method: this.toPaymentMethod(dto.method),
          status: 'PENDING_APPROVAL',
          ...dest,
        },
      });

      const balanceAfter = wallet.balance.minus(amount);
      await tx.ledgerEntry.create({
        data: {
          walletId: wallet.id,
          type: TransactionType.PAYOUT,
          amount,
          direction: 'DEBIT',
          balanceAfter,
          currency: wallet.currency,
          description: `Withdrawal request via ${dto.method}`,
          referenceId: payout.id,
          referenceType: 'Payout',
        },
      });
      await tx.wallet.update({ where: { id: wallet.id }, data: { balance: balanceAfter } });
      return payout;
    });

    return this.serialize(payout);
  }

  async cancel(userId: string, id: string) {
    const wallet = await this.wallet(userId);
    const payout = await this.prisma.payout.findUnique({ where: { id } });
    if (!payout || payout.walletId !== wallet.id) {
      throw new NotFoundException({ message: 'Withdrawal not found', code: 'WITHDRAWAL_NOT_FOUND' });
    }
    if (!['REQUESTED', 'PENDING_APPROVAL'].includes(payout.status)) {
      throw new BadRequestException({ message: 'Only pending withdrawals can be cancelled', code: 'WITHDRAWAL_NOT_CANCELLABLE' });
    }

    // Refund the reserved amount back to the wallet.
    await this.prisma.$transaction(async (tx) => {
      const w = await tx.wallet.findUniqueOrThrow({ where: { id: wallet.id } });
      const balanceAfter = w.balance.add(payout.amount);
      await tx.ledgerEntry.create({
        data: {
          walletId: wallet.id,
          type: TransactionType.REFUND,
          amount: payout.amount,
          direction: 'CREDIT',
          balanceAfter,
          currency: payout.currency,
          description: 'Withdrawal cancelled — funds returned',
          referenceId: payout.id,
          referenceType: 'Payout',
        },
      });
      await tx.wallet.update({ where: { id: wallet.id }, data: { balance: balanceAfter } });
      await tx.payout.update({ where: { id }, data: { status: 'CANCELLED' } });
    });
  }

  // ── Admin ─────────────────────────────────────────────────────────────────
  private async adminFind(id: string) {
    const payout = await this.prisma.payout.findUnique({ where: { id } });
    if (!payout) throw new NotFoundException({ message: 'Withdrawal not found', code: 'WITHDRAWAL_NOT_FOUND' });
    return payout;
  }

  async approve(adminId: string, id: string, dto: ApproveWithdrawalDto) {
    await this.adminFind(id);
    const payout = await this.prisma.payout.update({
      where: { id },
      data: {
        status: PayoutStatus.APPROVED,
        approvedBy: adminId,
        approvedAt: new Date(),
        processedAt: new Date(),
        adminComments: dto.adminComments,
      },
    });
    return this.serialize(payout);
  }

  async reject(adminId: string, id: string, dto: RejectWithdrawalDto) {
    const existing = await this.adminFind(id);

    // Refund on rejection — the reserved funds go back to the creator.
    const payout = await this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUniqueOrThrow({ where: { id: existing.walletId } });
      const balanceAfter = wallet.balance.add(existing.amount);
      await tx.ledgerEntry.create({
        data: {
          walletId: wallet.id,
          type: TransactionType.REFUND,
          amount: existing.amount,
          direction: 'CREDIT',
          balanceAfter,
          currency: existing.currency,
          description: 'Withdrawal rejected — funds returned',
          referenceId: existing.id,
          referenceType: 'Payout',
        },
      });
      await tx.wallet.update({ where: { id: wallet.id }, data: { balance: balanceAfter } });
      return tx.payout.update({
        where: { id },
        data: {
          status: PayoutStatus.REJECTED,
          approvedBy: adminId,
          processedAt: new Date(),
          rejectionReason: dto.rejectionReason,
          adminComments: dto.adminComments,
        },
      });
    });
    return this.serialize(payout);
  }

  async process(id: string) {
    const existing = await this.adminFind(id);
    if (existing.status !== PayoutStatus.APPROVED) {
      throw new BadRequestException({ message: 'Only approved withdrawals can be processed', code: 'WITHDRAWAL_NOT_APPROVED' });
    }
    const payout = await this.prisma.payout.update({
      where: { id },
      data: { status: PayoutStatus.PROCESSING, processedAt: new Date() },
    });
    return this.serialize(payout);
  }
}
