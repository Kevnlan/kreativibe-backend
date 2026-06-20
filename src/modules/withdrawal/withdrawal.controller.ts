import { Controller, Post, Param, Body, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { WithdrawalService } from './withdrawal.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  listWithdrawalsSchema, ListWithdrawalsDto,
  createWithdrawalSchema, CreateWithdrawalDto,
  approveWithdrawalSchema, ApproveWithdrawalDto,
  rejectWithdrawalSchema, RejectWithdrawalDto,
} from './dto/withdrawal.dto';

@Controller('withdrawals')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WithdrawalController {
  constructor(private withdrawals: WithdrawalService) {}

  @Post('list')
  @Roles(Role.CREATOR)
  list(
    @CurrentUser() user: any,
    @Body(new ZodValidationPipe(listWithdrawalsSchema)) query: ListWithdrawalsDto,
  ) {
    return this.withdrawals.list(user.id, query);
  }

  @Post(':id/get')
  @Roles(Role.CREATOR, Role.ADMIN)
  get(@CurrentUser() user: any, @Param('id') id: string) {
    return this.withdrawals.get(user.id, user.role, id);
  }

  @Post('create')
  @Roles(Role.CREATOR)
  create(
    @CurrentUser() user: any,
    @Body(new ZodValidationPipe(createWithdrawalSchema)) dto: CreateWithdrawalDto,
  ) {
    return this.withdrawals.create(user.id, dto);
  }

  @Post(':id/cancel')
  @Roles(Role.CREATOR)
  async cancel(@CurrentUser() user: any, @Param('id') id: string) {
    await this.withdrawals.cancel(user.id, id);
    return { message: 'Withdrawal cancelled' };
  }
}

@Controller('admin/withdrawals')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminWithdrawalController {
  constructor(private withdrawals: WithdrawalService) {}

  @Post(':id/approve')
  approve(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(approveWithdrawalSchema)) dto: ApproveWithdrawalDto,
  ) {
    return this.withdrawals.approve(user.id, id, dto);
  }

  @Post(':id/reject')
  reject(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(rejectWithdrawalSchema)) dto: RejectWithdrawalDto,
  ) {
    return this.withdrawals.reject(user.id, id, dto);
  }

  @Post(':id/process')
  process(@Param('id') id: string) {
    return this.withdrawals.process(id);
  }
}
