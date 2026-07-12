import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { SupportService } from './support.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  createTicketSchema, CreateTicketDto,
  listTicketsSchema, ListTicketsDto,
  sendMessageSchema, SendMessageDto,
  updateTicketSchema, UpdateTicketDto,
  rateTicketSchema, RateTicketDto,
} from './dto/support.dto';
import { idSchema, IdDto } from '../../common/dto/id.dto';

@Controller('support')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SupportController {
  constructor(private support: SupportService) {}

  @Post('tickets/create')
  create(@CurrentUser() user: any, @Body(new ZodValidationPipe(createTicketSchema)) dto: CreateTicketDto) {
    return this.support.create(user.id, dto);
  }

  @Post('tickets/list')
  list(@CurrentUser() user: any, @Body(new ZodValidationPipe(listTicketsSchema)) query: ListTicketsDto) {
    return this.support.listMine(user.id, query);
  }

  @Post('tickets/get')
  get(@CurrentUser() user: any, @Body(new ZodValidationPipe(idSchema)) dto: IdDto) {
    return this.support.getMine(user.id, dto.id);
  }

  @Post('tickets/message')
  message(@CurrentUser() user: any, @Body(new ZodValidationPipe(sendMessageSchema)) dto: SendMessageDto) {
    return this.support.sendMessage(user.id, dto);
  }

  @Post('tickets/rate')
  rate(@CurrentUser() user: any, @Body(new ZodValidationPipe(rateTicketSchema)) dto: RateTicketDto) {
    return this.support.rate(user.id, dto);
  }
}

@Controller('admin/support')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPPORT_AGENT)
export class AdminSupportController {
  constructor(private support: SupportService) {}

  @Post('tickets/list')
  list(@Body(new ZodValidationPipe(listTicketsSchema)) query: ListTicketsDto) {
    return this.support.listAll(query);
  }

  @Post('tickets/get')
  get(@Body(new ZodValidationPipe(idSchema)) dto: IdDto) {
    return this.support.get(dto.id);
  }

  @Post('tickets/assign')
  assign(@CurrentUser() user: any, @Body(new ZodValidationPipe(idSchema)) dto: IdDto) {
    return this.support.assign(user.id, dto.id);
  }

  @Post('tickets/update')
  update(@CurrentUser() user: any, @Body(new ZodValidationPipe(updateTicketSchema)) dto: UpdateTicketDto) {
    return this.support.update(user.id, dto);
  }

  @Post('tickets/message')
  message(@CurrentUser() user: any, @Body(new ZodValidationPipe(sendMessageSchema)) dto: SendMessageDto) {
    return this.support.agentMessage(user.id, dto);
  }

  @Post('stats')
  stats() {
    return this.support.stats();
  }
}
