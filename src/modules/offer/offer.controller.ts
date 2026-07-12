import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { OfferService } from './offer.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  createOfferSchema, CreateOfferDto,
  counterOfferSchema, CounterOfferDto,
  offerActionSchema, OfferActionDto,
  listOffersSchema, ListOffersDto,
  browseMarketplaceSchema, BrowseMarketplaceDto,
} from './dto/offer.dto';
import { idSchema, IdDto } from '../../common/dto/id.dto';

@Controller('offers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OfferController {
  constructor(private offers: OfferService) {}

  @Post('create')
  @Roles(Role.BRAND)
  create(@CurrentUser() user: any, @Body(new ZodValidationPipe(createOfferSchema)) dto: CreateOfferDto) {
    return this.offers.create(user.id, dto);
  }

  @Post('list')
  @Roles(Role.BRAND)
  list(@CurrentUser() user: any, @Body(new ZodValidationPipe(listOffersSchema)) query: ListOffersDto) {
    return this.offers.listForBrand(user.id, query);
  }

  @Post('received')
  @Roles(Role.CREATOR)
  received(@CurrentUser() user: any, @Body(new ZodValidationPipe(listOffersSchema)) query: ListOffersDto) {
    return this.offers.listForCreator(user.id, query);
  }

  @Post('get')
  @Roles(Role.BRAND, Role.CREATOR, Role.ADMIN)
  get(@CurrentUser() user: any, @Body(new ZodValidationPipe(idSchema)) dto: IdDto) {
    return this.offers.get(user.id, user.role, dto.id);
  }

  @Post('history')
  @Roles(Role.BRAND, Role.CREATOR, Role.ADMIN)
  history(@CurrentUser() user: any, @Body(new ZodValidationPipe(idSchema)) dto: IdDto) {
    return this.offers.getHistory(user.id, user.role, dto.id);
  }

  @Post('counter')
  @Roles(Role.BRAND, Role.CREATOR)
  counter(@CurrentUser() user: any, @Body(new ZodValidationPipe(counterOfferSchema)) dto: CounterOfferDto) {
    return this.offers.counter(user.id, user.role, dto);
  }

  @Post('accept')
  @Roles(Role.BRAND, Role.CREATOR)
  accept(@CurrentUser() user: any, @Body(new ZodValidationPipe(offerActionSchema)) dto: OfferActionDto) {
    return this.offers.accept(user.id, user.role, dto.id, dto.message);
  }

  @Post('reject')
  @Roles(Role.BRAND, Role.CREATOR)
  reject(@CurrentUser() user: any, @Body(new ZodValidationPipe(offerActionSchema)) dto: OfferActionDto) {
    return this.offers.reject(user.id, user.role, dto.id, dto.message);
  }

  @Post('withdraw')
  @Roles(Role.BRAND, Role.CREATOR)
  withdraw(@CurrentUser() user: any, @Body(new ZodValidationPipe(offerActionSchema)) dto: OfferActionDto) {
    return this.offers.withdraw(user.id, user.role, dto.id, dto.message);
  }
}

@Controller('marketplace')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.BRAND)
export class MarketplaceController {
  constructor(private offers: OfferService) {}

  @Post('browse')
  browse(@Body(new ZodValidationPipe(browseMarketplaceSchema)) dto: BrowseMarketplaceDto) {
    return this.offers.browse(dto);
  }

  @Post('get')
  get(@Body(new ZodValidationPipe(idSchema)) dto: IdDto) {
    return this.offers.getPublicContent(dto.id);
  }
}
