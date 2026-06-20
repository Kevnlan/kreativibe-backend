import { Controller, Get, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CampaignApplicationService } from './campaign-application.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { updateApplicationSchema, UpdateApplicationDto } from './dto/application.dto';

@Controller('campaigns/applications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.BRAND, Role.CREATOR)
export class CampaignApplicationController {
  constructor(private applications: CampaignApplicationService) {}

  @Get(':id')
  get(@CurrentUser() user: any, @Param('id') id: string) {
    return this.applications.get(user.id, user.role, id);
  }

  @Patch(':id')
  @Roles(Role.BRAND)
  updateStatus(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateApplicationSchema)) dto: UpdateApplicationDto,
  ) {
    return this.applications.updateStatus(user.id, id, dto);
  }

  @Delete(':id')
  @Roles(Role.CREATOR)
  withdraw(@CurrentUser() user: any, @Param('id') id: string) {
    return this.applications.withdraw(user.id, id);
  }
}

@Controller('creators/me')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CREATOR)
export class CreatorApplicationsController {
  constructor(private applications: CampaignApplicationService) {}

  @Get('applications')
  myApplications(@CurrentUser() user: any) {
    return this.applications.listForCreator(user.id);
  }
}
