import { Controller, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('creator/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CREATOR)
export class DashboardController {
  constructor(private dashboard: DashboardService) {}

  @Post('summary')
  summary(@CurrentUser() user: any) {
    return this.dashboard.summary(user.id);
  }
}
