import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { DiscoveryService } from './discovery.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { browseBrandsSchema, BrowseBrandsDto } from './dto/browse-brands.dto';
import { idSchema, IdDto } from '../../common/dto/id.dto';

@Controller('brands')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CREATOR)
export class DiscoveryController {
  constructor(private discovery: DiscoveryService) {}

  @Post('browse')
  browse(@Body(new ZodValidationPipe(browseBrandsSchema)) dto: BrowseBrandsDto) {
    return this.discovery.browse(dto);
  }

  @Post('get')
  get(@Body(new ZodValidationPipe(idSchema)) dto: IdDto) {
    return this.discovery.getPublic(dto.id);
  }
}
