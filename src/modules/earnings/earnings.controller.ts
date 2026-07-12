import { Controller, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { EarningsService } from './earnings.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('earnings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CREATOR)
export class EarningsController {
  constructor(private earnings: EarningsService) {}

  @Post('summary')
  summary(@CurrentUser() user: any) {
    return this.earnings.summary(user.id);
  }
}
