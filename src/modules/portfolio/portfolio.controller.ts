import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PortfolioService } from './portfolio.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { listPortfolioSchema, ListPortfolioDto, addPortfolioItemSchema, AddPortfolioItemDto } from './dto/portfolio.dto';
import { idSchema, IdDto } from '../../common/dto/id.dto';

@Controller('portfolio')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PortfolioController {
  constructor(private portfolio: PortfolioService) {}

  @Post('list')
  @Roles(Role.CREATOR, Role.BRAND)
  list(@CurrentUser() user: any, @Body(new ZodValidationPipe(listPortfolioSchema)) dto: ListPortfolioDto) {
    return this.portfolio.list(user.id, dto);
  }

  @Post('add')
  @Roles(Role.CREATOR)
  add(@CurrentUser() user: any, @Body(new ZodValidationPipe(addPortfolioItemSchema)) dto: AddPortfolioItemDto) {
    return this.portfolio.add(user.id, dto);
  }

  @Post('delete')
  @Roles(Role.CREATOR)
  remove(@CurrentUser() user: any, @Body(new ZodValidationPipe(idSchema)) dto: IdDto) {
    return this.portfolio.remove(user.id, dto.id);
  }
}
