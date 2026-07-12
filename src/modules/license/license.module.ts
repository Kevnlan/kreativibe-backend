import { Module } from '@nestjs/common';
import { LicenseController, AdminLicenseController } from './license.controller';
import { LicenseService } from './license.service';

@Module({
  controllers: [LicenseController, AdminLicenseController],
  providers: [LicenseService],
})
export class LicenseModule {}
