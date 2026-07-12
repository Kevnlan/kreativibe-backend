import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { CreatorModule } from './modules/creator/creator.module';
import { BrandModule } from './modules/brand/brand.module';
import { CampaignModule } from './modules/campaign/campaign.module';
import { CountryModule } from './modules/country/country.module';
import { KycModule } from './modules/kyc/kyc.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { WithdrawalModule } from './modules/withdrawal/withdrawal.module';
import { TaxModule } from './modules/tax/tax.module';
import { ContentModule } from './modules/content/content.module';
import { SocialModule } from './modules/social/social.module';
import { SchedulingModule } from './modules/scheduling/scheduling.module';
import { DiscoveryModule } from './modules/discovery/discovery.module';
import { CreatorCampaignModule } from './modules/creator-campaign/creator-campaign.module';
import { ContractModule } from './modules/contract/contract.module';
import { PortfolioModule } from './modules/portfolio/portfolio.module';
import { PostsModule } from './modules/posts/posts.module';
import { ReputationModule } from './modules/reputation/reputation.module';
import { EducationModule } from './modules/education/education.module';
import { EarningsModule } from './modules/earnings/earnings.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { OfferModule } from './modules/offer/offer.module';
import { ModerationModule } from './modules/moderation/moderation.module';
import { LicenseModule } from './modules/license/license.module';
import { NotificationModule } from './modules/notification/notification.module';
import { SupportModule } from './modules/support/support.module';
import { CommunityModule } from './modules/community/community.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AdminModule } from './modules/admin/admin.module';
import { ReviewModule } from './modules/review/review.module';
import { SearchModule } from './modules/search/search.module';
import { SettingsModule } from './modules/settings/settings.module';
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
    CountryModule,
    KycModule,
    WalletModule,
    WithdrawalModule,
    TaxModule,
    ContentModule,
    SocialModule,
    SchedulingModule,
    DiscoveryModule,
    CreatorCampaignModule,
    ContractModule,
    PortfolioModule,
    PostsModule,
    ReputationModule,
    EducationModule,
    EarningsModule,
    DashboardModule,
    OfferModule,
    ModerationModule,
    LicenseModule,
    NotificationModule,
    SupportModule,
    CommunityModule,
    AnalyticsModule,
    AdminModule,
    ReviewModule,
    SearchModule,
    SettingsModule,
  ],
})
export class AppModule {}
