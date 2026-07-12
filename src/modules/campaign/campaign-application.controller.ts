import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CampaignApplicationService } from './campaign-application.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { updateApplicationSchema, UpdateApplicationDto } from './dto/application.dto';
import { idSchema, IdDto } from '../../common/dto/id.dto';

@Controller('campaigns/applications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.BRAND, Role.CREATOR)
export class CampaignApplicationController {
  constructor(private applications: CampaignApplicationService) {}

  @Post('get')
  get(@CurrentUser() user: any, @Body(new ZodValidationPipe(idSchema)) dto: IdDto) {
    return this.applications.get(user.id, user.role, dto.id);
  }

  @Post('update')
  @Roles(Role.BRAND)
  updateStatus(@CurrentUser() user: any, @Body(new ZodValidationPipe(updateApplicationSchema)) dto: UpdateApplicationDto) {
    return this.applications.updateStatus(user.id, dto.id, dto);
  }

  @Post('withdraw')
  @Roles(Role.CREATOR)
  withdraw(@CurrentUser() user: any, @Body(new ZodValidationPipe(idSchema)) dto: IdDto) {
    return this.applications.withdraw(user.id, dto.id);
  }
}

@Controller('creators/me')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CREATOR)
export class CreatorApplicationsController {
  constructor(private applications: CampaignApplicationService) {}

  @Post('applications')
  myApplications(@CurrentUser() user: any) {
    return this.applications.listForCreator(user.id);
  }
}
