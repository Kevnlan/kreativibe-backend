import { Module } from '@nestjs/common';
import { WithdrawalController, AdminWithdrawalController } from './withdrawal.controller';
import { WithdrawalService } from './withdrawal.service';

@Module({
  controllers: [WithdrawalController, AdminWithdrawalController],
  providers: [WithdrawalService],
})
export class WithdrawalModule {}
