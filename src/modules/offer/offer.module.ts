import { Module } from '@nestjs/common';
import { OfferController, MarketplaceController } from './offer.controller';
import { OfferService } from './offer.service';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [NotificationModule],
  controllers: [OfferController, MarketplaceController],
  providers: [OfferService],
})
export class OfferModule {}
