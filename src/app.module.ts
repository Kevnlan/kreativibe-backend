import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { CreatorModule } from './modules/creator/creator.module';
import { BrandModule } from './modules/brand/brand.module';
import { CampaignModule } from './modules/campaign/campaign.module';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }]),
    DatabaseModule,
    AuthModule,
    CreatorModule,
    BrandModule,
    CampaignModule,
  ],
})
export class AppModule {}
