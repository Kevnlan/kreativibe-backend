import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ReputationService } from './reputation.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { listPointsSchema, ListPointsDto } from './dto/points-list.dto';

@Controller('reputation')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CREATOR)
export class ReputationController {
  constructor(private reputation: ReputationService) {}

  @Post('summary')
  summary(@CurrentUser() user: any) {
    return this.reputation.summary(user.id);
  }

  @Post('points/list')
  listPoints(@CurrentUser() user: any, @Body(new ZodValidationPipe(listPointsSchema)) dto: ListPointsDto) {
    return this.reputation.listPoints(user.id, dto);
  }

  @Post('achievements/list')
  listAchievements(@CurrentUser() user: any) {
    return this.reputation.listAchievements(user.id);
  }
}
