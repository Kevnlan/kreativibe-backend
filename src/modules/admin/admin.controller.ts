import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  listUsersSchema, ListUsersDto,
  userActionSchema, UserActionDto,
  verifyUserSchema, VerifyUserDto,
  listAuditLogsSchema, ListAuditLogsDto,
  contentActionSchema, ContentActionDto,
  featureContentSchema, FeatureContentDto,
  updateCommissionSchema, UpdateCommissionDto,
} from './dto/admin.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private admin: AdminService) {}

  @Post('stats')
  stats() {
    return this.admin.platformStats();
  }

  @Post('users/list')
  listUsers(@Body(new ZodValidationPipe(listUsersSchema)) query: ListUsersDto) {
    return this.admin.listUsers(query);
  }

  @Post('users/ban')
  ban(@CurrentUser() user: any, @Body(new ZodValidationPipe(userActionSchema)) dto: UserActionDto) {
    return this.admin.banUser(user.id, dto);
  }

  @Post('users/suspend')
  suspend(@CurrentUser() user: any, @Body(new ZodValidationPipe(userActionSchema)) dto: UserActionDto) {
    return this.admin.suspendUser(user.id, dto);
  }

  @Post('users/reinstate')
  reinstate(@CurrentUser() user: any, @Body(new ZodValidationPipe(userActionSchema)) dto: UserActionDto) {
    return this.admin.reinstateUser(user.id, dto);
  }

  @Post('users/verify')
  verify(@CurrentUser() user: any, @Body(new ZodValidationPipe(verifyUserSchema)) dto: VerifyUserDto) {
    return this.admin.verifyUser(user.id, dto);
  }

  @Post('content/remove')
  removeContent(@CurrentUser() user: any, @Body(new ZodValidationPipe(contentActionSchema)) dto: ContentActionDto) {
    return this.admin.removeContent(user.id, dto);
  }

  @Post('content/feature')
  featureContent(@CurrentUser() user: any, @Body(new ZodValidationPipe(featureContentSchema)) dto: FeatureContentDto) {
    return this.admin.featureContent(user.id, dto);
  }

  @Post('commission/update')
  updateCommission(@CurrentUser() user: any, @Body(new ZodValidationPipe(updateCommissionSchema)) dto: UpdateCommissionDto) {
    return this.admin.updateCommission(user.id, dto);
  }

  @Post('audit-logs/list')
  listAuditLogs(@Body(new ZodValidationPipe(listAuditLogsSchema)) query: ListAuditLogsDto) {
    return this.admin.listAuditLogs(query);
  }
}
