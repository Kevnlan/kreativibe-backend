import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  listTransactionsSchema, ListTransactionsDto,
  topupSchema, TopupDto,
  exportTransactionsSchema, ExportTransactionsDto,
} from './dto/wallet.dto';

@Controller('wallet')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WalletController {
  constructor(private wallet: WalletService) {}

  @Post('balance')
  @Roles(Role.CREATOR, Role.BRAND)
  balance(@CurrentUser() user: any) {
    return this.wallet.balance(user.id);
  }

  @Post('transactions')
  @Roles(Role.CREATOR, Role.BRAND)
  transactions(
    @CurrentUser() user: any,
    @Body(new ZodValidationPipe(listTransactionsSchema)) query: ListTransactionsDto,
  ) {
    return this.wallet.transactions(user.id, query);
  }

  @Post('topup')
  @Roles(Role.BRAND)
  topup(@CurrentUser() user: any, @Body(new ZodValidationPipe(topupSchema)) dto: TopupDto) {
    return this.wallet.topup(user.id, dto);
  }

  @Post('transactions/export')
  @Roles(Role.CREATOR, Role.BRAND)
  export(
    @CurrentUser() user: any,
    @Body(new ZodValidationPipe(exportTransactionsSchema)) query: ExportTransactionsDto,
  ) {
    return this.wallet.export(user.id, query);
  }
}
