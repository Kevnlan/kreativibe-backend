import { Controller, Post, Param, Body, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ContractService } from './contract.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { generateContractSchema, GenerateContractDto, updateContractSchema, UpdateContractDto, signContractSchema, SignContractDto } from './dto/contract.dto';

@Controller('campaigns/:campaignId/contract')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ContractController {
  constructor(private contracts: ContractService) {}

  @Post('generate')
  @Roles(Role.BRAND)
  generate(@CurrentUser() user: any, @Param('campaignId') campaignId: string, @Body(new ZodValidationPipe(generateContractSchema)) dto: GenerateContractDto) {
    return this.contracts.generate(user.id, campaignId, dto);
  }

  @Post('get')
  @Roles(Role.BRAND, Role.CREATOR)
  get(@CurrentUser() user: any, @Param('campaignId') campaignId: string) {
    return this.contracts.get(user.id, user.role, campaignId);
  }

  @Post('update')
  @Roles(Role.BRAND)
  update(@CurrentUser() user: any, @Param('campaignId') campaignId: string, @Body(new ZodValidationPipe(updateContractSchema)) dto: UpdateContractDto) {
    return this.contracts.update(user.id, campaignId, dto);
  }

  @Post('sign')
  @Roles(Role.BRAND, Role.CREATOR)
  sign(@CurrentUser() user: any, @Param('campaignId') campaignId: string, @Body(new ZodValidationPipe(signContractSchema)) dto: SignContractDto) {
    return this.contracts.sign(user.id, user.role, campaignId, dto);
  }

  @Post('download')
  @Roles(Role.BRAND, Role.CREATOR)
  download(@CurrentUser() user: any, @Param('campaignId') campaignId: string) {
    return this.contracts.download(user.id, user.role, campaignId);
  }
}
